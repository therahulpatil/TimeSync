const express = require('express');
const cors = require('cors');
const path = require('node:path');
const fs = require('node:fs');
const { getDb } = require('./db');

const attendanceRouter = require('./routes/attendance');
const statsRouter = require('./routes/stats');
const leavesRouter = require('./routes/leaves');
const settingsRouter = require('./routes/settings');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Database schema
getDb();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api/attendance', attendanceRouter);
app.use('/api/stats', statsRouter);
app.use('/api/leaves', leavesRouter);
app.use('/api/settings', settingsRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Serve frontend static build if available
const CLIENT_DIST = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(CLIENT_DIST)) {
  app.use(express.static(CLIENT_DIST));
  app.use((req, res) => {
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ error: 'Endpoint not found' });
    }
    res.sendFile(path.join(CLIENT_DIST, 'index.html'));
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Office Attendance Server running at http://localhost:${PORT}`);
  console.log(`📁 Database initialized in data directory.`);
});
