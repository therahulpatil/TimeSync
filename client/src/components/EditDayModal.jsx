import React, { useState, useEffect } from 'react';
import { 
  X, 
  Clock, 
  Coffee, 
  Utensils, 
  Plus, 
  Trash2, 
  Save, 
  Calendar,
  AlertCircle 
} from 'lucide-react';
import { 
  formatDate, 
  formatTime24, 
  combineDateAndTime, 
  formatMinutes 
} from '../utils/timeUtils';
import { fetchDay, saveAttendanceLog } from '../utils/api';

export default function EditDayModal({ date, isOpen, onClose, onSaveSuccess }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form states
  const [status, setStatus] = useState('present');
  const [punchInTime, setPunchInTime] = useState('');
  const [punchOutTime, setPunchOutTime] = useState('');
  const [leaveType, setLeaveType] = useState('casual');
  const [leaveNotes, setLeaveNotes] = useState('');
  const [notes, setNotes] = useState('');
  const [breaks, setBreaks] = useState([]);

  useEffect(() => {
    if (!isOpen || !date) return;

    async function load() {
      try {
        setLoading(true);
        const data = await fetchDay(date);
        const rec = data?.record;

        if (rec) {
          setStatus(rec.status || 'present');
          setPunchInTime(formatTime24(rec.punch_in));
          setPunchOutTime(formatTime24(rec.punch_out));
          setLeaveType(rec.leave_type || 'casual');
          setLeaveNotes(rec.leave_notes || '');
          setNotes(rec.notes || '');
        } else {
          // Defaults if no record
          setStatus(data.is_sunday ? 'weekend' : 'present');
          setPunchInTime('11:00');
          setPunchOutTime('20:00');
          setLeaveType('casual');
          setLeaveNotes('');
          setNotes('');
        }

        if (data.breaks && Array.isArray(data.breaks)) {
          setBreaks(data.breaks.map(b => ({
            id: b.id,
            break_type: b.break_type,
            label: b.label,
            start_time: formatTime24(b.start_time),
            end_time: formatTime24(b.end_time)
          })));
        } else {
          setBreaks([]);
        }
      } catch (err) {
        console.error('Error fetching day record:', err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [isOpen, date]);

  if (!isOpen) return null;

  const handleAddBreak = (type = 'tea') => {
    setBreaks([
      ...breaks,
      {
        break_type: type,
        label: type === 'lunch' ? 'Lunch Break' : 'Tea Break',
        start_time: type === 'lunch' ? '14:00' : '17:00',
        end_time: type === 'lunch' ? '14:45' : '17:20'
      }
    ]);
  };

  const handleRemoveBreak = (idx) => {
    setBreaks(breaks.filter((_, i) => i !== idx));
  };

  const handleBreakChange = (idx, field, value) => {
    const updated = [...breaks];
    updated[idx][field] = value;
    if (field === 'break_type') {
      updated[idx].label = value === 'lunch' ? 'Lunch Break' : (value === 'tea' ? 'Tea Break' : 'Custom Break');
    }
    setBreaks(updated);
  };

  let previewGrossMins = 0;
  let previewBreakMins = 0;

  if (punchInTime && punchOutTime) {
    const [inH, inM] = punchInTime.split(':').map(Number);
    const [outH, outM] = punchOutTime.split(':').map(Number);
    const inTotal = inH * 60 + inM;
    const outTotal = outH * 60 + outM;
    if (outTotal >= inTotal) {
      previewGrossMins = outTotal - inTotal;
    }
  }

  for (const b of breaks) {
    if (b.start_time && b.end_time) {
      const [sH, sM] = b.start_time.split(':').map(Number);
      const [eH, eM] = b.end_time.split(':').map(Number);
      const sTotal = sH * 60 + sM;
      const eTotal = eH * 60 + eM;
      if (eTotal >= sTotal) {
        previewBreakMins += (eTotal - sTotal);
      }
    }
  }

  const previewNetMins = Math.max(0, previewGrossMins - previewBreakMins);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const punchInIso = punchInTime ? combineDateAndTime(date, punchInTime) : null;
      const punchOutIso = punchOutTime ? combineDateAndTime(date, punchOutTime) : null;

      const formattedBreaks = breaks.map(b => ({
        break_type: b.break_type,
        label: b.label,
        start_time: combineDateAndTime(date, b.start_time),
        end_time: b.end_time ? combineDateAndTime(date, b.end_time) : null
      }));

      await saveAttendanceLog({
        date,
        punch_in: punchInIso,
        punch_out: punchOutIso,
        status,
        leave_type: status === 'leave' || status === 'half_day' ? leaveType : null,
        leave_notes: leaveNotes,
        notes,
        breaks: formattedBreaks
      });

      onSaveSuccess();
      onClose();
    } catch (err) {
      alert('Error saving record: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-800 my-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <h3 className="text-lg font-extrabold text-white">Attendance Log & Edit</h3>
            <p className="text-xs text-slate-400">{formatDate(date)}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-500 text-sm">Loading details...</div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-5">
            {/* Status selection */}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Day Status
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {[
                  { id: 'present', label: 'Present' },
                  { id: 'half_day', label: 'Half Day' },
                  { id: 'leave', label: 'Leave' },
                  { id: 'holiday', label: 'Holiday' },
                  { id: 'weekend', label: 'Weekend' },
                ].map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setStatus(s.id)}
                    className={`py-2 text-xs font-semibold rounded-xl border transition-all ${
                      status === s.id
                        ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-950/50'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700/80'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Leave details if status is leave or half_day */}
            {(status === 'leave' || status === 'half_day') && (
              <div className="p-3.5 bg-purple-950/40 border border-purple-800/60 rounded-xl space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-purple-300 mb-1">Leave Type</label>
                    <select
                      value={leaveType}
                      onChange={(e) => setLeaveType(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-purple-700/60 bg-slate-800 text-white text-xs"
                    >
                      <option value="casual">Casual Leave (CL)</option>
                      <option value="sick">Sick Leave (SL)</option>
                      <option value="paid">Earned / Paid Leave (PL)</option>
                      <option value="wfh">Work From Home (WFH)</option>
                      <option value="unpaid">Leave Without Pay (LWP)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-purple-300 mb-1">Reason / Notes</label>
                    <input
                      type="text"
                      placeholder="Doctor, Vacation, etc."
                      value={leaveNotes}
                      onChange={(e) => setLeaveNotes(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-purple-700/60 bg-slate-800 text-white text-xs"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Punch In / Out inputs */}
            {status !== 'leave' && status !== 'holiday' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Punch In Time
                  </label>
                  <input
                    type="time"
                    value={punchInTime}
                    onChange={(e) => setPunchInTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-800 text-white font-mono text-sm focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Punch Out Time
                  </label>
                  <input
                    type="time"
                    value={punchOutTime}
                    onChange={(e) => setPunchOutTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-800 text-white font-mono text-sm focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            )}

            {/* Breaks Manager */}
            {status !== 'leave' && status !== 'holiday' && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Breaks Taken ({breaks.length})
                  </label>
                  <div className="flex space-x-2">
                    <button
                      type="button"
                      onClick={() => handleAddBreak('tea')}
                      className="px-2 py-1 bg-amber-950/60 text-amber-300 border border-amber-800/60 rounded-lg text-xs font-semibold hover:bg-amber-900/60"
                    >
                      + Tea Break
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddBreak('lunch')}
                      className="px-2 py-1 bg-orange-950/60 text-orange-300 border border-orange-800/60 rounded-lg text-xs font-semibold hover:bg-orange-900/60"
                    >
                      + Lunch Break
                    </button>
                  </div>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {breaks.map((b, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2 bg-slate-800/60 border border-slate-700/80 rounded-xl text-xs">
                      <select
                        value={b.break_type}
                        onChange={(e) => handleBreakChange(idx, 'break_type', e.target.value)}
                        className="px-2 py-1 rounded border border-slate-600 bg-slate-800 text-white"
                      >
                        <option value="tea">Tea</option>
                        <option value="lunch">Lunch</option>
                        <option value="custom">Other</option>
                      </select>
                      <input
                        type="time"
                        value={b.start_time}
                        onChange={(e) => handleBreakChange(idx, 'start_time', e.target.value)}
                        className="px-2 py-1 rounded border border-slate-600 font-mono bg-slate-800 text-white"
                      />
                      <span className="text-slate-400">&rarr;</span>
                      <input
                        type="time"
                        value={b.end_time}
                        onChange={(e) => handleBreakChange(idx, 'end_time', e.target.value)}
                        className="px-2 py-1 rounded border border-slate-600 font-mono bg-slate-800 text-white"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveBreak(idx)}
                        className="text-slate-500 hover:text-rose-400 p-1 ml-auto"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Live Calculation Preview */}
            {status !== 'leave' && status !== 'holiday' && (
              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-400">Gross: </span>
                  <strong className="text-white font-mono">{formatMinutes(previewGrossMins)}</strong>
                </div>
                <div>
                  <span className="text-slate-400">Breaks: </span>
                  <strong className="text-amber-400 font-mono">{previewBreakMins}m</strong>
                </div>
                <div>
                  <span className="text-slate-400">Net Work: </span>
                  <strong className="text-emerald-400 font-mono text-sm">{formatMinutes(previewNetMins)}</strong>
                </div>
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                Optional Notes
              </label>
              <input
                type="text"
                placeholder="Work notes, client meeting, remote..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-800 text-white text-xs focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex items-center space-x-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-950/50 transition-all disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>Save Attendance</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
