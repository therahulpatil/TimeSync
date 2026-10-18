const express = require('express');
const router = express.Router();
const { getDb } = require('../db');

function getLocalDateString(d = new Date()) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function calculateMinutes(startIso, endIso) {
  if (!startIso || !endIso) return 0;
  const s = new Date(startIso).getTime();
  const e = new Date(endIso).getTime();
  if (isNaN(s) || isNaN(e) || e < s) return 0;
  return Math.round((e - s) / 60000);
}

function getSettings() {
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
  return settings;
}

// GET /api/attendance/today
router.get('/today', (req, res) => {
  try {
    const db = getDb();
    const date = req.query.date || getLocalDateString();
    
    // Check if record exists
    let record = db.prepare('SELECT * FROM attendance WHERE date = ?').get(date);
    
    // Check if today is a custom holiday or Sunday
    const holiday = db.prepare('SELECT * FROM holidays WHERE date = ?').get(date);
    const dayOfWeek = new Date(date + 'T00:00:00').getDay(); // 0 is Sunday
    const isSunday = dayOfWeek === 0;

    if (!record) {
      // Default placeholder if none exists
      return res.json({
        date,
        punch_in: null,
        punch_out: null,
        status: holiday ? 'holiday' : (isSunday ? 'weekend' : 'not_started'),
        leave_type: null,
        leave_notes: null,
        holiday_name: holiday ? holiday.name : (isSunday ? 'Sunday Holiday' : null),
        notes: '',
        breaks: [],
        current_break: null,
        gross_minutes: 0,
        break_minutes: 0,
        net_minutes: 0,
        expected_logout: null
      });
    }

    // Get breaks
    const breaks = db.prepare('SELECT * FROM breaks WHERE attendance_id = ? ORDER BY id ASC').all(record.id);
    const currentBreak = breaks.find(b => !b.end_time) || null;

    // Calculate times
    let gross_minutes = 0;
    let break_minutes = 0;
    const nowIso = new Date().toISOString();

    if (record.punch_in) {
      const endForGross = record.punch_out || nowIso;
      gross_minutes = calculateMinutes(record.punch_in, endForGross);
    }

    for (const b of breaks) {
      if (b.end_time) {
        break_minutes += calculateMinutes(b.start_time, b.end_time);
      } else {
        break_minutes += calculateMinutes(b.start_time, nowIso);
      }
    }

    const net_minutes = Math.max(0, gross_minutes - break_minutes);

    // Expected logout calculation
    const settings = getSettings();
    const targetHours = parseFloat(settings.daily_target_hours || 8.0);
    const targetMinutes = Math.round(targetHours * 60);

    let expected_logout = null;
    if (record.punch_in && !record.punch_out) {
      // Expected logout = punch_in + targetMinutes + break_minutes
      const punchInMs = new Date(record.punch_in).getTime();
      const expectedMs = punchInMs + (targetMinutes + break_minutes) * 60000;
      expected_logout = new Date(expectedMs).toISOString();
    }

    // Determine live status
    let liveStatus = record.status;
    if (record.status === 'present') {
      if (!record.punch_in) liveStatus = 'not_started';
      else if (record.punch_out) liveStatus = 'completed';
      else if (currentBreak) liveStatus = 'on_break';
      else liveStatus = 'working';
    }

    res.json({
      ...record,
      status: liveStatus,
      raw_status: record.status,
      holiday_name: holiday ? holiday.name : (isSunday ? 'Sunday Holiday' : null),
      breaks,
      current_break: currentBreak,
      gross_minutes,
      break_minutes,
      net_minutes,
      target_minutes: targetMinutes,
      expected_logout
    });
  } catch (err) {
    console.error('Error in /today:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/attendance/punch-in
router.post('/punch-in', (req, res) => {
  try {
    const code = (req.body.code || '').trim();
    if (code !== './admin') {
      return res.status(403).json({ error: 'Confirmation code is required and must be ./admin' });
    }

    const db = getDb();
    const date = req.body.date || getLocalDateString();
    const punch_in = req.body.time || new Date().toISOString();

    let record = db.prepare('SELECT * FROM attendance WHERE date = ?').get(date);
    if (!record) {
      const stmt = db.prepare(`
        INSERT INTO attendance (date, punch_in, punch_out, status, notes)
        VALUES (?, ?, NULL, 'present', '')
      `);
      stmt.run(date, punch_in);
    } else {
      const stmt = db.prepare(`
        UPDATE attendance 
        SET punch_in = ?, punch_out = NULL, status = 'present', leave_type = NULL, leave_notes = NULL, updated_at = datetime('now')
        WHERE date = ?
      `);
      stmt.run(punch_in, date);
    }

    res.json({ success: true, date, punch_in });
  } catch (err) {
    console.error('Error in /punch-in:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/attendance/punch-out
router.post('/punch-out', (req, res) => {
  try {
    const code = (req.body.code || '').trim();
    if (code !== './admin') {
      return res.status(403).json({ error: 'Confirmation code is required and must be ./admin' });
    }

    const db = getDb();
    const date = req.body.date || getLocalDateString();
    const punch_out = req.body.time || new Date().toISOString();

    const record = db.prepare('SELECT * FROM attendance WHERE date = ?').get(date);
    if (!record) {
      return res.status(404).json({ error: 'No attendance record found for today to punch out.' });
    }

    // If there is an active ongoing break, automatically end it at punch_out time!
    const activeBreak = db.prepare('SELECT * FROM breaks WHERE attendance_id = ? AND end_time IS NULL').get(record.id);
    if (activeBreak) {
      const dur = calculateMinutes(activeBreak.start_time, punch_out);
      db.prepare('UPDATE breaks SET end_time = ?, duration_minutes = ? WHERE id = ?')
        .run(punch_out, dur, activeBreak.id);
    }

    db.prepare(`
      UPDATE attendance 
      SET punch_out = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(punch_out, record.id);

    res.json({ success: true, date, punch_out });
  } catch (err) {
    console.error('Error in /punch-out:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/attendance/break/start
router.post('/break/start', (req, res) => {
  try {
    const db = getDb();
    const date = req.body.date || getLocalDateString();
    const break_type = req.body.break_type || 'tea'; // 'tea', 'lunch', 'custom'
    const label = req.body.label || (break_type === 'lunch' ? 'Lunch Break' : (break_type === 'tea' ? 'Tea Break' : 'Custom Break'));
    const start_time = req.body.time || new Date().toISOString();

    let record = db.prepare('SELECT * FROM attendance WHERE date = ?').get(date);
    if (!record) {
      // Auto punch-in if user starts a break without punching in yet
      const insStmt = db.prepare(`
        INSERT INTO attendance (date, punch_in, status, notes)
        VALUES (?, ?, 'present', '')
      `);
      insStmt.run(date, start_time);
      record = db.prepare('SELECT * FROM attendance WHERE date = ?').get(date);
    }

    // Check if an existing break is currently open
    const openBreak = db.prepare('SELECT * FROM breaks WHERE attendance_id = ? AND end_time IS NULL').get(record.id);
    if (openBreak) {
      // Close open break first
      const dur = calculateMinutes(openBreak.start_time, start_time);
      db.prepare('UPDATE breaks SET end_time = ?, duration_minutes = ? WHERE id = ?')
        .run(start_time, dur, openBreak.id);
    }

    const stmt = db.prepare(`
      INSERT INTO breaks (attendance_id, date, break_type, label, start_time)
      VALUES (?, ?, ?, ?, ?)
    `);
    const result = stmt.run(record.id, date, break_type, label, start_time);

    res.json({ success: true, break_id: result.lastInsertRowid, start_time, break_type, label });
  } catch (err) {
    console.error('Error in /break/start:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/attendance/break/end
router.post('/break/end', (req, res) => {
  try {
    const db = getDb();
    const date = req.body.date || getLocalDateString();
    const end_time = req.body.time || new Date().toISOString();

    const record = db.prepare('SELECT * FROM attendance WHERE date = ?').get(date);
    if (!record) {
      return res.status(404).json({ error: 'No attendance record found.' });
    }

    const openBreak = db.prepare('SELECT * FROM breaks WHERE attendance_id = ? AND end_time IS NULL ORDER BY id DESC LIMIT 1').get(record.id);
    if (!openBreak) {
      return res.status(400).json({ error: 'No active break to end.' });
    }

    const duration_minutes = calculateMinutes(openBreak.start_time, end_time);
    db.prepare('UPDATE breaks SET end_time = ?, duration_minutes = ? WHERE id = ?')
      .run(end_time, duration_minutes, openBreak.id);

    res.json({ success: true, break_id: openBreak.id, duration_minutes, end_time });
  } catch (err) {
    console.error('Error in /break/end:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/attendance/break/:id
router.delete('/break/:id', (req, res) => {
  try {
    const db = getDb();
    const id = req.params.id;
    db.prepare('DELETE FROM breaks WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting break:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/attendance/break/:id
router.put('/break/:id', (req, res) => {
  try {
    const db = getDb();
    const id = req.params.id;
    const { start_time, end_time, break_type, label } = req.body;
    const duration = calculateMinutes(start_time, end_time);
    db.prepare(`
      UPDATE breaks 
      SET start_time = ?, end_time = ?, duration_minutes = ?, break_type = ?, label = ?
      WHERE id = ?
    `).run(start_time, end_time || null, duration, break_type || 'tea', label || '', id);
    res.json({ success: true, duration });
  } catch (err) {
    console.error('Error updating break:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/attendance/day/:date
router.get('/day/:date', (req, res) => {
  try {
    const db = getDb();
    const date = req.params.date;
    const record = db.prepare('SELECT * FROM attendance WHERE date = ?').get(date);
    const holiday = db.prepare('SELECT * FROM holidays WHERE date = ?').get(date);
    const dayOfWeek = new Date(date + 'T00:00:00').getDay();
    const isSunday = dayOfWeek === 0;

    let breaks = [];
    if (record) {
      breaks = db.prepare('SELECT * FROM breaks WHERE attendance_id = ? ORDER BY id ASC').all(record.id);
    }

    res.json({
      date,
      record: record || null,
      breaks,
      holiday: holiday ? holiday.name : (isSunday ? 'Sunday Holiday' : null),
      is_sunday: isSunday
    });
  } catch (err) {
    console.error('Error getting day:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/attendance/log (Manual day entry or edit)
router.post('/log', (req, res) => {
  try {
    const db = getDb();
    const { date, punch_in, punch_out, status, leave_type, leave_notes, notes, breaks } = req.body;

    if (!date) {
      return res.status(400).json({ error: 'Date is required.' });
    }

    let record = db.prepare('SELECT * FROM attendance WHERE date = ?').get(date);
    let recordId;

    if (!record) {
      const stmt = db.prepare(`
        INSERT INTO attendance (date, punch_in, punch_out, status, leave_type, leave_notes, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      const resStmt = stmt.run(
        date, 
        punch_in || null, 
        punch_out || null, 
        status || 'present', 
        leave_type || null, 
        leave_notes || null, 
        notes || ''
      );
      recordId = resStmt.lastInsertRowid;
    } else {
      recordId = record.id;
      db.prepare(`
        UPDATE attendance 
        SET punch_in = ?, punch_out = ?, status = ?, leave_type = ?, leave_notes = ?, notes = ?, updated_at = datetime('now')
        WHERE id = ?
      `).run(
        punch_in || null, 
        punch_out || null, 
        status || 'present', 
        leave_type || null, 
        leave_notes || null, 
        notes || '', 
        recordId
      );
    }

    // If breaks array provided, replace existing breaks
    if (Array.isArray(breaks)) {
      db.prepare('DELETE FROM breaks WHERE attendance_id = ?').run(recordId);
      const insertBreak = db.prepare(`
        INSERT INTO breaks (attendance_id, date, break_type, label, start_time, end_time, duration_minutes)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      for (const b of breaks) {
        const dur = b.duration_minutes || calculateMinutes(b.start_time, b.end_time);
        insertBreak.run(
          recordId,
          date,
          b.break_type || 'tea',
          b.label || (b.break_type === 'lunch' ? 'Lunch Break' : 'Tea Break'),
          b.start_time,
          b.end_time || null,
          dur
        );
      }
    }

    res.json({ success: true, record_id: recordId, date });
  } catch (err) {
    console.error('Error saving attendance log:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
