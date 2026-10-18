import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Square, 
  Coffee, 
  Utensils, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Sparkles, 
  Timer, 
  Edit3, 
  Trash2, 
  Plus, 
  ChevronRight,
  TrendingUp,
  Zap,
  Moon,
  ShieldCheck,
  ShieldAlert,
  KeyRound
} from 'lucide-react';
import { 
  formatTime, 
  formatMinutes, 
  formatDate, 
  getTodayString 
} from '../utils/timeUtils';
import { 
  punchIn, 
  punchOut, 
  startBreak, 
  endBreak, 
  deleteBreak 
} from '../utils/api';
import confetti from 'canvas-confetti';

export default function DailyTracker({ 
  todayData, 
  refreshToday, 
  settings, 
  onEditDay 
}) {
  const [loadingAction, setLoadingAction] = useState(false);
  const [liveSeconds, setLiveSeconds] = useState(0);
  const [customBreakName, setCustomBreakName] = useState('');
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [hasCelebrated, setHasCelebrated] = useState(false);

  // Security code confirmation modal for Punch In / Punch Out
  const [punchModal, setPunchModal] = useState({ isOpen: false, type: null }); // type: 'in' | 'out'
  const [punchCode, setPunchCode] = useState('');
  const [punchError, setPunchError] = useState('');

  // Live seconds ticker to keep timers smooth
  useEffect(() => {
    const timer = setInterval(() => {
      setLiveSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Compute live seconds and minutes
  const isPunchedIn = Boolean(todayData?.punch_in);
  const isPunchedOut = Boolean(todayData?.punch_out);
  const currentBreak = todayData?.current_break;
  const isOnBreak = Boolean(currentBreak);

  let currentGrossMinutes = todayData?.gross_minutes || 0;
  let currentBreakMinutes = todayData?.break_minutes || 0;
  let currentNetMinutes = todayData?.net_minutes || 0;

  if (isPunchedIn && !isPunchedOut) {
    const nowMs = Date.now();
    const punchInMs = new Date(todayData.punch_in).getTime();
    currentGrossMinutes = Math.max(0, Math.floor((nowMs - punchInMs) / 60000));

    // Calculate completed breaks
    let totalCompletedBreakMinutes = 0;
    if (Array.isArray(todayData?.breaks)) {
      for (const b of todayData.breaks) {
        if (b.end_time) {
          totalCompletedBreakMinutes += Math.round((new Date(b.end_time).getTime() - new Date(b.start_time).getTime()) / 60000);
        }
      }
    }

    if (isOnBreak) {
      const breakStartMs = new Date(currentBreak.start_time).getTime();
      const activeBreakMins = Math.max(0, Math.floor((nowMs - breakStartMs) / 60000));
      currentBreakMinutes = totalCompletedBreakMinutes + activeBreakMins;
    } else {
      currentBreakMinutes = totalCompletedBreakMinutes;
    }

    currentNetMinutes = Math.max(0, currentGrossMinutes - currentBreakMinutes);
  }

  const targetHours = parseFloat(settings?.daily_target_hours || 8.0);
  const targetMinutes = Math.round(targetHours * 60);
  const progressPercent = targetMinutes > 0 ? Math.min(100, Math.round((currentNetMinutes / targetMinutes) * 100)) : 0;
  const isGoalReached = currentNetMinutes >= targetMinutes;
  const overtimeMinutes = Math.max(0, currentNetMinutes - targetMinutes);
  const remainingMinutes = Math.max(0, targetMinutes - currentNetMinutes);

  // Trigger celebration once target reached
  useEffect(() => {
    if (isGoalReached && !hasCelebrated && isPunchedIn && targetMinutes > 0) {
      try {
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.7 }
        });
      } catch (e) {
        // ignore
      }
      setHasCelebrated(true);
    }
  }, [isGoalReached, hasCelebrated, isPunchedIn, targetMinutes]);

  // Expected logout time calculation
  let expectedLogoutTime = null;
  if (isPunchedIn && !isPunchedOut) {
    const punchInMs = new Date(todayData.punch_in).getTime();
    const expectedMs = punchInMs + (targetMinutes + currentBreakMinutes) * 60000;
    expectedLogoutTime = new Date(expectedMs);
  }

  // Early / Late comparison against expected 11:00 AM
  let shiftDiffText = null;
  if (isPunchedIn) {
    try {
      const pInDate = new Date(todayData.punch_in);
      const expectedTimeStr = settings?.expected_login || '11:00';
      const [expH, expM] = expectedTimeStr.split(':').map(Number);
      const expDate = new Date(pInDate);
      expDate.setHours(expH, expM, 0, 0);

      const diffMins = Math.round((pInDate.getTime() - expDate.getTime()) / 60000);
      if (diffMins < -5) {
        shiftDiffText = {
          type: 'early',
          message: `Early start by ${Math.abs(diffMins)} mins (Target: ${expectedTimeStr})`
        };
      } else if (diffMins > 10) {
        shiftDiffText = {
          type: 'late',
          message: `Logged in ${diffMins} mins after ${expectedTimeStr}`
        };
      }
    } catch (e) {
      // ignore
    }
  }

  // Open security verification modal
  const handleOpenPunchModal = (type) => {
    setPunchCode('');
    setPunchError('');
    setPunchModal({ isOpen: true, type });
  };

  // Submit security verification and execute punch
  const handleConfirmPunch = async (e) => {
    e.preventDefault();
    if (punchCode.trim() !== './admin') {
      setPunchError('Invalid confirmation code. Please enter ./admin');
      return;
    }

    try {
      setLoadingAction(true);
      const currentTime = new Date().toISOString();
      const currentDate = todayData?.date || getTodayString();
      if (punchModal.type === 'in') {
        await punchIn(currentTime, currentDate, punchCode.trim());
      } else if (punchModal.type === 'out') {
        await punchOut(currentTime, currentDate, punchCode.trim());
      }
      setPunchModal({ isOpen: false, type: null });
      setPunchCode('');
      setPunchError('');
      await refreshToday();
    } catch (err) {
      setPunchError(err.message || 'Operation failed');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleStartBreak = async (type, label) => {
    try {
      setLoadingAction(true);
      await startBreak(type, label);
      await refreshToday();
    } catch (err) {
      alert('Error starting break: ' + err.message);
    } finally {
      setLoadingAction(false);
    }
  };

  const handleEndBreak = async () => {
    try {
      setLoadingAction(true);
      await endBreak();
      await refreshToday();
    } catch (err) {
      alert('Error ending break: ' + err.message);
    } finally {
      setLoadingAction(false);
    }
  };

  const handleDeleteBreak = async (id) => {
    if (!confirm('Delete this break log?')) return;
    try {
      await deleteBreak(id);
      await refreshToday();
    } catch (err) {
      alert('Error deleting break: ' + err.message);
    }
  };

  const handleCustomBreakSubmit = async (e) => {
    e.preventDefault();
    if (!customBreakName.trim()) return;
    setShowCustomModal(false);
    await handleStartBreak('custom', customBreakName.trim());
    setCustomBreakName('');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Status Overview Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl shadow-black/20 p-6 relative overflow-hidden">
        {/* Subtle decorative background glow */}
        <div className={`absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl opacity-20 -mr-20 -mt-20 pointer-events-none transition-all duration-700 ${
          isOnBreak ? 'bg-amber-500' : isPunchedOut ? 'bg-slate-600' : isPunchedIn ? 'bg-indigo-500' : 'bg-blue-600'
        }`} />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Status info */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-sm text-slate-400 font-medium">
              <Clock className="w-4 h-4 text-slate-500" />
              <span>Today: {formatDate(todayData?.date || getTodayString())}</span>
              {todayData?.holiday_name && (
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-950/80 text-rose-300 border border-rose-800/80">
                  {todayData.holiday_name}
                </span>
              )}
            </div>

            <div className="flex items-center space-x-3">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                {!isPunchedIn ? (
                  <span>Ready to start work</span>
                ) : isPunchedOut ? (
                  <span>Shift Completed 🎉</span>
                ) : isOnBreak ? (
                  <span className="text-amber-400 flex items-center space-x-2">
                    {currentBreak?.break_type === 'lunch' ? <Utensils className="w-7 h-7" /> : <Coffee className="w-7 h-7" />}
                    <span>{currentBreak?.label || 'On Break'}</span>
                  </span>
                ) : (
                  <span className="text-indigo-400 flex items-center space-x-2">
                    <span className="relative flex h-3.5 w-3.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
                    </span>
                    <span>Working Actively</span>
                  </span>
                )}
              </h2>
            </div>

            {/* Shift Diff Hint */}
            {shiftDiffText && (
              <div className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-semibold ${
                shiftDiffText.type === 'early' 
                  ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/60' 
                  : 'bg-amber-950/60 text-amber-300 border border-amber-800/60'
              }`}>
                <Zap className="w-3.5 h-3.5" />
                <span>{shiftDiffText.message}</span>
              </div>
            )}
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            {!isPunchedIn ? (
              <button
                onClick={() => handleOpenPunchModal('in')}
                disabled={loadingAction}
                className="flex items-center space-x-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-base shadow-lg shadow-emerald-950/50 hover:shadow-xl transition-all disabled:opacity-50"
              >
                <Play className="w-5 h-5 fill-white" />
                <span>Punch In Now</span>
              </button>
            ) : isPunchedOut ? (
              <div className="flex items-center space-x-3">
                <div className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-sm font-semibold border border-slate-700">
                  Punched Out: {formatTime(todayData.punch_out)}
                </div>
                <button
                  onClick={() => handleOpenPunchModal('in')}
                  className="px-4 py-2 text-indigo-400 hover:bg-slate-800 rounded-xl text-sm font-semibold border border-indigo-500/40 transition-colors"
                >
                  Punch In Again
                </button>
              </div>
            ) : isOnBreak ? (
              /* If currently on break */
              <div className="flex items-center space-x-3">
                <button
                  onClick={handleEndBreak}
                  disabled={loadingAction}
                  className="flex items-center space-x-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-bold text-base shadow-lg shadow-amber-950/50 hover:shadow-xl transition-all disabled:opacity-50"
                >
                  <Square className="w-5 h-5 fill-white" />
                  <span>End Break (Resume Work)</span>
                </button>
                <button
                  onClick={() => handleOpenPunchModal('out')}
                  disabled={loadingAction}
                  className="flex items-center space-x-2 px-4 py-3.5 rounded-xl bg-rose-950/50 hover:bg-rose-900/60 text-rose-300 border border-rose-800/60 font-semibold text-sm transition-colors"
                >
                  <span>Punch Out</span>
                </button>
              </div>
            ) : (
              /* If currently working */
              <div className="flex flex-wrap items-center gap-2">
                {/* Tea Break button */}
                <button
                  onClick={() => handleStartBreak('tea', 'Tea Break')}
                  disabled={loadingAction}
                  className="flex items-center space-x-1.5 px-3.5 py-2.5 rounded-xl bg-amber-950/40 hover:bg-amber-900/50 text-amber-300 border border-amber-800/60 text-sm font-semibold transition-all shadow-sm"
                >
                  <Coffee className="w-4 h-4 text-amber-400" />
                  <span>Tea Break</span>
                </button>

                {/* Lunch Break button */}
                <button
                  onClick={() => handleStartBreak('lunch', 'Lunch Break')}
                  disabled={loadingAction}
                  className="flex items-center space-x-1.5 px-3.5 py-2.5 rounded-xl bg-orange-950/40 hover:bg-orange-900/50 text-orange-300 border border-orange-800/60 text-sm font-semibold transition-all shadow-sm"
                >
                  <Utensils className="w-4 h-4 text-orange-400" />
                  <span>Lunch Break</span>
                </button>

                {/* Custom Break button */}
                <button
                  onClick={() => setShowCustomModal(true)}
                  disabled={loadingAction}
                  className="flex items-center space-x-1 px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-sm font-medium transition-all"
                  title="Take custom break"
                >
                  <Plus className="w-4 h-4" />
                  <span>Break</span>
                </button>

                {/* Punch Out button */}
                <button
                  onClick={() => handleOpenPunchModal('out')}
                  disabled={loadingAction}
                  className="flex items-center space-x-1.5 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm shadow-md shadow-rose-950/50 hover:shadow-lg transition-all"
                >
                  <Square className="w-4 h-4 fill-white" />
                  <span>Punch Out</span>
                </button>
              </div>
            )}

            {/* Manual Edit Button */}
            <button
              onClick={() => onEditDay(todayData?.date || getTodayString())}
              className="p-3 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl border border-slate-800 transition-colors"
              title="Manually adjust punches or breaks"
            >
              <Edit3 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 3 Main Stat Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Net Working Hours */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-sm p-5 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Net Working Time</span>
            <div className="p-2 rounded-lg bg-indigo-950/60 text-indigo-400 border border-indigo-800/40">
              <Timer className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl sm:text-4xl font-extrabold font-mono text-white tracking-tight">
              {formatMinutes(currentNetMinutes)}
            </span>
            <span className="text-xs font-semibold text-slate-500">
              / {targetHours}h goal
            </span>
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between text-xs font-medium text-slate-400 mb-1.5">
              <span>Goal Progress</span>
              <span className={`font-bold ${isGoalReached ? 'text-emerald-400' : 'text-indigo-400'}`}>
                {progressPercent}%
              </span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${
                  isGoalReached 
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500' 
                    : 'bg-gradient-to-r from-indigo-500 to-indigo-600'
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          <div className="mt-3 text-xs text-slate-400 flex items-center justify-between">
            {isGoalReached ? (
              <span className="text-emerald-400 font-semibold flex items-center space-x-1">
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Target met! Overtime: +{formatMinutes(overtimeMinutes)}</span>
              </span>
            ) : (
              <span>Remaining: {formatMinutes(remainingMinutes)}</span>
            )}
          </div>
        </div>

        {/* Card 2: Break Time */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-sm p-5">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Breaks Taken</span>
            <div className="p-2 rounded-lg bg-amber-950/60 text-amber-400 border border-amber-800/40">
              <Coffee className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl sm:text-4xl font-extrabold font-mono text-white tracking-tight">
              {formatMinutes(currentBreakMinutes)}
            </span>
            <span className="text-xs font-semibold text-slate-500">
              ({todayData?.breaks?.length || 0} breaks)
            </span>
          </div>

          <div className="mt-4 flex items-center space-x-2 text-xs text-slate-400">
            {isOnBreak ? (
              <span className="inline-flex items-center space-x-1 text-amber-300 font-semibold bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/60">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping mr-1" />
                Currently on {currentBreak?.label || 'break'}
              </span>
            ) : (
              <span>Tea & Lunch breaks subtracted from gross time</span>
            )}
          </div>

          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>Punch In: <strong className="text-slate-200 font-mono">{formatTime(todayData?.punch_in)}</strong></span>
            <span>Punch Out: <strong className="text-slate-200 font-mono">{formatTime(todayData?.punch_out)}</strong></span>
          </div>
        </div>

        {/* Card 3: Expected Logout Smart Advisor */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-sm p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Expected Logout</span>
              <div className="p-2 rounded-lg bg-teal-950/60 text-teal-400 border border-teal-800/40">
                <Sparkles className="w-4 h-4" />
              </div>
            </div>

            {expectedLogoutTime ? (
              <div>
                <div className="text-3xl sm:text-4xl font-extrabold font-mono text-teal-400 tracking-tight">
                  {expectedLogoutTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  To achieve your {targetHours}h net working hours (adjusted for breaks)
                </p>
              </div>
            ) : isPunchedOut ? (
              <div>
                <div className="text-2xl font-bold text-slate-300">Done for the day</div>
                <p className="text-xs text-slate-400 mt-1">
                  Total net work today: <strong className="text-slate-200">{formatMinutes(currentNetMinutes)}</strong>
                </p>
              </div>
            ) : (
              <div>
                <div className="text-2xl font-bold text-slate-500">--:--</div>
                <p className="text-xs text-slate-500 mt-1">
                  Punch in to calculate your dynamic expected logout
                </p>
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 text-xs text-slate-500 flex items-center justify-between">
            <span>Standard: 11:00 AM - 8:00 PM</span>
            <span className="text-indigo-400 font-medium">Flexi Aware</span>
          </div>
        </div>
      </div>

      {/* Breaks History Timeline & Table for Today */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Coffee className="w-5 h-5 text-indigo-400" />
            <h3 className="font-bold text-white text-base">Today's Break Log</h3>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 bg-slate-800 text-slate-300 rounded-full border border-slate-700">
            {todayData?.breaks?.length || 0} {todayData?.breaks?.length === 1 ? 'break' : 'breaks'}
          </span>
        </div>

        {!todayData?.breaks || todayData.breaks.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-sm">
            <Coffee className="w-8 h-8 mx-auto mb-2 text-slate-600" />
            <p>No breaks recorded today yet.</p>
            <p className="text-xs text-slate-500 mt-1">Use "Tea Break" or "Lunch Break" buttons when taking pauses.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {todayData.breaks.map((b, idx) => {
              const isOngoing = !b.end_time;
              return (
                <div key={b.id || idx} className="py-3 flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-xl ${
                      b.break_type === 'lunch' 
                        ? 'bg-orange-950/60 text-orange-400 border border-orange-800/40' 
                        : b.break_type === 'tea' 
                        ? 'bg-amber-950/60 text-amber-400 border border-amber-800/40' 
                        : 'bg-indigo-950/60 text-indigo-400 border border-indigo-800/40'
                    }`}>
                      {b.break_type === 'lunch' ? <Utensils className="w-4 h-4" /> : <Coffee className="w-4 h-4" />}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-200 flex items-center space-x-2">
                        <span>{b.label || (b.break_type === 'lunch' ? 'Lunch Break' : 'Tea Break')}</span>
                        {isOngoing && (
                          <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-full bg-amber-950 text-amber-300 border border-amber-800">
                            Ongoing
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400 font-mono">
                        {formatTime(b.start_time)} &rarr; {isOngoing ? 'Now' : formatTime(b.end_time)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <span className="font-mono font-semibold text-slate-300">
                      {isOngoing 
                        ? `${Math.max(0, Math.floor((Date.now() - new Date(b.start_time).getTime()) / 60000))}m` 
                        : `${b.duration_minutes || 0}m`}
                    </span>
                    <button
                      onClick={() => handleDeleteBreak(b.id)}
                      className="text-slate-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
                      title="Delete break"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Security Code Confirmation Modal for Punch In & Punch Out */}
      {punchModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-800 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center space-x-3 mb-4">
              <div className={`p-2.5 rounded-xl border ${
                punchModal.type === 'in' 
                  ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/40' 
                  : 'bg-rose-950/60 text-rose-400 border-rose-800/40'
              }`}>
                {punchModal.type === 'in' ? <ShieldCheck className="w-6 h-6" /> : <ShieldAlert className="w-6 h-6" />}
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">
                  Confirm {punchModal.type === 'in' ? 'Punch In' : 'Punch Out'}
                </h3>
                <p className="text-xs text-slate-400">Security verification required</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 mb-3">
              To avoid accidental punches, please enter the confirmation code <code className="bg-slate-800 text-indigo-400 px-1.5 py-0.5 rounded font-mono font-bold">./admin</code>:
            </p>

            <form onSubmit={handleConfirmPunch} className="space-y-4">
              <div>
                <input
                  type="text"
                  required
                  placeholder="Enter ./admin"
                  value={punchCode}
                  onChange={(e) => {
                    setPunchCode(e.target.value);
                    if (punchError) setPunchError('');
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-800 text-white font-mono text-center tracking-wider focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  autoFocus
                />
                {punchError && (
                  <p className="text-xs text-rose-400 mt-2 text-center font-medium">
                    {punchError}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setPunchModal({ isOpen: false, type: null });
                    setPunchCode('');
                    setPunchError('');
                  }}
                  className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loadingAction}
                  className={`px-4 py-2 text-sm font-bold text-white rounded-xl shadow-md transition-all disabled:opacity-50 ${
                    punchModal.type === 'in'
                      ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-950/50'
                      : 'bg-rose-600 hover:bg-rose-500 shadow-rose-950/50'
                  }`}
                >
                  {loadingAction ? 'Processing...' : punchModal.type === 'in' ? 'Confirm Punch In' : 'Confirm Punch Out'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Break Modal */}
      {showCustomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-800">
            <h3 className="text-lg font-bold text-white mb-2">Custom Break</h3>
            <p className="text-xs text-slate-400 mb-4">Enter a label for this break (e.g. Coffee, Doctor visit, Walk, Snack).</p>
            <form onSubmit={handleCustomBreakSubmit} className="space-y-4">
              <input
                type="text"
                required
                placeholder="e.g. Afternoon Coffee"
                value={customBreakName}
                onChange={(e) => setCustomBreakName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-800 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                autoFocus
              />
              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCustomModal(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-md shadow-indigo-950/50"
                >
                  Start Break
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
