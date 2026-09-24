const express = require('express');
const router = express.Router();
const { dbAsync } = require('../db');

// Helper to format timestamps to Asia/Kolkata (+05:30)
function formatKolkataTime(isoString) {
  const dateObj = new Date(isoString || Date.now());
  
  // Format options for Asia/Kolkata timezone
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

// POST /api/sensor-data (ESP8266 or simulator posts new reading)
router.post('/', async (req, res) => {
  try {
    const { temperature, humidity } = req.body;

    if (temperature === undefined || humidity === undefined) {
      return res.status(400).json({ success: false, message: 'Temperature and humidity are required.' });
    }

    const tempNum = parseFloat(temperature);
    const humNum = parseFloat(humidity);

    if (isNaN(tempNum) || isNaN(humNum)) {
      return res.status(400).json({ success: false, message: 'Invalid sensor reading numbers.' });
    }

    const nowIso = new Date().toISOString();
    const result = await dbAsync.run(
      'INSERT INTO sensor_readings (temperature, humidity, created_at) VALUES (?, ?, ?)',
      [tempNum, humNum, nowIso]
    );

    const { time, date } = formatKolkataTime(nowIso);

    res.status(201).json({
      success: true,
      message: 'Sensor data recorded successfully',
      data: {
        id: result.lastID,
        temperature: tempNum,
        humidity: humNum,
        time,
        date,
        created_at: nowIso
      }
    });
  } catch (err) {
    console.error('Error saving sensor data:', err);
    res.status(500).json({ success: false, message: 'Internal server error saving sensor data.' });
  }
});

// GET /api/sensor-data (Paginated, latest first, 20 per page)
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, parseInt(req.query.limit) || 20);
    const offset = (page - 1) * limit;

    // Get total count
    const countRow = await dbAsync.get('SELECT COUNT(*) as count FROM sensor_readings');
    const total = countRow ? countRow.count : 0;
    const totalPages = Math.ceil(total / limit) || 1;

    // Get min and max temperature
    const statsRow = await dbAsync.get(
      'SELECT MIN(temperature) as minTemp, MAX(temperature) as maxTemp, AVG(temperature) as avgTemp FROM sensor_readings'
    );

    // Get records ordered latest first (DESC)
    const rows = await dbAsync.all(
      'SELECT * FROM sensor_readings ORDER BY id DESC LIMIT ? OFFSET ?',
      [limit, offset]
    );

    // Format time/date for Kolkata
    const records = rows.map((r) => {
      const { time, date } = formatKolkataTime(r.created_at);
      return {
        id: r.id,
        temperature: r.temperature,
        humidity: r.humidity,
        time,
        date,
        raw_timestamp: r.created_at
      };
    });

    // Latest reading for immediate dashboard gauge sync
    const latestRow = rows.length > 0 && page === 1 ? rows[0] : await dbAsync.get('SELECT * FROM sensor_readings ORDER BY id DESC LIMIT 1');
    let latest = null;
    if (latestRow) {
      const { time, date } = formatKolkataTime(latestRow.created_at);
      latest = {
        id: latestRow.id,
        temperature: latestRow.temperature,
        humidity: latestRow.humidity,
        time,
        date,
        raw_timestamp: latestRow.created_at
      };
    }

    res.json({
      success: true,
      data: records,
      pagination: {
        page,
        limit,
        total,
        totalPages
      },
      stats: {
        minTemperature: statsRow && statsRow.minTemp !== null ? Number(statsRow.minTemp.toFixed(1)) : null,
        maxTemperature: statsRow && statsRow.maxTemp !== null ? Number(statsRow.maxTemp.toFixed(1)) : null,
        avgTemperature: statsRow && statsRow.avgTemp !== null ? Number(statsRow.avgTemp.toFixed(1)) : null,
        latestReading: latest
      }
    });
  } catch (err) {
    console.error('Error fetching sensor data:', err);
    res.status(500).json({ success: false, message: 'Internal server error fetching sensor records.' });
  }
});

// GET /api/sensor-data/history (Latest 20 readings chronological for charting)
router.get('/history', async (req, res) => {
  try {
    const rows = await dbAsync.all('SELECT * FROM sensor_readings ORDER BY id DESC LIMIT 20');
    // Reverse to chronological order for charts (oldest to newest)
    const chronological = rows.reverse().map((r) => {
      const { time, date } = formatKolkataTime(r.created_at);
      return {
        id: r.id,
        temperature: r.temperature,
        humidity: r.humidity,
        time,
        date,
        timestamp: r.created_at
      };
    });

    res.json({
      success: true,
      data: chronological
    });
  } catch (err) {
    console.error('Error fetching sensor history:', err);
    res.status(500).json({ success: false, message: 'Internal server error fetching chart history.' });
  }
});

// DELETE /api/sensor-data/:id (Delete record)
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!id) {
      return res.status(400).json({ success: false, message: 'Invalid record ID.' });
    }

    const result = await dbAsync.run('DELETE FROM sensor_readings WHERE id = ?', [id]);
    if (result.changes === 0) {
      return res.status(404).json({ success: false, message: 'Record not found.' });
    }

    res.json({ success: true, message: `Record #${id} deleted successfully.` });
  } catch (err) {
    console.error('Error deleting record:', err);
    res.status(500).json({ success: false, message: 'Internal server error deleting record.' });
  }
});

module.exports = router;
