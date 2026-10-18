const express = require('express');
const router = express.Router();
const { getDb } = require('../db');

function formatYMD(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
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

// GET /api/stats/weekly?start_date=YYYY-MM-DD
router.get('/weekly', (req, res) => {
  try {
    const db = getDb();
    const settings = getSettings();
    const targetHours = parseFloat(settings.daily_target_hours || 8.0);
    const standardWorkDays = settings.work_days || [1, 2, 3, 4, 5]; // 1=Mon .. 5=Fri
    const saturdayRule = settings.saturday_rule || 'off'; // 'off', 'working'
    const targetDailyMinutes = Math.round(targetHours * 60);

    let startDate;
    if (req.query.start_date) {
      startDate = new Date(req.query.start_date + 'T00:00:00');
    } else {
      // Find Monday of current week
      const now = new Date();
      const day = now.getDay(); // 0 is Sunday, 1 is Monday
      const diffToMonday = (day === 0 ? -6 : 1) - day;
      startDate = new Date(now);
      startDate.setDate(now.getDate() + diffToMonday);
    }

    const days = [];
    let total_net_minutes = 0;
    let total_gross_minutes = 0;
    let total_break_minutes = 0;
    let total_target_minutes = 0;
    let days_present = 0;
    let days_leave = 0;
    let days_holiday = 0;

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const todayStr = formatYMD(new Date());

    for (let i = 0; i < 7; i++) {
      const curDate = new Date(startDate);
      curDate.setDate(startDate.getDate() + i);
      const dateStr = formatYMD(curDate);
      const dayOfWeek = curDate.getDay();

      const record = db.prepare('SELECT * FROM attendance WHERE date = ?').get(dateStr);
      const holiday = db.prepare('SELECT * FROM holidays WHERE date = ?').get(dateStr);
      const isSunday = dayOfWeek === 0;
      const isSaturday = dayOfWeek === 6;

      let isWorkingDay = standardWorkDays.includes(dayOfWeek);
      if (isSaturday && saturdayRule === 'working') isWorkingDay = true;
      if (isSunday) isWorkingDay = false;

      let breaks = [];
      let gross_mins = 0;
      let break_mins = 0;
      let net_mins = 0;

      if (record) {
        breaks = db.prepare('SELECT * FROM breaks WHERE attendance_id = ? ORDER BY id ASC').all(record.id);
        const endForGross = record.punch_out || (dateStr === todayStr ? new Date().toISOString() : record.punch_in);
        if (record.punch_in) {
          gross_mins = calculateMinutes(record.punch_in, endForGross);
        }
        for (const b of breaks) {
          const bEnd = b.end_time || (dateStr === todayStr ? new Date().toISOString() : b.start_time);
          break_mins += calculateMinutes(b.start_time, bEnd);
        }
        net_mins = Math.max(0, gross_mins - break_mins);
      }

      // Determine day status
      let status = 'pending';
      let dayTargetMinutes = 0;

      if (holiday) {
        status = 'holiday';
        days_holiday++;
      } else if (isSunday) {
        status = 'weekend';
      } else if (isSaturday && saturdayRule === 'off') {
        status = 'weekend';
      } else if (record) {
        if (record.status === 'leave') {
          status = 'leave';
          days_leave++;
        } else if (record.status === 'half_day') {
          status = 'half_day';
          dayTargetMinutes = Math.round(targetDailyMinutes / 2);
          days_present += 0.5;
          days_leave += 0.5;
        } else if (record.punch_in) {
          status = 'present';
          dayTargetMinutes = targetDailyMinutes;
          days_present++;
        } else {
          status = isWorkingDay ? 'absent' : 'weekend';
        }
      } else {
        if (isWorkingDay) {
          dayTargetMinutes = targetDailyMinutes;
          status = dateStr < todayStr ? 'absent' : 'pending';
        } else {
          status = 'weekend';
        }
      }

      total_net_minutes += net_mins;
      total_gross_minutes += gross_mins;
      total_break_minutes += break_mins;
      total_target_minutes += dayTargetMinutes;

      const variance_mins = net_mins - dayTargetMinutes;

      days.push({
        date: dateStr,
        day_name: dayNames[dayOfWeek],
        day_of_week: dayOfWeek,
        is_working_day: isWorkingDay,
        punch_in: record ? record.punch_in : null,
        punch_out: record ? record.punch_out : null,
        gross_minutes: gross_mins,
        break_minutes: break_mins,
        net_minutes: net_mins,
        net_hours: parseFloat((net_mins / 60).toFixed(2)),
        target_minutes: dayTargetMinutes,
        target_hours: parseFloat((dayTargetMinutes / 60).toFixed(2)),
        variance_minutes: variance_mins,
        status,
        leave_type: record ? record.leave_type : null,
        leave_notes: record ? record.leave_notes : null,
        holiday_name: holiday ? holiday.name : (isSunday ? 'Sunday Holiday' : null),
        notes: record ? record.notes : '',
        breaks
      });
    }

    const variance_total = total_net_minutes - total_target_minutes;
    const avg_daily_minutes = days_present > 0 ? Math.round(total_net_minutes / days_present) : 0;

    res.json({
      start_date: formatYMD(startDate),
      end_date: days[6].date,
      days,
      summary: {
        total_net_minutes,
        total_net_hours: parseFloat((total_net_minutes / 60).toFixed(2)),
        total_gross_hours: parseFloat((total_gross_minutes / 60).toFixed(2)),
        total_break_minutes,
        total_break_hours: parseFloat((total_break_minutes / 60).toFixed(2)),
        total_target_hours: parseFloat((total_target_minutes / 60).toFixed(2)),
        variance_minutes: variance_total,
        variance_hours: parseFloat((variance_total / 60).toFixed(2)),
        days_present,
        days_leave,
        days_holiday,
        avg_daily_hours: parseFloat((avg_daily_minutes / 60).toFixed(2)),
        completion_percentage: total_target_minutes > 0 ? Math.min(100, Math.round((total_net_minutes / total_target_minutes) * 100)) : 0
      }
    });
  } catch (err) {
    console.error('Error in /weekly:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/stats/monthly?year=YYYY&month=MM
router.get('/monthly', (req, res) => {
  try {
    const db = getDb();
    const settings = getSettings();
    const targetHours = parseFloat(settings.daily_target_hours || 8.0);
    const standardWorkDays = settings.work_days || [1, 2, 3, 4, 5];
    const saturdayRule = settings.saturday_rule || 'off';
    const targetDailyMinutes = Math.round(targetHours * 60);

    const now = new Date();
    const year = parseInt(req.query.year) || now.getFullYear();
    const month = parseInt(req.query.month) || (now.getMonth() + 1); // 1-12

    const numDays = new Date(year, month, 0).getDate();
    const todayStr = formatYMD(now);

    const days = [];
    let total_net_minutes = 0;
    let total_target_minutes = 0;
    let total_break_minutes = 0;
    let present_days = 0;
    let leave_days = 0;
    let holidays_count = 0;
    let working_days_count = 0;

    const leaveBreakdown = {
      casual: 0,
      sick: 0,
      paid: 0,
      unpaid: 0,
      wfh: 0,
      other: 0
    };

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    for (let d = 1; d <= numDays; d++) {
      const curDate = new Date(year, month - 1, d);
      const dateStr = formatYMD(curDate);
      const dayOfWeek = curDate.getDay();

      const record = db.prepare('SELECT * FROM attendance WHERE date = ?').get(dateStr);
      const holiday = db.prepare('SELECT * FROM holidays WHERE date = ?').get(dateStr);
      const isSunday = dayOfWeek === 0;
      const isSaturday = dayOfWeek === 6;

      let isWorkingDay = standardWorkDays.includes(dayOfWeek);
      if (isSaturday && saturdayRule === 'working') isWorkingDay = true;
      if (isSunday) isWorkingDay = false;

      let breaks = [];
      let gross_mins = 0;
      let break_mins = 0;
      let net_mins = 0;

      if (record) {
        breaks = db.prepare('SELECT * FROM breaks WHERE attendance_id = ? ORDER BY id ASC').all(record.id);
        const endForGross = record.punch_out || (dateStr === todayStr ? new Date().toISOString() : record.punch_in);
        if (record.punch_in) {
          gross_mins = calculateMinutes(record.punch_in, endForGross);
        }
        for (const b of breaks) {
          const bEnd = b.end_time || (dateStr === todayStr ? new Date().toISOString() : b.start_time);
          break_mins += calculateMinutes(b.start_time, bEnd);
        }
        net_mins = Math.max(0, gross_mins - break_mins);
      }

      let status = 'pending';
      let dayTargetMinutes = 0;

      if (holiday) {
        status = 'holiday';
        holidays_count++;
      } else if (isSunday) {
        status = 'weekend';
      } else if (isSaturday && saturdayRule === 'off') {
        status = 'weekend';
      } else if (record && record.status === 'leave') {
        status = 'leave';
        leave_days++;
        const lt = record.leave_type || 'other';
        leaveBreakdown[lt] = (leaveBreakdown[lt] || 0) + 1;
      } else if (record && record.status === 'half_day') {
        status = 'half_day';
        dayTargetMinutes = Math.round(targetDailyMinutes / 2);
        present_days += 0.5;
        leave_days += 0.5;
        working_days_count++;
      } else if (record && record.punch_in) {
        status = 'present';
        dayTargetMinutes = targetDailyMinutes;
        present_days++;
        working_days_count++;
      } else {
        if (isWorkingDay) {
          working_days_count++;
          dayTargetMinutes = targetDailyMinutes;
          status = dateStr < todayStr ? 'absent' : 'pending';
        } else {
          status = 'weekend';
        }
      }

      total_net_minutes += net_mins;
      total_break_minutes += break_mins;
      total_target_minutes += dayTargetMinutes;

      days.push({
        day_number: d,
        date: dateStr,
        day_name: dayNames[dayOfWeek],
        day_of_week: dayOfWeek,
        is_working_day: isWorkingDay,
        punch_in: record ? record.punch_in : null,
        punch_out: record ? record.punch_out : null,
        breaks_count: breaks.length,
        break_minutes: break_mins,
        net_minutes: net_mins,
        net_hours: parseFloat((net_mins / 60).toFixed(2)),
        target_minutes: dayTargetMinutes,
        status,
        leave_type: record ? record.leave_type : null,
        holiday_name: holiday ? holiday.name : (isSunday ? 'Sunday Holiday' : null)
      });
    }

    const variance_mins = total_net_minutes - total_target_minutes;
    const avg_daily_minutes = present_days > 0 ? Math.round(total_net_minutes / present_days) : 0;

    res.json({
      year,
      month,
      num_days: numDays,
      days,
      summary: {
        total_working_days: working_days_count,
        present_days,
        leave_days,
        holidays_count,
        leave_breakdown: leaveBreakdown,
        total_net_minutes,
        total_net_hours: parseFloat((total_net_minutes / 60).toFixed(2)),
        total_break_hours: parseFloat((total_break_minutes / 60).toFixed(2)),
        total_target_hours: parseFloat((total_target_minutes / 60).toFixed(2)),
        variance_minutes: variance_mins,
        variance_hours: parseFloat((variance_mins / 60).toFixed(2)),
        avg_daily_hours: parseFloat((avg_daily_minutes / 60).toFixed(2)),
        attendance_rate: working_days_count > 0 ? Math.round((present_days / working_days_count) * 100) : 0
      }
    });
  } catch (err) {
    console.error('Error in /monthly:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
