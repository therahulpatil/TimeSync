const API_BASE = '/api';

export async function fetchToday(date) {
  const url = date ? `${API_BASE}/attendance/today?date=${date}` : `${API_BASE}/attendance/today`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch today data');
  return res.json();
}

export async function punchIn(time, date, code = './admin') {
  const res = await fetch(`${API_BASE}/attendance/punch-in`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ time, date, code })
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to punch in');
  }
  return res.json();
}

export async function punchOut(time, date, code = './admin') {
  const res = await fetch(`${API_BASE}/attendance/punch-out`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ time, date, code })
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to punch out');
  }
  return res.json();
}

export async function startBreak(break_type, label, time, date) {
  const res = await fetch(`${API_BASE}/attendance/break/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ break_type, label, time, date })
  });
  if (!res.ok) throw new Error('Failed to start break');
  return res.json();
}

export async function endBreak(time, date) {
  const res = await fetch(`${API_BASE}/attendance/break/end`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ time, date })
  });
  if (!res.ok) throw new Error('Failed to end break');
  return res.json();
}

export async function deleteBreak(id) {
  const res = await fetch(`${API_BASE}/attendance/break/${id}`, {
    method: 'DELETE'
  });
  if (!res.ok) throw new Error('Failed to delete break');
  return res.json();
}

export async function saveAttendanceLog(data) {
  const res = await fetch(`${API_BASE}/attendance/log`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to save attendance log');
  return res.json();
}

export async function fetchDay(date) {
  const res = await fetch(`${API_BASE}/attendance/day/${date}`);
  if (!res.ok) throw new Error('Failed to fetch day details');
  return res.json();
}

export async function fetchWeeklyStats(startDate) {
  const url = startDate ? `${API_BASE}/stats/weekly?start_date=${startDate}` : `${API_BASE}/stats/weekly`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch weekly stats');
  return res.json();
}

export async function fetchMonthlyStats(year, month) {
  const url = `${API_BASE}/stats/monthly?year=${year}&month=${month}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch monthly stats');
  return res.json();
}

export async function fetchLeaves() {
  const res = await fetch(`${API_BASE}/leaves`);
  if (!res.ok) throw new Error('Failed to fetch leaves');
  return res.json();
}

export async function addLeave(data) {
  const res = await fetch(`${API_BASE}/leaves`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to add leave');
  return res.json();
}

export async function deleteLeave(date) {
  const res = await fetch(`${API_BASE}/leaves/${date}`, {
    method: 'DELETE'
  });
  if (!res.ok) throw new Error('Failed to delete leave');
  return res.json();
}

export async function fetchHolidays() {
  const res = await fetch(`${API_BASE}/leaves/holidays`);
  if (!res.ok) throw new Error('Failed to fetch holidays');
  return res.json();
}

export async function addHoliday(data) {
  const res = await fetch(`${API_BASE}/leaves/holidays`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to add holiday');
  return res.json();
}

export async function deleteHoliday(id) {
  const res = await fetch(`${API_BASE}/leaves/holidays/${id}`, {
    method: 'DELETE'
  });
  if (!res.ok) throw new Error('Failed to delete holiday');
  return res.json();
}

export async function fetchSettings() {
  const res = await fetch(`${API_BASE}/settings`);
  if (!res.ok) throw new Error('Failed to fetch settings');
  return res.json();
}

export async function updateSettings(data) {
  const res = await fetch(`${API_BASE}/settings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to update settings');
  return res.json();
}
