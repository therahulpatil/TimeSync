const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const fs = require('node:fs');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'attendance.db');
let dbInstance = null;

function getDb() {
  if (!dbInstance) {
    dbInstance = new DatabaseSync(DB_PATH);
    dbInstance.exec('PRAGMA foreign_keys = ON;');
    dbInstance.exec('PRAGMA journal_mode = WAL;');
    initSchema(dbInstance);
  }
  return dbInstance;
}

function initSchema(db) {
  // Settings table
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  // Seed default settings
  const defaultSettings = [
    { key: 'daily_target_hours', value: '8.0' },
    { key: 'expected_login', value: '11:00' },
    { key: 'expected_logout', value: '20:00' },
    { key: 'work_days', value: JSON.stringify([1, 2, 3, 4, 5]) }, // Mon to Fri
    { key: 'saturday_rule', value: 'off' }, // 'off', 'working', 'alternate'
    { key: 'sunday_rule', value: 'holiday' }
  ];

  const checkSettingStmt = db.prepare('SELECT value FROM settings WHERE key = ?');
  const insertSettingStmt = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)');

  for (const s of defaultSettings) {
    const existing = checkSettingStmt.get(s.key);
    if (!existing) {
      insertSettingStmt.run(s.key, s.value);
    }
  }

  // Attendance records table
  db.exec(`
    CREATE TABLE IF NOT EXISTS attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT UNIQUE NOT NULL,
      punch_in TEXT,
      punch_out TEXT,
      status TEXT DEFAULT 'present',
      leave_type TEXT,
      leave_notes TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // Breaks table
  db.exec(`
    CREATE TABLE IF NOT EXISTS breaks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      attendance_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      break_type TEXT NOT NULL,
      label TEXT,
      start_time TEXT NOT NULL,
      end_time TEXT,
      duration_minutes INTEGER DEFAULT 0,
      FOREIGN KEY (attendance_id) REFERENCES attendance(id) ON DELETE CASCADE
    );
  `);

  // Holidays table
  db.exec(`
    CREATE TABLE IF NOT EXISTS holidays (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      is_recurring INTEGER DEFAULT 0
    );
  `);

  // Indexes for performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
    CREATE INDEX IF NOT EXISTS idx_breaks_attendance_id ON breaks(attendance_id);
    CREATE INDEX IF NOT EXISTS idx_breaks_date ON breaks(date);
  `);
}

module.exports = {
  getDb,
  DB_PATH
};
