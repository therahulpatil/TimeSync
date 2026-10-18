import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  BarChart2, 
  CalendarDays, 
  Palmtree, 
  Settings, 
  Download
} from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, onOpenSettings, onOpenExport }) {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const navItems = [
    { id: 'today', label: 'Today Tracker', icon: Clock },
    { id: 'weekly', label: 'Weekly Hours', icon: BarChart2 },
    { id: 'monthly', label: 'Monthly Calendar', icon: CalendarDays },
    { id: 'leaves', label: 'Leaves & Holidays', icon: Palmtree },
  ];

  return (
    <header className="bg-slate-900/90 border-b border-slate-800/80 sticky top-0 z-40 backdrop-blur-md shadow-lg shadow-black/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & App Brand */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <Clock className="w-5 h-5 animate-pulse-subtle" />
            </div>
            <div>
              <span className="font-bold text-xl text-white tracking-tight">TimeSync</span>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden md:flex items-center space-x-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-slate-800/90 text-indigo-400 font-semibold border border-slate-700/60 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-400' : 'text-slate-500'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Live Clock & Actions */}
          <div className="flex items-center space-x-3">
            {/* Live Clock badge */}
            <div className="hidden lg:flex flex-col items-end px-3 py-1 bg-slate-950/90 border border-slate-800 rounded-lg">
              <div className="font-mono text-sm font-semibold text-slate-200">
                {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
              </div>
              <div className="text-[11px] text-slate-400 font-medium">
                {currentTime.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
              </div>
            </div>

            {/* Export button */}
            <button
              onClick={onOpenExport}
              title="Export Report & Backup"
              className="p-2 text-slate-300 hover:text-indigo-400 hover:bg-slate-800 rounded-lg border border-slate-800 transition-colors"
            >
              <Download className="w-4 h-4" />
            </button>

            {/* Settings button */}
            <button
              onClick={onOpenSettings}
              title="Settings"
              className="p-2 text-slate-300 hover:text-indigo-400 hover:bg-slate-800 rounded-lg border border-slate-800 transition-colors"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mobile Navigation bar */}
        <div className="md:hidden flex items-center justify-around py-2 border-t border-slate-800/80 overflow-x-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex flex-col items-center py-1 px-2 text-xs font-medium ${
                  isActive ? 'text-indigo-400 font-bold' : 'text-slate-400'
                }`}
              >
                <Icon className="w-4 h-4 mb-1" />
                <span>{item.label.split(' ')[0]}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
}
