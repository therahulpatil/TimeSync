const express = require('express');
const router = express.Router();
const { getDb } = require('../db');

function calculateMinutes(startIso, endIso) {
  if (!startIso || !endIso) return 0;
  const s = new Date(startIso).getTime();
  const e = new Date(endIso).getTime();
  if (isNaN(s) || isNaN(e) || e < s) return 0;
  return Math.round((e - s) / 60000);
}

// GET /api/settings - Fetch all settings
router.get('/', (req, res) => {
  try {
    const db = getDb();
    const rows = db.prepare('SELECT key, value FROM settings').all();
    const settings = {};
    for (const r of rows) {
      try {
        settings[r.key] = JSON.parse(r.value);
      } catch {
        settings[r.key] = r.value;
      }
    }
    res.json(settings);
  } catch (err) {
    console.error('Error fetching settings:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/settings - Update settings
router.post('/', (req, res) => {
  try {
    const db = getDb();
    const updates = req.body;
    const stmt = db.prepare(`
      INSERT INTO settings (key, value)
      VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `);

    for (const [k, v] of Object.entries(updates)) {
      const valStr = typeof v === 'object' ? JSON.stringify(v) : String(v);
      stmt.run(k, valStr);
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Error updating settings:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/settings/export/csv - Export attendance history to CSV
router.get('/export/csv', (req, res) => {
  try {
    const db = getDb();
    const attendanceRecords = db.prepare('SELECT * FROM attendance ORDER BY date DESC').all();
    const breaks = db.prepare('SELECT * FROM breaks ORDER BY date ASC, id ASC').all();

    // Map breaks by attendance_id
    const breaksByAttId = {};
    for (const b of breaks) {
      if (!breaksByAttId[b.attendance_id]) breaksByAttId[b.attendance_id] = [];
      breaksByAttId[b.attendance_id].push(b);
    }

    const csvHeaders = ['Date', 'Status', 'Punch In', 'Punch Out', 'Gross Hours', 'Total Break Mins', 'Net Working Hours', 'Leave Type', 'Leave Notes', 'Breaks Count', 'Notes'];
    const rows = [csvHeaders.join(',')];

    for (const rec of attendanceRecords) {
      const dayBreaks = breaksByAttId[rec.id] || [];
      let breakMins = 0;
      for (const b of dayBreaks) {
        if (b.end_time) {
          breakMins += calculateMinutes(b.start_time, b.end_time);
        }
      }

      let grossMins = 0;
      if (rec.punch_in && rec.punch_out) {
        grossMins = calculateMinutes(rec.punch_in, rec.punch_out);
      }
      const netMins = Math.max(0, grossMins - breakMins);

      const pIn = rec.punch_in ? new Date(rec.punch_in).toLocaleTimeString() : '';
      const pOut = rec.punch_out ? new Date(rec.punch_out).toLocaleTimeString() : '';

      const row = [
        rec.date,
        rec.status || '',
        `"${pIn}"`,
        `"${pOut}"`,
        (grossMins / 60).toFixed(2),
        breakMins,
        (netMins / 60).toFixed(2),
        rec.leave_type || '',
        `"${(rec.leave_notes || '').replace(/"/g, '""')}"`,
        dayBreaks.length,
        `"${(rec.notes || '').replace(/"/g, '""')}"`
      ];
      rows.push(row.join(','));
    }

    const csvContent = rows.join('\r\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=attendance_export_${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csvContent);
  } catch (err) {
    console.error('Error generating CSV export:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/settings/backup/json - Complete data backup
router.get('/backup/json', (req, res) => {
  try {
    const db = getDb();
    const settings = db.prepare('SELECT * FROM settings').all();
    const attendance = db.prepare('SELECT * FROM attendance').all();
    const breaks = db.prepare('SELECT * FROM breaks').all();
    const holidays = db.prepare('SELECT * FROM holidays').all();

    res.json({
      exported_at: new Date().toISOString(),
      settings,
      attendance,
      breaks,
      holidays
    });
  } catch (err) {
    console.error('Error backing up data:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
