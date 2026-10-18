# ⏱️ TimeSync - Office Attendance & Working Hours Tracker

> **By TheRahulPatil** • Modern, dark-themed, containerized office attendance web app with flexible shift tracking, tea/lunch break calculation, 5-day week goals, Sunday holiday automation, and persistent SQLite database.

---

## ✨ Key Features

- **Daily Attendance & Flexible Shifts**:
  - **Punch In** & **Punch Out** with accidental punch protection (requires confirmation code `./admin`).
  - Flexible shift support: automatically accounts for early login, late login, early logout.
  - **Dynamic "Expected Logout" Calculator**: Automatically computes the exact time you can log out based on your actual punch-in time and total breaks taken so you always complete your 8.0-hour net working goal.
- **Tea & Lunch Break Tracking**:
  - One-click **Tea Break** and **Lunch Break** stopwatch timers.
  - Custom break support (Coffee, Walk, Snacks).
  - Break time is automatically deducted from gross hours to calculate **true Net Working Hours**.
- **Weekly Tracking (5-Day Work Week & Sunday Holiday)**:
  - Weekly goal tracking (e.g., 40.0 hours target).
  - Sunday is automatically treated as an official holiday / off day.
  - Interactive daily bar chart comparing daily net work against the target line.
  - Overtime / deficit calculation (`+2h 15m` overtime or `-45m` under-time).
- **Monthly Tracking & Interactive Calendar**:
  - Monthly calendar view with color-coded day badges:
    - 🟢 Present (with Net Hours)
    - 🟡 Half Day (4h target)
    - 🟣 Leave (CL, SL, PL, WFH, LWP)
    - 🔵 Holiday & Sunday Off
  - Monthly summary KPIs: Total net hours, expected work hours, attendance rate %, days present, total breaks.
- **Leaves & Holidays Management**:
  - Log single or multi-day leaves with types: Casual Leave (CL), Sick Leave (SL), Paid / Earned Leave (PL), Work From Home (WFH), Leave Without Pay (LWP).
  - Half-day leave support (4h target).
  - Custom company holidays (Diwali, Christmas, National Holidays, etc.).
- **Manual Log Entry & Edit**:
  - Adjust punch-in, punch-out, or add missing breaks for any day retrospectively.
- **Data Export & Backups**:
  - One-click **CSV Report Download** for official reporting.
  - One-click **JSON Database Backup**.
- **Self-Contained & Containerized**:
  - Multi-stage Docker build with persistent SQLite database storage in a Docker volume.
  - Zero external database setup needed (powered by Node.js built-in `node:sqlite`).

---

## 🔒 Accidental Punch Protection

To avoid accidental clicks, both **Punch In** and **Punch Out** require entering a confirmation code:
```text
./admin
```

---

## 🚀 Quick Start with Docker

### Run directly from Docker Hub:
```bash
docker run -d \
  --name timesync-app \
  -p 3000:3000 \
  -v office_attendance_data:/app/data \
  --restart unless-stopped \
  therahulpatil/timesync:latest
```

### Or using Docker Compose:
```bash
docker compose up -d
```

Open your browser and navigate to:
```
http://localhost:3000
```

Your data persists across container and system restarts in the Docker named volume `office_attendance_data` (mounted at `/app/data/attendance.db`).

---

## 💻 Running Locally without Docker

### Prerequisites
- Node.js (v20+ or v22+)

### Instructions
1. Install dependencies:
   ```bash
   npm run setup
   ```
2. Build frontend and start server:
   ```bash
   npm run build
   npm start
   ```
3. Open `http://localhost:3000` in your browser.
4. On Windows, you can also double-click `start.bat`.

---

## 📂 Project Structure

```
TimeSync/
├── Dockerfile                  # Multi-stage production container build
├── docker-compose.yml          # Container configuration with persistent volume
├── .dockerignore               # Docker build exclusions
├── .gitignore                  # Git exclusions (data, node_modules, dist)
├── start.bat                   # Windows one-click starter
├── package.json                # Root package & npm scripts
├── server/                     # Backend API (Express + node:sqlite)
│   ├── index.js                # Server entrypoint & static client delivery
│   ├── db.js                   # SQLite schema, tables & WAL mode initialization
│   └── routes/
│       ├── attendance.js       # Today status, punch in/out, break management
│       ├── stats.js            # Weekly & monthly analytics & calculations
│       ├── leaves.js           # Leave logging and custom holiday management
│       └── settings.js         # Configurable settings & CSV/JSON exports
├── client/                     # Frontend UI (React 19 + Tailwind CSS + Lucide)
│   ├── index.html
│   ├── vite.config.js
│   ├── src/
│   │   ├── main.jsx
│   │   ├── App.jsx             # Main application layout & state
│   │   ├── components/
│   │   │   ├── Navbar.jsx          # Header with live digital clock & navigation
│   │   │   ├── DailyTracker.jsx    # Live punch card, timers, expected logout
│   │   │   ├── WeeklyView.jsx      # 5-day week stats, bar chart, day breakdown
│   │   │   ├── MonthlyCalendar.jsx # Interactive monthly calendar grid
│   │   │   ├── LeavesManager.jsx   # CL/SL/PL/WFH leave and holiday manager
│   │   │   ├── EditDayModal.jsx    # Modal for manual entry & adjusting punches
│   │   │   ├── SettingsModal.jsx   # Target hours, shift times & workdays
│   │   │   └── ExportModal.jsx     # CSV and JSON backup downloads
│   │   └── utils/
│   │       ├── timeUtils.js        # Formatters, hour calculations
│   │       └── api.js              # REST API client
└── data/                       # Persistent SQLite database (attendance.db)
```

---

## ⚙️ Configuration & Shift Customization

By default, the application is pre-configured with:
- **Standard Login**: 11:00 AM
- **Standard Logout**: 8:00 PM
- **Daily Net Target Work**: 8.0 Hours (excluding tea/lunch breaks)
- **Work Week**: 5 Days (Monday – Friday)
- **Sunday**: Official Holiday / Off
- **Saturday**: Weekend Off (can be toggled to working in Settings)

You can customize all parameters at any time by clicking the **Settings (⚙️)** icon in the top right corner of the application.

---

## 👤 Author

Developed by **TheRahulPatil**  
- GitHub: [@therahulpatil](https://github.com/therahulpatil)  
- Docker Hub: [therahulpatil/timesync](https://hub.docker.com/r/therahulpatil/timesync)
