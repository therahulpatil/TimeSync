import React, { useState, useEffect, useCallback } from 'react';
import Navbar from './components/Navbar';
import DailyTracker from './components/DailyTracker';
import WeeklyView from './components/WeeklyView';
import MonthlyCalendar from './components/MonthlyCalendar';
import LeavesManager from './components/LeavesManager';
import EditDayModal from './components/EditDayModal';
import SettingsModal from './components/SettingsModal';
import ExportModal from './components/ExportModal';
import { fetchToday, fetchSettings } from './utils/api';
import { getTodayString } from './utils/timeUtils';

export default function App() {
  const [activeTab, setActiveTab] = useState('today');
  const [todayData, setTodayData] = useState(null);
  const [settings, setSettings] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Modals state
  const [editingDate, setEditingDate] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [todayRes, settingsRes] = await Promise.all([
        fetchToday(getTodayString()),
        fetchSettings()
      ]);
      setTodayData(todayRes);
      setSettings(settingsRes);
    } catch (err) {
      console.error('Error fetching initial data:', err);
    }
  }, []);

  useEffect(() => {
    loadData();

    // Poll every 30 seconds to keep live counters updated
    const interval = setInterval(() => {
      loadData();
    }, 30000);

    return () => clearInterval(interval);
  }, [loadData, refreshKey]);

  const handleOpenEdit = (dateStr) => {
    setEditingDate(dateStr || getTodayString());
    setIsEditModalOpen(true);
  };

  const handleRefreshAll = () => {
    setRefreshKey((prev) => prev + 1);
    loadData();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-950 selection:text-indigo-200">
      {/* Navigation Header */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        onOpenExport={() => setIsExportModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {activeTab === 'today' && (
          <DailyTracker
            todayData={todayData}
            refreshToday={loadData}
            settings={settings}
            onEditDay={handleOpenEdit}
          />
        )}

        {activeTab === 'weekly' && (
          <WeeklyView
            onEditDay={handleOpenEdit}
            refreshTrigger={refreshKey}
          />
        )}

        {activeTab === 'monthly' && (
          <MonthlyCalendar
            onEditDay={handleOpenEdit}
            refreshTrigger={refreshKey}
          />
        )}

        {activeTab === 'leaves' && (
          <LeavesManager
            onRefresh={handleRefreshAll}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-900/60 py-4 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 flex justify-center items-center">
          <span>TimeSync by TheRahulPatil</span>
        </div>
      </footer>

      {/* Modals */}
      <EditDayModal
        date={editingDate}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSaveSuccess={handleRefreshAll}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        onSaveSuccess={handleRefreshAll}
      />

      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
      />
    </div>
  );
}
