/*
 * =====================================================================================
 * PROJECT: HOME AUTOMATION
 * Designed and Developed by ADITI DHANDE , Dept. of Electrical Engineering, GCOEY
 * =====================================================================================
 * HARDWARE CONFIGURATION:
 * - Microcontroller: ESP8266 (NodeMCU / Wemos D1 Mini)
 * - Sensor: DHT11 connected to Pin D3 (GPIO 0)
 * - Actuator: LED connected to Pin D5 (GPIO 14)
 * - Display: 16x2 LCD with I2C Backpack
 *     - SCL -> Pin D1 (GPIO 5)
 *     - SDA -> Pin D2 (GPIO 4)
 *     - VCC -> 5V (VIN) / 3.3V
 *     - GND -> GND
 * 
 * WIFI CONFIGURATION:
 * - SSID: :COE YAVATMAL
 * - Password: shoaib845
 * 
 * REQUIRED ARDUINO LIBRARIES (Install via Arduino IDE Library Manager):
 * 1. ESP8266WiFi & ESP8266HTTPClient (Built into ESP8266 Board Package)
 * 2. DHT sensor library by Adafruit
 * 3. Adafruit Unified Sensor by Adafruit
 * 4. LiquidCrystal_I2C by Frank de Brabander (or Marco Schwartz)
 * 5. ArduinoJson by Benoit Blanchon (Version 6 or 7)
 * =====================================================================================
 */

#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClient.h>
#include <WiFiClientSecure.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <DHT.h>
#include <ArduinoJson.h>

// -------------------------------------------------------------------------------------
// 1. PIN DEFINITIONS
// -------------------------------------------------------------------------------------
#define DHTPIN       D3        // DHT11 Sensor Data Pin (GPIO 0)
#define DHTTYPE      DHT11     // DHT 11
#define LED_PIN      D5        // LED Control Pin (GPIO 14)

// -------------------------------------------------------------------------------------
// 2. NETWORK & SERVER CONFIGURATION
// -------------------------------------------------------------------------------------
const char* ssid     = ":COE YAVATMAL";
const char* password = "shoaib845";

// REPLACE WITH YOUR RENDER URL OR LOCAL PC IP:
// If testing locally on the same WiFi: e.g. "http://192.168.1.100:3000"
// If deployed on Render: e.g. "https://your-app-name.onrender.com"
const char* SERVER_BASE_URL = "http://192.168.1.100:3000";

// -------------------------------------------------------------------------------------
// 3. OBJECT INITIALIZATIONS
// -------------------------------------------------------------------------------------
// I2C LCD: Common addresses are 0x27 or 0x3F. (16 characters, 2 rows)
LiquidCrystal_I2C lcd(0x27, 16, 2);
DHT dht(DHTPIN, DHTTYPE);

// Tracking variables
unsigned long previousMillis = 0;
const unsigned long interval = 10000; // 10 seconds interval

String currentLcdRow1 = "";
String currentLcdRow2 = "";

// -------------------------------------------------------------------------------------
// SETUP
// -------------------------------------------------------------------------------------
void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println();
  Serial.println(F("=================================================="));
  Serial.println(F("   HOME AUTOMATION - ESP8266 CONTROLLER           "));
  Serial.println(F("   Designed & Developed by ADITI DHANDE          "));
  Serial.println(F("   Dept. of Electrical Engineering, GCOEY        "));
  Serial.println(F("=================================================="));

  // Initialize LED Pin
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW); // Start with LED OFF

  // Initialize I2C Pins for ESP8266 (SDA = D2, SCL = D1)
  Wire.begin(D2, D1);

  // Initialize LCD
  lcd.init();
  lcd.backlight();
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("HOME AUTOMATION");
  lcd.setCursor(0, 1);
  lcd.print("ADITI DHANDE");

  // Initialize DHT Sensor
  dht.begin();
  delay(1500);

  // Connect to WiFi
  connectToWiFi();
}

// -------------------------------------------------------------------------------------
// MAIN LOOP
// -------------------------------------------------------------------------------------
void loop() {
  // Ensure WiFi is connected
  if (WiFi.status() != WL_CONNECTED) {
    connectToWiFi();
  }

  unsigned long currentMillis = millis();

  // Run telemetry and device sync every 10 seconds
  if (currentMillis - previousMillis >= interval || previousMillis == 0) {
    previousMillis = currentMillis;
    syncWithServer();
  }
}

// -------------------------------------------------------------------------------------
// WIFI CONNECTION HELPER
// -------------------------------------------------------------------------------------
void connectToWiFi() {
  Serial.print(F("Connecting to WiFi: "));
  Serial.println(ssid);

  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Connecting WiFi:");
  lcd.setCursor(0, 1);
  lcd.print(ssid);

  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println();
    Serial.println(F("WiFi Connected successfully!"));
    Serial.print(F("IP Address: "));
    Serial.println(WiFi.localIP());

    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("WiFi Connected!");
    lcd.setCursor(0, 1);
    lcd.print(WiFi.localIP());
    delay(2000);
  } else {
    Serial.println();
    Serial.println(F("WiFi Connection Failed! Retrying in loop..."));
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("WiFi Failed!");
    lcd.setCursor(0, 1);
    lcd.print("Check Credentials");
    delay(2000);
  }
}

