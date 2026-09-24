const express = require('express');
const router = express.Router();
const { dbAsync } = require('../db');

// Helper to format timestamps to Asia/Kolkata
function formatKolkataTime(isoString) {
  const dateObj = new Date(isoString || Date.now());
  const timeFormatter = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });
  const dateFormatter = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
  return {
    time: timeFormatter.format(dateObj),
    date: dateFormatter.format(dateObj)
  };
}

/**
 * POST /api/device/sync
 * High-efficiency endpoint for ESP8266:
 * Receives current sensor readings (DHT11), saves to DB,
 * and responds with current LED state and LCD lines in a single request.
 */
router.post('/sync', async (req, res) => {
  try {
    const { temperature, humidity } = req.body;

    // 1. If sensor data provided, save it
    if (temperature !== undefined && humidity !== undefined) {
      const tempNum = parseFloat(temperature);
      const humNum = parseFloat(humidity);

      if (!isNaN(tempNum) && !isNaN(humNum)) {
        const nowIso = new Date().toISOString();
        await dbAsync.run(
          'INSERT INTO sensor_readings (temperature, humidity, created_at) VALUES (?, ?, ?)',
          [tempNum, humNum, nowIso]
        );
      }
    }

    // 2. Fetch current device control state
    const state = await dbAsync.get('SELECT led_state, lcd_row1, lcd_row2, updated_at FROM device_state WHERE id = 1');

    res.json({
      success: true,
      led: state ? state.led_state : 'OFF',
      lcd_row1: state ? state.lcd_row1 : 'HOME AUTOMATION',
      lcd_row2: state ? state.lcd_row2 : 'SYSTEM READY',
      updated_at: state ? state.updated_at : new Date().toISOString()
    });
  } catch (err) {
    console.error('Error in device sync endpoint:', err);
    res.status(500).json({ success: false, message: 'Internal server error during device sync.' });
  }
});

// GET /api/device/status - Ping endpoint for ESP8266 or Dashboard status
router.get('/status', (req, res) => {
  const { time, date } = formatKolkataTime();
  res.json({
    status: 'ONLINE',
    timeZone: 'Asia/Kolkata (+05:30)',
    time,
    date
  });
});

module.exports = router;
