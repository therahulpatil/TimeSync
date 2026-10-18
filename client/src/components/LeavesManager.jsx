import React, { useState, useEffect } from 'react';
import { 
  Palmtree, 
  Plus, 
  Trash2, 
  Calendar, 
  AlertCircle, 
  CheckCircle, 
  CalendarDays,
  FileText
} from 'lucide-react';
import { formatDate, getTodayString } from '../utils/timeUtils';
import { 
  fetchLeaves, 
  addLeave, 
  deleteLeave, 
  fetchHolidays, 
  addHoliday, 
  deleteHoliday 
} from '../utils/api';

export default function LeavesManager({ onRefresh }) {
  const [leaves, setLeaves] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(false);

  // Form states for leave
  const [startDate, setStartDate] = useState(getTodayString());
  const [endDate, setEndDate] = useState('');
  const [leaveType, setLeaveType] = useState('casual');
  const [isHalfDay, setIsHalfDay] = useState(false);
  const [leaveNotes, setLeaveNotes] = useState('');

  // Form states for holiday
  const [holidayDate, setHolidayDate] = useState('');
  const [holidayName, setHolidayName] = useState('');
  const [showHolidayForm, setShowHolidayForm] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [leavesRes, holidaysRes] = await Promise.all([
        fetchLeaves(),
        fetchHolidays()
      ]);
      setLeaves(leavesRes);
      setHolidays(holidaysRes);
    } catch (err) {
      console.error('Error loading leaves and holidays:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleApplyLeave = async (e) => {
    e.preventDefault();
    if (!startDate) return;
    try {
      setLoading(true);
      await addLeave({
        start_date: startDate,
        end_date: endDate || startDate,
        leave_type: leaveType,
        is_half_day: isHalfDay,
        leave_notes: leaveNotes
      });
      setLeaveNotes('');
      setEndDate('');
      await loadData();
      if (onRefresh) onRefresh();
    } catch (err) {
      alert('Error applying leave: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLeave = async (date) => {
    if (!confirm(`Cancel leave for ${date}?`)) return;
    try {
      await deleteLeave(date);
      await loadData();
      if (onRefresh) onRefresh();
    } catch (err) {
      alert('Error deleting leave: ' + err.message);
    }
  };

  const handleAddHoliday = async (e) => {
    e.preventDefault();
    if (!holidayDate || !holidayName.trim()) return;
    try {
      await addHoliday({
        date: holidayDate,
        name: holidayName.trim()
      });
      setHolidayDate('');
      setHolidayName('');
      setShowHolidayForm(false);
      await loadData();
      if (onRefresh) onRefresh();
    } catch (err) {
      alert('Error adding holiday: ' + err.message);
    }
  };

  const handleDeleteHoliday = async (id) => {
    if (!confirm('Remove this holiday?')) return;
    try {
      await deleteHoliday(id);
      await loadData();
      if (onRefresh) onRefresh();
    } catch (err) {
      alert('Error removing holiday: ' + err.message);
    }
  };

  const leaveTypes = [
    { id: 'casual', label: 'Casual Leave (CL)' },
    { id: 'sick', label: 'Sick Leave (SL)' },
    { id: 'paid', label: 'Earned / Paid Leave (PL)' },
    { id: 'wfh', label: 'Work From Home (WFH)' },
    { id: 'unpaid', label: 'Leave Without Pay (LWP)' }
  ];

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl shadow-black/20 p-6">
        <div className="flex items-center space-x-3 mb-2">
          <div className="p-2.5 rounded-xl bg-purple-950/60 text-purple-400 border border-purple-800/40">
            <Palmtree className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">Leaves & Holidays Manager</h2>
            <p className="text-xs text-slate-400">Record planned leaves, sick days, work-from-home, or company holidays.</p>
          </div>
        </div>

        {/* Form to Apply Leave */}
        <form onSubmit={handleApplyLeave} className="mt-6 pt-6 border-t border-slate-800 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Start Date */}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                From Date *
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-800 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* End Date (Optional for multiple days) */}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                To Date (Optional)
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
                placeholder="Single day if empty"
                className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-800 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Leave Type */}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Leave Type *
              </label>
              <select
                value={leaveType}
                onChange={(e) => setLeaveType(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-800 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {leaveTypes.map((t) => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </select>
            </div>

            {/* Full / Half Day toggle */}
            <div className="flex flex-col justify-end">
              <label className="flex items-center space-x-2 p-2.5 rounded-xl border border-slate-700 bg-slate-800/80 cursor-pointer hover:bg-slate-800 transition-colors">
                <input
                  type="checkbox"
                  checked={isHalfDay}
                  onChange={(e) => setIsHalfDay(e.target.checked)}
                  className="rounded text-indigo-500 focus:ring-indigo-400 h-4 w-4 bg-slate-900 border-slate-700"
                />
                <span className="text-xs font-semibold text-slate-300">Half Day Leave (4h target)</span>
              </label>
            </div>
          </div>

          {/* Notes & Submit */}
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <input
              type="text"
              placeholder="Reason or notes (optional, e.g. Doctor appointment, Family function)"
              value={leaveNotes}
              onChange={(e) => setLeaveNotes(e.target.value)}
              className="w-full sm:flex-1 px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-800 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm shadow-md shadow-purple-950/50 transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Record Leave</span>
            </button>
          </div>
        </form>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Logged Leaves List (2 cols) */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-white text-base">Recorded Leaves History</h3>
            <span className="text-xs font-semibold px-2.5 py-1 bg-slate-800 text-slate-300 rounded-full border border-slate-700">
              {leaves.length} entries
            </span>
          </div>

          {leaves.length === 0 ? (
            <div className="text-center py-10 text-slate-500 text-sm">
              <Palmtree className="w-8 h-8 mx-auto mb-2 text-slate-600" />
              <p>No leaves logged yet.</p>
              <p className="text-xs text-slate-500 mt-1">Leaves will be tracked in your weekly and monthly summaries.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-800 overflow-x-auto">
              {leaves.map((l) => (
                <div key={l.id} className="py-3.5 flex items-center justify-between gap-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-xl bg-purple-950/60 text-purple-400 border border-purple-800/40">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-white text-sm">{formatDate(l.date)}</span>
                        <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-purple-950/80 text-purple-300 border border-purple-800/60 uppercase">
                          {l.leave_type || 'Leave'}
                        </span>
                        {l.status === 'half_day' && (
                          <span className="px-1.5 py-0.2 text-[10px] font-bold rounded bg-amber-950 text-amber-300 border border-amber-800">
                            Half Day
                          </span>
                        )}
                      </div>
                      {l.leave_notes && (
                        <p className="text-xs text-slate-400 mt-0.5">{l.leave_notes}</p>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteLeave(l.date)}
                    className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                    title="Cancel leave"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Company Holidays & Sunday Notice (1 col) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white text-base">Holidays</h3>
            <button
              onClick={() => setShowHolidayForm(!showHolidayForm)}
              className="text-xs font-semibold text-indigo-400 hover:text-indigo-300"
            >
              {showHolidayForm ? 'Close' : '+ Add Holiday'}
            </button>
          </div>

          {/* Sunday default notice */}
          <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-900/40 flex items-start space-x-2 text-xs text-rose-300">
            <CheckCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <strong className="font-bold">Sunday is automatically a Holiday</strong>
              <p className="text-rose-400/80 text-[11px] mt-0.5">
                Sundays are excluded from required working hours calculations automatically.
              </p>
            </div>
          </div>

          {/* Add holiday form */}
          {showHolidayForm && (
            <form onSubmit={handleAddHoliday} className="p-3.5 bg-slate-800/80 rounded-xl border border-slate-700 space-y-3">
              <input
                type="date"
                required
                value={holidayDate}
                onChange={(e) => setHolidayDate(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-600 bg-slate-900 text-white"
              />
              <input
                type="text"
                required
                placeholder="Holiday Name (e.g. Diwali)"
                value={holidayName}
                onChange={(e) => setHolidayName(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-600 bg-slate-900 text-white"
              />
              <button
                type="submit"
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold"
              >
                Save Holiday
              </button>
            </form>
          )}

          {/* Holiday List */}
          <div className="divide-y divide-slate-800 max-h-80 overflow-y-auto">
            {holidays.length === 0 ? (
              <p className="text-xs text-slate-500 py-3 text-center">No custom holidays added yet.</p>
            ) : (
              holidays.map((h) => (
                <div key={h.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-white">{h.name}</div>
                    <div className="text-slate-400 font-mono">{formatDate(h.date)}</div>
                  </div>
                  <button
                    onClick={() => handleDeleteHoliday(h.id)}
                    className="text-slate-500 hover:text-rose-400 p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
