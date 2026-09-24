const express = require('express');
const router = express.Router();
const { dbAsync } = require('../db');

// GET /api/lcd (Get current LCD text)
router.get('/', async (req, res) => {
  try {
    const row = await dbAsync.get('SELECT lcd_row1, lcd_row2, updated_at FROM device_state WHERE id = 1');
    if (!row) {
      return res.json({
        success: true,
        row1: 'HOME AUTOMATION',
        row2: 'SYSTEM READY',
        updated_at: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      row1: row.lcd_row1 || '',
      row2: row.lcd_row2 || '',
      updated_at: row.updated_at
    });
  } catch (err) {
    console.error('Error fetching LCD state:', err);
    res.status(500).json({ success: false, message: 'Internal server error fetching LCD text.' });
  }
});

// POST /api/lcd (Update LCD text)
router.post('/', async (req, res) => {
  try {
    let { row1 = '', row2 = '' } = req.body;

    // Enforce 16-character limit for 16x2 LCD
    row1 = String(row1).substring(0, 16);
    row2 = String(row2).substring(0, 16);

    const nowIso = new Date().toISOString();

    await dbAsync.run(
      `UPDATE device_state 
       SET lcd_row1 = ?, lcd_row2 = ?, updated_at = ? 
       WHERE id = 1`,
      [row1, row2, nowIso]
    );

    res.json({
      success: true,
      message: 'LCD display updated successfully!',
      row1,
      row2,
      updated_at: nowIso
    });
  } catch (err) {
    console.error('Error updating LCD state:', err);
    res.status(500).json({ success: false, message: 'Internal server error updating LCD text.' });
  }
});

module.exports = router;