// -------------------------------------------------------------------------------------
// SYNC TELEMETRY & CONTROLS (POST /api/device/sync)
// -------------------------------------------------------------------------------------
void syncWithServer() {
  // 1. Read DHT11 Sensor Data
  float humidity = dht.readHumidity();
  float temperature = dht.readTemperature(); // Celsius

  if (isnan(humidity) || isnan(temperature)) {
    Serial.println(F("Failed to read from DHT11 sensor! Using fallback readings."));
    // Keep reasonable fallback if sensor disconnected
    temperature = 27.0;
    humidity = 60.0;
  }

  Serial.println(F("---------------------------------------------"));
  Serial.printf("DHT11 Readings -> Temp: %.1f °C | Humidity: %.1f %%\n", temperature, humidity);

  // 2. Prepare HTTP Request to Node.js Backend
  WiFiClient client;
  HTTPClient http;

  String syncEndpoint = String(SERVER_BASE_URL) + "/api/device/sync";

  // For HTTPS (e.g. on Render), handle secure client if URL starts with https
  if (syncEndpoint.startsWith("https://")) {
    WiFiClientSecure secureClient;
    secureClient.setInsecure(); // Bypass SSL cert verification on ESP8266
    executeHttpSync(secureClient, syncEndpoint, temperature, humidity);
  } else {
    executeHttpSync(client, syncEndpoint, temperature, humidity);
  }
}

template <typename TClient>
void executeHttpSync(TClient &client, const String &url, float temp, float hum) {
  HTTPClient http;

  if (http.begin(client, url)) {
    http.addHeader("Content-Type", "application/json");

    // Build JSON payload
    StaticJsonDocument<256> reqDoc;
    reqDoc["temperature"] = temp;
    reqDoc["humidity"] = hum;

    String requestBody;
    serializeJson(reqDoc, requestBody);

    Serial.print(F("Sending payload to: "));
    Serial.println(url);

    int httpCode = http.POST(requestBody);

    if (httpCode > 0) {
      Serial.printf("HTTP Response code: %d\n", httpCode);

      if (httpCode == HTTP_CODE_OK || httpCode == HTTP_CODE_CREATED) {
        String response = http.getString();
        Serial.print(F("Response: "));
        Serial.println(response);

        // Parse JSON response
        StaticJsonDocument<512> resDoc;
        DeserializationError error = deserializeJson(resDoc, response);

        if (!error) {
          // A. Process LED State
          const char* ledState = resDoc["led"] | "OFF";
          if (String(ledState) == "ON") {
            digitalWrite(LED_PIN, HIGH);
            Serial.println(F("[ACTUATOR] LED on Pin D5 turned ON"));
          } else {
            digitalWrite(LED_PIN, LOW);
            Serial.println(F("[ACTUATOR] LED on Pin D5 turned OFF"));
          }

          // B. Process LCD Rows
          const char* row1 = resDoc["lcd_row1"] | "";
          const char* row2 = resDoc["lcd_row2"] | "";

          updateLcdScreen(String(row1), String(row2));
        } else {
          Serial.print(F("JSON Deserialization failed: "));
          Serial.println(error.f_str());
        }
      }
    } else {
      Serial.printf("HTTP POST failed, error: %s\n", http.errorToString(httpCode).c_str());
    }

    http.end();
  } else {
    Serial.println(F("Unable to connect to server endpoint."));
  }
}

// -------------------------------------------------------------------------------------
// LCD SCREEN UPDATE HELPER
// -------------------------------------------------------------------------------------
void updateLcdScreen(String row1, String row2) {
  // Only redraw if text changed to eliminate screen flickering
  if (row1 != currentLcdRow1 || row2 != currentLcdRow2) {
    currentLcdRow1 = row1;
    currentLcdRow2 = row2;

    lcd.clear();
    
    // Row 1 (Truncate or pad to 16 characters)
    lcd.setCursor(0, 0);
    lcd.print(format16(row1));

    // Row 2 (Truncate or pad to 16 characters)
    lcd.setCursor(0, 1);
    lcd.print(format16(row2));

    Serial.println(F("[LCD DISPLAY UPDATED]"));
    Serial.println("Row 1: [" + row1 + "]");
    Serial.println("Row 2: [" + row2 + "]");
  }
}

// Ensure string is exactly 16 characters for 16x2 LCD
String format16(String input) {
  if (input.length() > 16) {
    return input.substring(0, 16);
  }
  while (input.length() < 16) {
    input += " ";
  }
  return input;
}
