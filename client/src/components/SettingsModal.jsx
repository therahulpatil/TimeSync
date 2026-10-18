import React, { useState, useEffect } from 'react';
import { X, Settings as SettingsIcon, Save, Clock, Check } from 'lucide-react';
import { fetchSettings, updateSettings } from '../utils/api';

export default function SettingsModal({ isOpen, onClose, onSaveSuccess }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [dailyTargetHours, setDailyTargetHours] = useState('8.0');
  const [expectedLogin, setExpectedLogin] = useState('11:00');
  const [expectedLogout, setExpectedLogout] = useState('20:00');
  const [workDays, setWorkDays] = useState([1, 2, 3, 4, 5]);
  const [saturdayRule, setSaturdayRule] = useState('off');

  useEffect(() => {
    if (!isOpen) return;

    async function load() {
      try {
        setLoading(true);
        const data = await fetchSettings();
        if (data.daily_target_hours) setDailyTargetHours(String(data.daily_target_hours));
        if (data.expected_login) setExpectedLogin(data.expected_login);
        if (data.expected_logout) setExpectedLogout(data.expected_logout);
        if (Array.isArray(data.work_days)) setWorkDays(data.work_days);
        if (data.saturday_rule) setSaturdayRule(data.saturday_rule);
      } catch (err) {
        console.error('Error fetching settings:', err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleToggleDay = (dayNum) => {
    if (workDays.includes(dayNum)) {
      setWorkDays(workDays.filter(d => d !== dayNum));
    } else {
      setWorkDays([...workDays, dayNum].sort());
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await updateSettings({
        daily_target_hours: dailyTargetHours,
        expected_login: expectedLogin,
        expected_logout: expectedLogout,
        work_days: workDays,
        saturday_rule: saturdayRule,
        sunday_rule: 'holiday'
      });
      onSaveSuccess();
      onClose();
    } catch (err) {
      alert('Error updating settings: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const daysList = [
    { id: 1, label: 'Mon' },
    { id: 2, label: 'Tue' },
    { id: 3, label: 'Wed' },
    { id: 4, label: 'Thu' },
    { id: 5, label: 'Fri' },
    { id: 6, label: 'Sat' },
    { id: 0, label: 'Sun (Holiday)' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-800">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-xl bg-indigo-950/60 text-indigo-400 border border-indigo-800/40">
              <SettingsIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-white">Attendance Settings</h3>
              <p className="text-xs text-slate-400">Configure shift hours and weekly work days</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="py-8 text-center text-slate-500 text-sm">Loading settings...</div>
        ) : (
          <form onSubmit={handleSave} className="mt-5 space-y-4 text-xs">
            {/* Target hours */}
            <div>
              <label className="block font-bold text-slate-400 uppercase tracking-wider mb-1">
                Daily Net Target Working Hours
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  step="0.5"
                  min="1"
                  max="16"
                  required
                  value={dailyTargetHours}
                  onChange={(e) => setDailyTargetHours(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-800 text-white font-mono text-sm focus:ring-2 focus:ring-indigo-500"
                />
                <span className="text-slate-400 font-semibold">Hours</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Excludes tea and lunch breaks (typically 8.0 or 8.5 hours).</p>
            </div>

            {/* Standard Shift Timings */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Expected Login
                </label>
                <input
                  type="time"
                  required
                  value={expectedLogin}
                  onChange={(e) => setExpectedLogin(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-800 text-white font-mono text-sm"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Expected Logout
                </label>
                <input
                  type="time"
                  required
                  value={expectedLogout}
                  onChange={(e) => setExpectedLogout(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-800 text-white font-mono text-sm"
                />
              </div>
            </div>

            {/* Work Days (5 days a week) */}
            <div>
              <label className="block font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Working Days in Week ({workDays.length} days selected)
              </label>
              <div className="flex flex-wrap gap-1.5">
                {daysList.map((d) => {
                  const isChecked = workDays.includes(d.id);
                  const isSun = d.id === 0;
                  return (
                    <button
                      key={d.id}
                      type="button"
                      disabled={isSun}
                      onClick={() => handleToggleDay(d.id)}
                      className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
                        isSun 
                          ? 'bg-rose-950/40 text-rose-400 border border-rose-900/40 cursor-not-allowed opacity-75'
                          : isChecked 
                          ? 'bg-indigo-600 text-white' 
                          : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                      }`}
                    >
                      {d.label}
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Sunday is permanently configured as Holiday. Saturday is currently <strong>{saturdayRule}</strong>.
              </p>
            </div>

            {/* Saturday Rule */}
            <div>
              <label className="block font-bold text-slate-400 uppercase tracking-wider mb-1">
                Saturday Policy
              </label>
              <select
                value={saturdayRule}
                onChange={(e) => setSaturdayRule(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-800 text-white text-sm"
              >
                <option value="off">Off (Standard 5-Day Work Week)</option>
                <option value="working">Working Day (6-Day Work Week)</option>
              </select>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 font-medium text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex items-center space-x-1.5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-md shadow-indigo-950/50 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>Save Settings</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
