# HOME AUTOMATION - IoT Control & Environmental Monitoring System

**Designed and Developed by ADITI DHANDE , Dept. of Electrical Engineering, GCOEY**

---

## 📌 Project Overview
This is a full-stack Internet of Things (IoT) Home Automation and Environmental Monitoring System. It bridges physical hardware (ESP8266, DHT11 Temperature & Humidity Sensor, 16x2 I2C LCD Display, and LED actuator) with a responsive web dashboard deployed on Render.

---

## 🚀 Key Features

### 1. Front-End (Simple, Modern, Pleasing to Eyes)
- **Tech Stack:** HTML5, Tailwind CSS, Vanilla JavaScript, Chart.js, Lucide Icons.
- **Header:** Live India Standard Time (**Asia/Kolkata +05:30**), Live IoT status, WiFi identifier (`:COE YAVATMAL`).
- **User Authentication:** Login (Email, Password) & Registration (Name, Email, Password) with secure JWT tokens.
- **Tab 1: Environment Monitoring (DHT11)**:
  - Automatic sync cycle every **10 seconds** with visual countdown badge.
  - **Section 1: Innovative Gauge & Seek Bar Structure**:
    - **Temperature Dial:** Semi-circular arc gauge with color cues (Blue for cold, Emerald for comfort, Rose for heat).
    - **Humidity Seek Bar:** Dynamic liquid level seek bar with percentage shimmer fill.
    - **Real-Time Trend Curve:** Live Chart.js graph plotting the last 20 readings.
  - **Section 2: Saved Records Table**:
    - Table format: `# | Temperature | Humidity | Time (IST) | Date | Action (Delete)`
    - **Pagination:** Shows latest records first, 20 records per page.
    - Minimum & Maximum all-time temperatures displayed.
    - Delete button for each record.
    - Interactive "Simulate Sensor" button for testing anytime.
- **Tab 2: Smart LCD (16x2 I2C Display)**:
  - Input fields: `Row 1: <input>` and `Row 2: <input>` with character counters (max 16 chars).
  - Update Button: Instantly updates physical LCD screen and virtual LCD preview.
  - Quick presets: Welcome Home, Aditi Dhande, College Info.
- **Tab 3: LED Automation (Pin D5)**:
  - Big tactile glowing toggle button to switch LED ON or OFF.
  - Interactive realistic glowing bulb simulation.
- **Footer:**
  - `Designed and Developed by ADITI DHANDE , Dept. of Electrical Engineering, GCOEY`

---

## 🔌 Hardware Circuit & Wiring

| Component | Pin on ESP8266 (NodeMCU) | Description / Notes |
| :--- | :--- | :--- |
| **DHT11 Sensor** | **D3** (GPIO 0) | Data pin with pull-up resistor |
| **LED (+) Anode** | **D5** (GPIO 14) | In series with 220Ω - 330Ω resistor to GND |
| **LCD 16x2 SCL** | **D1** (GPIO 5) | I2C Clock Line |
| **LCD 16x2 SDA** | **D2** (GPIO 4) | I2C Data Line |
| **LCD VCC & GND** | **VIN (5V) & GND** | Power for I2C backpack |

### WiFi Credentials Configured:
- **SSID:** `:COE YAVATMAL`
- **Password:** `shoaib845`

---

## 🌐 Render Deployment Guide (Step-by-Step)

The project includes `render.yaml` and is 100% ready for Render deployment.

1. **Push Code to GitHub:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit for Home Automation IoT"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/iot_project.git
   git push -u origin main
   ```

2. **Deploy on Render:**
   - Go to [https://render.com](https://render.com) and log in.
   - Click **"New +"** -> **"Web Service"**.
   - Connect your GitHub repository.
   - Configure settings:
     - **Name:** `home-automation-iot`
     - **Runtime:** `Node`
     - **Build Command:** `npm install`
     - **Start Command:** `node server.js`
     - **Plan:** `Free`
   - Click **"Create Web Service"**.

3. **Get Your Public URL:**
   - Once deployed, Render will provide a URL like: `https://home-automation-iot.onrender.com`.
   - Paste this URL in your Arduino code variable `SERVER_BASE_URL` in [arduino/esp8266_home_automation.ino](file:///c:/Users/Aditi/OneDrive/Desktop/iot_project/arduino/esp8266_home_automation.ino).

---

## 💻 Running Locally on Your PC

```bash
# 1. Install dependencies
npm install

# 2. Start the server
npm start
```
Open your browser and navigate to: **`http://localhost:3000`**

---

## 📱 Arduino Flashing Instructions
1. Open the Arduino IDE.
2. Go to **File -> Preferences**, and add the ESP8266 URL to *Additional Boards Manager URLs*:
   `http://arduino.esp8266.com/stable/package_esp8266com_index.json`
3. Go to **Tools -> Board -> Boards Manager**, search for `esp8266` and click install.
4. Install the following libraries via **Sketch -> Include Library -> Manage Libraries**:
   - `DHT sensor library` (by Adafruit)
   - `Adafruit Unified Sensor` (by Adafruit)
   - `LiquidCrystal_I2C` (by Frank de Brabander)
   - `ArduinoJson` (by Benoit Blanchon)
5. Open [arduino/esp8266_home_automation.ino](file:///c:/Users/Aditi/OneDrive/Desktop/iot_project/arduino/esp8266_home_automation.ino).
6. Set `SERVER_BASE_URL` to your Render URL or your local PC IP (e.g. `http://192.168.1.X:3000`).
7. Select **Tools -> Board -> NodeMCU 1.0 (ESP-12E Module)** and select your COM Port.
8. Click **Upload**.
