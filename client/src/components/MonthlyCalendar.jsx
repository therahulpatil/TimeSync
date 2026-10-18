import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Clock, 
  CheckCircle, 
  Palmtree, 
  TrendingUp, 
  TrendingDown, 
  Coffee,
  AlertCircle
} from 'lucide-react';
import { formatMinutes, formatDate } from '../utils/timeUtils';
import { fetchMonthlyStats } from '../utils/api';

export default function MonthlyCalendar({ onEditDay, refreshTrigger }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [monthData, setMonthData] = useState(null);
  const [loading, setLoading] = useState(true);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1; // 1-12

  const loadMonth = async (y, m) => {
    try {
      setLoading(true);
      const data = await fetchMonthlyStats(y, m);
      setMonthData(data);
    } catch (err) {
      console.error('Error fetching monthly stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMonth(year, month);
  }, [year, month, refreshTrigger]);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 2, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month, 1));
  };

  const handleCurrentMonth = () => {
    setCurrentDate(new Date());
  };

  const summary = monthData?.summary || {};
  const days = monthData?.days || [];

  const monthName = currentDate.toLocaleString('default', { month: 'long' });

  const firstDayOfMonth = new Date(year, month - 1, 1).getDay(); // 0 is Sun, 1 is Mon
  const paddingDays = (firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1);

  const isOvertime = (summary.variance_minutes || 0) >= 0;

  return (
    <div className="space-y-6">
      {/* Month Navigation Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl shadow-black/20 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-indigo-400">
            <CalendarIcon className="w-4 h-4" />
            <span>Monthly Overview & Calendar</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-white mt-0.5">
            {monthName} {year}
          </h2>
        </div>

        {/* Controls */}
        <div className="flex items-center space-x-2">
          <button
            onClick={handlePrevMonth}
            className="p-2 rounded-xl border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            title="Previous Month"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={handleCurrentMonth}
            className="px-3.5 py-2 text-xs font-bold rounded-xl border border-indigo-800/80 bg-indigo-950/60 text-indigo-400 hover:bg-indigo-900/60 transition-colors"
          >
            This Month
          </button>
          <button
            onClick={handleNextMonth}
            className="p-2 rounded-xl border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            title="Next Month"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Monthly KPI Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Net Hours Worked */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Total Net Work</div>
          <div className="text-2xl font-extrabold font-mono text-white">
            {formatMinutes(summary.total_net_minutes || 0)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Target: <strong>{summary.total_target_hours || 0}h</strong>
          </div>
        </div>

        {/* Overtime / Under-time Balance */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Monthly Variance</div>
          <div className={`text-2xl font-extrabold font-mono ${isOvertime ? 'text-emerald-400' : 'text-amber-400'}`}>
            {isOvertime ? '+' : ''}{formatMinutes(summary.variance_minutes || 0)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {isOvertime ? 'Overtime accrued' : 'Below target'}
          </div>
        </div>

        {/* Days Present */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Days Present</div>
          <div className="text-2xl font-extrabold font-mono text-white">
            {summary.present_days || 0}
            <span className="text-xs font-normal text-slate-500 ml-1">/ {summary.total_working_days || 0} workdays</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Avg: <strong>{summary.avg_daily_hours || 0}h</strong> / day
          </div>
        </div>

        {/* Leaves Count */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Leaves Taken</div>
          <div className="text-2xl font-extrabold font-mono text-purple-400">
            {summary.leave_days || 0}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Holidays: <strong>{summary.holidays_count || 0}</strong> (incl. Sun)
          </div>
        </div>

        {/* Attendance Rate */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm col-span-2 lg:col-span-1">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Attendance Rate</div>
          <div className="text-2xl font-extrabold font-mono text-indigo-400">
            {summary.attendance_rate || 0}%
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Breaks: {summary.total_break_hours || 0}h
          </div>
        </div>
      </div>

      {/* Calendar Grid Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-sm p-4 sm:p-6">
        {/* Day-of-week Headers (Monday to Sunday) */}
        <div className="grid grid-cols-7 gap-2 mb-3 text-center text-xs font-bold uppercase tracking-wider">
          <div className="py-2 text-slate-400">Mon</div>
          <div className="py-2 text-slate-400">Tue</div>
          <div className="py-2 text-slate-400">Wed</div>
          <div className="py-2 text-slate-400">Thu</div>
          <div className="py-2 text-slate-400">Fri</div>
          <div className="py-2 text-slate-500">Sat</div>
          <div className="py-2 text-rose-400 font-extrabold">Sun (Holiday)</div>
        </div>

        {/* Calendar Cells */}
        <div className="grid grid-cols-7 gap-2">
          {/* Empty padding slots before first day */}
          {Array.from({ length: paddingDays }).map((_, idx) => (
            <div key={`pad-${idx}`} className="h-24 sm:h-28 rounded-xl bg-slate-950/40 border border-slate-800/40" />
          ))}

          {/* Day slots */}
          {days.map((day) => {
            const isSunday = day.day_of_week === 0;
            const isSaturday = day.day_of_week === 6;
            const isToday = day.date === new Date().toISOString().split('T')[0];

            let cellBg = 'bg-slate-950/80 border-slate-800/90 hover:border-slate-700';
            if (day.status === 'present') cellBg = 'bg-emerald-950/30 border-emerald-900/50 hover:border-emerald-700/70';
            else if (day.status === 'half_day') cellBg = 'bg-amber-950/30 border-amber-900/50 hover:border-amber-700/70';
            else if (day.status === 'leave') cellBg = 'bg-purple-950/30 border-purple-900/50 hover:border-purple-700/70';
            else if (day.status === 'holiday') cellBg = 'bg-blue-950/30 border-blue-900/50 hover:border-blue-700/70';
            else if (isSunday) cellBg = 'bg-rose-950/20 border-rose-900/40 hover:border-rose-800/60';
            else if (isSaturday) cellBg = 'bg-slate-950/50 border-slate-900';

            return (
              <div
                key={day.date}
                onClick={() => onEditDay(day.date)}
                className={`h-24 sm:h-28 rounded-xl border p-2 flex flex-col justify-between cursor-pointer transition-all ${cellBg} ${
                  isToday ? 'ring-2 ring-indigo-500 shadow-lg shadow-indigo-950/50' : 'shadow-xs'
                }`}
              >
                {/* Header: Date Number & Badge */}
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold ${
                    isToday 
                      ? 'w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold' 
                      : isSunday 
                      ? 'text-rose-400' 
                      : 'text-slate-200'
                  }`}>
                    {day.day_number}
                  </span>

                  {day.breaks_count > 0 && (
                    <span className="flex items-center space-x-0.5 text-[10px] text-amber-300 bg-amber-950/80 px-1 rounded border border-amber-800/60" title={`${day.break_minutes}m breaks`}>
                      <Coffee className="w-2.5 h-2.5" />
                      <span>{day.breaks_count}</span>
                    </span>
                  )}
                </div>

                {/* Body Content */}
                <div className="my-auto">
                  {day.status === 'present' ? (
                    <div>
                      <div className="text-xs sm:text-sm font-extrabold font-mono text-emerald-300">
                        {formatMinutes(day.net_minutes)}
                      </div>
                      <div className="text-[10px] text-emerald-500 hidden sm:block">
                        Present
                      </div>
                    </div>
                  ) : day.status === 'half_day' ? (
                    <div>
                      <div className="text-xs sm:text-sm font-extrabold font-mono text-amber-300">
                        {formatMinutes(day.net_minutes)}
                      </div>
                      <div className="text-[10px] text-amber-500 font-semibold">Half Day</div>
                    </div>
                  ) : day.status === 'leave' ? (
                    <div className="text-[11px] font-bold text-purple-300 bg-purple-950/80 border border-purple-800/60 rounded px-1 py-0.5 inline-block">
                      {day.leave_type ? `${day.leave_type.toUpperCase()}` : 'Leave'}
                    </div>
                  ) : day.status === 'holiday' ? (
                    <div className="text-[10px] font-bold text-blue-300 truncate" title={day.holiday_name}>
                      {day.holiday_name || 'Holiday'}
                    </div>
                  ) : isSunday ? (
                    <div className="text-[10px] font-semibold text-rose-400">
                      Sunday Off
                    </div>
                  ) : isSaturday ? (
                    <div className="text-[10px] text-slate-500">
                      Saturday Off
                    </div>
                  ) : (
                    <div className="text-[10px] text-slate-600">
                      --
                    </div>
                  )}
                </div>

                {/* Footer hint */}
                <div className="text-[9px] text-slate-500 truncate text-right">
                  {isToday ? 'Today' : ''}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
