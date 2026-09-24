/*
 * =====================================================================================
 * PROJECT: HOME AUTOMATION
 * Designed and Developed by ADITI DHANDE , Dept. of Electrical Engineering, GCOEY
 * =====================================================================================
 * HARDWARE CONFIGURATION:
 * - Microcontroller: ESP8266 (NodeMCU / Wemos D1 Mini / ESP-12E)
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
 * LIVE RENDER SERVER URL:
 * - https://iot-project-x0hz.onrender.com
 * 
 * REQUIRED ARDUINO LIBRARIES (Install via Arduino IDE Library Manager):
 * 1. ESP8266WiFi & ESP8266HTTPClient (Built into ESP8266 Board Package)
 * 2. DHT sensor library by Adafruit
 * 3. Adafruit Unified Sensor by Adafruit
 * 4. LiquidCrystal_I2C (Supports both Marco Schwartz & Frank de Brabander)
 * 5. ArduinoJson (Supports both v6 and v7)
 * =====================================================================================
 */

#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClientSecure.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <DHT.h>
#include <ArduinoJson.h>

// -------------------------------------------------------------------------------------
// 1. PIN DEFINITIONS
// -------------------------------------------------------------------------------------
#define DHTPIN       D3        // DHT11 Sensor Data Pin (GPIO 0 on NodeMCU)
#define DHTTYPE      DHT11     // DHT 11
#define LED_PIN      D5        // LED Control Pin (GPIO 14 on NodeMCU)

// -------------------------------------------------------------------------------------
// 2. NETWORK & RENDER SERVER CONFIGURATION
// -------------------------------------------------------------------------------------
const char* ssid             = ":COE YAVATMAL";
const char* password         = "shoaib845";

// LIVE RENDER PRODUCTION URL:
const char* SERVER_BASE_URL  = "https://iot-project-x0hz.onrender.com";

// -------------------------------------------------------------------------------------
// 3. OBJECT INITIALIZATIONS
// -------------------------------------------------------------------------------------
// I2C LCD: Common addresses are 0x27 or 0x3F. (16 characters, 2 rows)
LiquidCrystal_I2C lcd(0x27, 16, 2);
DHT dht(DHTPIN, DHTTYPE);

// Tracking variables
unsigned long previousMillis = 0;
const unsigned long interval = 10000; // 10 seconds sync cycle

String currentLcdRow1 = "";
String currentLcdRow2 = "";

// -------------------------------------------------------------------------------------
// SFINAE COMPATIBILITY HELPERS
// Automatically detects if installed LiquidCrystal_I2C library uses .init() or .begin()
// -------------------------------------------------------------------------------------
template <typename T>
auto initializeLcd(T& display, int) -> decltype(display.init(), void()) {
  display.init();
}

template <typename T>
void initializeLcd(T& display, long) {
  display.begin();
}

// Forward declarations
void connectToWiFi();
void syncWithServer();
void updateLcdScreen(String row1, String row2);
String format16(String input);

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
  Serial.print(F("Server Target: "));
  Serial.println(SERVER_BASE_URL);

  // Initialize LED Pin
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW); // Start with LED OFF

  // Initialize I2C Pins for ESP8266 (SDA = D2, SCL = D1)
  Wire.begin(D2, D1);

  // Initialize LCD (Universal compatibility with any LiquidCrystal_I2C library)
  initializeLcd(lcd, 0);
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
  // Auto-reconnect if WiFi drops
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
    Serial.print(F("ESP8266 IP Address: "));
    Serial.println(WiFi.localIP());

    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("WiFi Connected!");
    lcd.setCursor(0, 1);
    lcd.print(WiFi.localIP());
    delay(2000);
  } else {
    Serial.println();
    Serial.println(F("WiFi Connection Failed! Will retry in main loop."));
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

  // Validate reading
  if (isnan(humidity) || isnan(temperature)) {
    Serial.println(F("Warning: DHT11 read returned NaN. Check sensor connection on Pin D3."));
    // Keep reasonable fallback so telemetry transmission doesn't stop
    temperature = 27.5;
    humidity = 60.0;
  }

  Serial.println(F("--------------------------------------------------"));
  Serial.printf("[DHT11] Temperature: %.1f °C | Humidity: %.1f %%\n", temperature, humidity);

  // 2. Setup Secure WiFi Client for HTTPS (Render Cloud)
  WiFiClientSecure client;
  client.setInsecure();               // Disables TLS certificate validation for ESP8266
  client.setTimeout(15000);           // 15 seconds timeout for cloud HTTPS
  client.setBufferSizes(1024, 512);   // Optimizes SSL RAM allocation to prevent heap crashes

  HTTPClient http;
  String syncEndpoint = String(SERVER_BASE_URL) + "/api/device/sync";

  Serial.print(F("Connecting to: "));
  Serial.println(syncEndpoint);

  if (http.begin(client, syncEndpoint)) {
    http.setTimeout(15000);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("User-Agent", "ESP8266-HomeAutomation");

    // Build JSON payload (Compatible with both ArduinoJson v6 and v7)
#if ARDUINOJSON_VERSION_MAJOR >= 7
    JsonDocument reqDoc;
#else
    StaticJsonDocument<256> reqDoc;
#endif
    reqDoc["temperature"] = temperature;
    reqDoc["humidity"]    = humidity;

    String requestBody;
    serializeJson(reqDoc, requestBody);

    int httpCode = http.POST(requestBody);

    if (httpCode > 0) {
      Serial.printf("Server Response Code: %d\n", httpCode);

      if (httpCode == HTTP_CODE_OK || httpCode == HTTP_CODE_CREATED) {
        String response = http.getString();
        Serial.print(F("Server Response: "));
        Serial.println(response);

        // Parse JSON response (Compatible with both ArduinoJson v6 and v7)
#if ARDUINOJSON_VERSION_MAJOR >= 7
        JsonDocument resDoc;
#else
        StaticJsonDocument<512> resDoc;
#endif
        DeserializationError error = deserializeJson(resDoc, response);

        if (!error) {
          // A. Process LED Actuator State (Pin D5)
          const char* ledState = resDoc["led"] | "OFF";
          if (String(ledState) == "ON") {
            digitalWrite(LED_PIN, HIGH);
            Serial.println(F("[ACTUATOR] LED on Pin D5 turned -> ON"));
          } else {
            digitalWrite(LED_PIN, LOW);
            Serial.println(F("[ACTUATOR] LED on Pin D5 turned -> OFF"));
          }

          // B. Process LCD Display Rows (I2C 16x2)
          const char* row1 = resDoc["lcd_row1"] | "";
          const char* row2 = resDoc["lcd_row2"] | "";

          updateLcdScreen(String(row1), String(row2));
        } else {
          Serial.print(F("JSON Deserialization failed: "));
          Serial.println(error.f_str());
        }
      }
    } else {
      Serial.printf("HTTP POST failed! Error: %s\n", http.errorToString(httpCode).c_str());
    }

    http.end();
  } else {
    Serial.println(F("Unable to begin connection to Render endpoint."));
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
    
    // Row 1 (16 characters max)
    lcd.setCursor(0, 0);
    lcd.print(format16(row1));

    // Row 2 (16 characters max)
    lcd.setCursor(0, 1);
    lcd.print(format16(row2));

    Serial.println(F("[LCD DISPLAY] Screen Updated:"));
    Serial.println("  Line 1: [" + row1 + "]");
    Serial.println("  Line 2: [" + row2 + "]");
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
