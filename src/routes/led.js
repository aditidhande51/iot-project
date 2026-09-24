const express = require('express');
const router = express.Router();
const { dbAsync } = require('../db');

// GET /api/led (Get current LED state)
router.get('/', async (req, res) => {
  try {
    const row = await dbAsync.get('SELECT led_state, updated_at FROM device_state WHERE id = 1');
    const state = row && row.led_state === 'ON' ? 'ON' : 'OFF';
    res.json({
      success: true,
      state,
      updated_at: row ? row.updated_at : new Date().toISOString()
    });
  } catch (err) {
    console.error('Error fetching LED state:', err);
    res.status(500).json({ success: false, message: 'Internal server error fetching LED state.' });
  }
});

// POST /api/led (Update LED state: ON / OFF or toggle)
router.post('/', async (req, res) => {
  try {
    let { state, toggle } = req.body;

    if (toggle) {
      const current = await dbAsync.get('SELECT led_state FROM device_state WHERE id = 1');
      state = current && current.led_state === 'ON' ? 'OFF' : 'ON';
    } else {
      if (!state || (state !== 'ON' && state !== 'OFF')) {
        return res.status(400).json({ success: false, message: 'State must be either ON or OFF.' });
      }
    }

    const nowIso = new Date().toISOString();
    await dbAsync.run(
      'UPDATE device_state SET led_state = ?, updated_at = ? WHERE id = 1',
      [state, nowIso]
    );

    res.json({
      success: true,
      message: `LED turned ${state}`,
      state,
      updated_at: nowIso
    });
  } catch (err) {
    console.error('Error updating LED state:', err);
    res.status(500).json({ success: false, message: 'Internal server error updating LED state.' });
  }
});

module.exports = router;
