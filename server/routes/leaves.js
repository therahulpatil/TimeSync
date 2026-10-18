const express = require('express');
const router = express.Router();
const { getDb } = require('../db');

function formatYMD(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// GET /api/leaves - List all logged leaves
router.get('/', (req, res) => {
  try {
    const db = getDb();
    const rows = db.prepare(`
      SELECT id, date, status, leave_type, leave_notes, notes, created_at 
      FROM attendance 
      WHERE status IN ('leave', 'half_day') 
      ORDER BY date DESC
    `).all();
    res.json(rows);
  } catch (err) {
    console.error('Error fetching leaves:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/leaves - Record single date or date range leave
router.post('/', (req, res) => {
  try {
    const db = getDb();
    const { start_date, end_date, leave_type, leave_notes, is_half_day } = req.body;

    if (!start_date) {
      return res.status(400).json({ error: 'Start date is required.' });
    }

    const s = new Date(start_date + 'T00:00:00');
    const e = end_date ? new Date(end_date + 'T00:00:00') : new Date(start_date + 'T00:00:00');
    const status = is_half_day ? 'half_day' : 'leave';

    const insertOrUpdate = db.prepare(`
      INSERT INTO attendance (date, status, leave_type, leave_notes, updated_at)
      VALUES (?, ?, ?, ?, datetime('now'))
      ON CONFLICT(date) DO UPDATE SET
        status = excluded.status,
        leave_type = excluded.leave_type,
        leave_notes = excluded.leave_notes,
        updated_at = datetime('now')
    `);

    let count = 0;
    const cur = new Date(s);
    while (cur <= e) {
      const dayOfWeek = cur.getDay();
      // Skip Sundays (Sunday is holiday)
      if (dayOfWeek !== 0) {
        insertOrUpdate.run(formatYMD(cur), status, leave_type || 'casual', leave_notes || '');
        count++;
      }
      cur.setDate(cur.getDate() + 1);
    }

    res.json({ success: true, count });
  } catch (err) {
    console.error('Error saving leave:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/leaves/:date - Cancel/remove leave for a date
router.delete('/:date', (req, res) => {
  try {
    const db = getDb();
    const date = req.params.date;
    db.prepare(`
      UPDATE attendance 
      SET status = 'present', leave_type = NULL, leave_notes = NULL, updated_at = datetime('now')
      WHERE date = ?
    `).run(date);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting leave:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/leaves/holidays - List holidays
router.get('/holidays', (req, res) => {
  try {
    const db = getDb();
    const rows = db.prepare('SELECT * FROM holidays ORDER BY date ASC').all();
    res.json(rows);
  } catch (err) {
    console.error('Error fetching holidays:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/leaves/holidays - Add holiday
router.post('/holidays', (req, res) => {
  try {
    const db = getDb();
    const { date, name, is_recurring } = req.body;
    if (!date || !name) {
      return res.status(400).json({ error: 'Date and name are required.' });
    }
    const stmt = db.prepare(`
      INSERT INTO holidays (date, name, is_recurring)
      VALUES (?, ?, ?)
      ON CONFLICT(date) DO UPDATE SET name = excluded.name, is_recurring = excluded.is_recurring
    `);
    stmt.run(date, name, is_recurring ? 1 : 0);
    res.json({ success: true });
  } catch (err) {
    console.error('Error adding holiday:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/leaves/holidays/:id - Remove holiday
router.delete('/holidays/:id', (req, res) => {
  try {
    const db = getDb();
    db.prepare('DELETE FROM holidays WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error('Error removing holiday:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
