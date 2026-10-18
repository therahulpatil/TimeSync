import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar, 
  Clock, 
  TrendingUp, 
  TrendingDown, 
  CheckCircle2, 
  Coffee, 
  AlertCircle, 
  Palmtree, 
  Edit3,
  CalendarCheck
} from 'lucide-react';
import { formatTime, formatMinutes, formatDate } from '../utils/timeUtils';
import { fetchWeeklyStats } from '../utils/api';

export default function WeeklyView({ onEditDay, refreshTrigger }) {
  const [weekData, setWeekData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentStartDate, setCurrentStartDate] = useState(() => {
    // Current week's Monday
    const now = new Date();
    const day = now.getDay();
    const diffToMon = (day === 0 ? -6 : 1) - day;
    const mon = new Date(now);
    mon.setDate(now.getDate() + diffToMon);
    return mon.toISOString().split('T')[0];
  });

  const loadWeek = async (startDate) => {
    try {
      setLoading(true);
      const data = await fetchWeeklyStats(startDate);
      setWeekData(data);
    } catch (err) {
      console.error('Error fetching weekly stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWeek(currentStartDate);
  }, [currentStartDate, refreshTrigger]);

  const handlePrevWeek = () => {
    const cur = new Date(currentStartDate + 'T00:00:00');
    cur.setDate(cur.getDate() - 7);
    setCurrentStartDate(cur.toISOString().split('T')[0]);
  };

  const handleNextWeek = () => {
    const cur = new Date(currentStartDate + 'T00:00:00');
    cur.setDate(cur.getDate() + 7);
    setCurrentStartDate(cur.toISOString().split('T')[0]);
  };

  const handleCurrentWeek = () => {
    const now = new Date();
    const day = now.getDay();
    const diffToMon = (day === 0 ? -6 : 1) - day;
    const mon = new Date(now);
    mon.setDate(now.getDate() + diffToMon);
    setCurrentStartDate(mon.toISOString().split('T')[0]);
  };

  const summary = weekData?.summary || {};
  const days = weekData?.days || [];
  const targetTotalHours = summary.total_target_hours || 40.0;
  const isOvertime = (summary.variance_minutes || 0) >= 0;

  const maxHoursInWeek = Math.max(10, ...days.map(d => d.net_hours || 0), (targetTotalHours / 5) + 2);

  return (
    <div className="space-y-6">
      {/* Top Header & Week Selector */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl shadow-black/20 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-indigo-400">
            <CalendarCheck className="w-4 h-4" />
            <span>Weekly Work Overview</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-white mt-0.5">
            {weekData ? `${formatDate(weekData.start_date)} - ${formatDate(weekData.end_date)}` : 'Weekly Tracking'}
          </h2>
        </div>

        {/* Navigation controls */}
        <div className="flex items-center space-x-2">
          <button
            onClick={handlePrevWeek}
            className="p-2 rounded-xl border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            title="Previous Week"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={handleCurrentWeek}
            className="px-3.5 py-2 text-xs font-bold rounded-xl border border-indigo-800/80 bg-indigo-950/60 text-indigo-400 hover:bg-indigo-900/60 transition-colors"
          >
            Current Week
          </button>
          <button
            onClick={handleNextWeek}
            className="p-2 rounded-xl border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            title="Next Week"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Working Hours */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Total Net Work</div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl sm:text-3xl font-extrabold font-mono text-white">
              {formatMinutes(summary.total_net_minutes || 0)}
            </span>
            <span className="text-xs font-semibold text-slate-500">
              / {targetTotalHours}h
            </span>
          </div>
          <div className="mt-3 w-full bg-slate-800 rounded-full h-2 overflow-hidden">
            <div 
              className="bg-indigo-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, summary.completion_percentage || 0)}%` }}
            />
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex justify-between">
            <span>Progress: {summary.completion_percentage || 0}%</span>
            <span>Target: {targetTotalHours}h</span>
          </div>
        </div>

        {/* Overtime / Under-time Balance */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Weekly Variance</div>
          <div className="flex items-baseline space-x-1">
            <span className={`text-2xl sm:text-3xl font-extrabold font-mono ${
              isOvertime ? 'text-emerald-400' : 'text-amber-400'
            }`}>
              {isOvertime ? '+' : ''}{formatMinutes(summary.variance_minutes || 0)}
            </span>
          </div>
          <div className="mt-3 flex items-center space-x-1.5 text-xs">
            {isOvertime ? (
              <span className="text-emerald-300 bg-emerald-950/60 px-2 py-0.5 rounded-md font-medium border border-emerald-800/60 flex items-center space-x-1">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Ahead of schedule</span>
              </span>
            ) : (
              <span className="text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded-md font-medium border border-amber-800/60 flex items-center space-x-1">
                <TrendingDown className="w-3.5 h-3.5" />
                <span>Under target</span>
              </span>
            )}
          </div>
        </div>

        {/* Days Present */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Days Present</div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl sm:text-3xl font-extrabold font-mono text-white">
              {summary.days_present || 0}
            </span>
            <span className="text-xs font-semibold text-slate-500">/ 5 workdays</span>
          </div>
          <div className="mt-3 text-xs text-slate-400">
            {summary.days_leave > 0 && <span className="text-purple-400 font-semibold">{summary.days_leave} leave </span>}
            {summary.days_holiday > 0 && <span className="text-blue-400 font-semibold">({summary.days_holiday} holiday)</span>}
            {summary.days_leave === 0 && summary.days_holiday === 0 && <span>No leaves taken this week</span>}
          </div>
        </div>

        {/* Daily Average */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Daily Average</div>
          <div className="flex items-baseline space-x-1">
            <span className="text-2xl sm:text-3xl font-extrabold font-mono text-white">
              {summary.avg_daily_hours ? `${summary.avg_daily_hours}h` : '0h'}
            </span>
            <span className="text-xs text-slate-500">/ active day</span>
          </div>
          <div className="mt-3 text-xs text-slate-400">
            Breaks: <strong className="text-slate-300">{formatMinutes(summary.total_break_minutes || 0)}</strong> total
          </div>
        </div>
      </div>

      {/* Visual Bar Chart: Daily Work Hours */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <Clock className="w-5 h-5 text-indigo-400" />
            <h3 className="font-bold text-white text-base">Daily Hours Chart (Mon - Sun)</h3>
          </div>
          <div className="flex items-center space-x-3 text-xs">
            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-3 rounded-sm bg-emerald-500 inline-block" />
              <span className="text-slate-400">&ge; 8h Goal</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-3 rounded-sm bg-indigo-500 inline-block" />
              <span className="text-slate-400">Under 8h</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-3 rounded-sm bg-purple-500 inline-block" />
              <span className="text-slate-400">Leave</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-3 rounded-sm bg-slate-800 inline-block" />
              <span className="text-slate-400">Off / Sun</span>
            </div>
          </div>
        </div>

        {/* Chart Bars */}
        <div className="grid grid-cols-7 gap-2 sm:gap-4 pt-4 pb-2 border-b border-slate-800">
          {days.map((day) => {
            const isTargetMet = day.net_hours >= (day.target_hours || 8.0) && day.net_hours > 0;
            const barHeightPercent = Math.min(100, (day.net_hours / maxHoursInWeek) * 100);
            const isSunday = day.day_of_week === 0;

            let barColor = 'bg-indigo-600';
            if (isTargetMet) barColor = 'bg-emerald-500';
            if (day.status === 'leave') barColor = 'bg-purple-500';
            if (isSunday || day.status === 'weekend') barColor = 'bg-slate-800';

            return (
              <div key={day.date} className="flex flex-col items-center">
                {/* Bar area */}
                <div className="w-full h-44 flex items-end justify-center relative group">
                  {/* Tooltip on hover */}
                  <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col items-center z-20 pointer-events-none">
                    <div className="bg-slate-950 border border-slate-800 text-white text-xs rounded-lg px-2.5 py-1.5 shadow-xl whitespace-nowrap">
                      <div className="font-bold">{day.day_name} ({day.date})</div>
                      <div>Net Work: {formatMinutes(day.net_minutes)}</div>
                      {day.break_minutes > 0 && <div>Breaks: {day.break_minutes}m</div>}
                      {day.status !== 'present' && <div className="capitalize text-slate-400">Status: {day.status}</div>}
                    </div>
                  </div>

                  {/* The bar */}
                  <div 
                    className={`w-full max-w-[48px] rounded-t-xl transition-all duration-500 relative flex items-center justify-center ${barColor}`}
                    style={{ height: `${Math.max(day.net_hours > 0 ? 12 : 4, barHeightPercent)}%` }}
                  >
                    {day.net_hours > 0 && (
                      <span className="text-[11px] font-mono font-bold text-white mb-1 rotate-0 sm:block hidden">
                        {day.net_hours}h
                      </span>
                    )}
                  </div>
                </div>

                {/* Day label below */}
                <div className="mt-2 text-center">
                  <div className={`text-xs font-bold ${isSunday ? 'text-rose-400' : 'text-slate-300'}`}>
                    {day.day_name.substring(0, 3)}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    {day.date.split('-')[2]}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detailed Day-by-Day Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="font-bold text-white text-base">Weekly Breakdown</h3>
          <span className="text-xs text-slate-400">Sunday is holiday | 5 days work schedule</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-950/80 text-slate-400 text-xs font-semibold uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-6 py-3">Day & Date</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Punch In</th>
                <th className="px-4 py-3">Punch Out</th>
                <th className="px-4 py-3">Breaks</th>
                <th className="px-4 py-3">Net Work</th>
                <th className="px-4 py-3">Variance</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {days.map((day) => {
                const isSunday = day.day_of_week === 0;
                const isOver = day.variance_minutes >= 0;

                return (
                  <tr key={day.date} className="hover:bg-slate-800/40 transition-colors">
                    {/* Day & Date */}
                    <td className="px-6 py-3.5">
                      <div className="font-bold text-white">{day.day_name}</div>
                      <div className="text-xs text-slate-400">{formatDate(day.date)}</div>
                    </td>

                    {/* Status badge */}
                    <td className="px-4 py-3.5">
                      {day.status === 'present' ? (
                        <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-950/70 text-emerald-300 border border-emerald-800/60">
                          Present
                        </span>
                      ) : day.status === 'half_day' ? (
                        <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-950/70 text-amber-300 border border-amber-800/60">
                          Half Day
                        </span>
                      ) : day.status === 'leave' ? (
                        <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-purple-950/70 text-purple-300 border border-purple-800/60">
                          {day.leave_type ? `${day.leave_type.toUpperCase()} Leave` : 'Leave'}
                        </span>
                      ) : day.status === 'holiday' ? (
                        <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-950/70 text-blue-300 border border-blue-800/60">
                          {day.holiday_name || 'Holiday'}
                        </span>
                      ) : isSunday ? (
                        <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-rose-950/70 text-rose-300 border border-rose-800/60">
                          Sunday Holiday
                        </span>
                      ) : day.status === 'weekend' ? (
                        <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-800 text-slate-400">
                          Saturday Off
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-800 text-slate-500">
                          Pending
                        </span>
                      )}
                    </td>

                    {/* Punch In */}
                    <td className="px-4 py-3.5 font-mono text-slate-300">
                      {formatTime(day.punch_in)}
                    </td>

                    {/* Punch Out */}
                    <td className="px-4 py-3.5 font-mono text-slate-300">
                      {formatTime(day.punch_out)}
                    </td>

                    {/* Breaks */}
                    <td className="px-4 py-3.5">
                      {day.break_minutes > 0 ? (
                        <span className="text-slate-300 font-medium">
                          {day.break_minutes}m <span className="text-slate-500 text-xs">({day.breaks?.length || 0})</span>
                        </span>
                      ) : (
                        <span className="text-slate-600">0m</span>
                      )}
                    </td>

                    {/* Net Work */}
                    <td className="px-4 py-3.5 font-mono font-bold text-white">
                      {formatMinutes(day.net_minutes)}
                    </td>

                    {/* Variance */}
                    <td className="px-4 py-3.5 font-mono text-xs font-semibold">
                      {day.is_working_day && day.status !== 'leave' && day.status !== 'holiday' ? (
                        <span className={isOver ? 'text-emerald-400' : 'text-amber-400'}>
                          {isOver ? '+' : ''}{formatMinutes(day.variance_minutes)}
                        </span>
                      ) : (
                        <span className="text-slate-600">--</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3.5 text-right">
                      <button
                        onClick={() => onEditDay(day.date)}
                        className="px-2.5 py-1.5 text-xs font-medium text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded-lg transition-colors border border-transparent hover:border-slate-700"
                        title="Edit day attendance"
                      >
                        <Edit3 className="w-3.5 h-3.5 inline mr-1" />
                        Edit
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
