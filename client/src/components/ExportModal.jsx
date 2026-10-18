import React from 'react';
import { X, Download, FileSpreadsheet, Database } from 'lucide-react';

export default function ExportModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const handleExportCsv = () => {
    window.open('/api/settings/export/csv', '_blank');
  };

  const handleExportJson = () => {
    window.open('/api/settings/backup/json', '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-slate-900 rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-800">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-xl bg-indigo-950/60 text-indigo-400 border border-indigo-800/40">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-white">Export & Backup</h3>
              <p className="text-xs text-slate-400">Download your attendance data</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-5 space-y-3">
          {/* CSV Export */}
          <button
            onClick={handleExportCsv}
            className="w-full flex items-center justify-between p-4 rounded-xl border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-800/60 transition-all text-left group"
          >
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-xl bg-emerald-950/60 text-emerald-400 border border-emerald-800/40 group-hover:scale-105 transition-transform">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-white text-sm">Download CSV Report</div>
                <div className="text-xs text-slate-400">Spreadsheet with all daily punches & net hours</div>
              </div>
            </div>
            <Download className="w-4 h-4 text-slate-500 group-hover:text-indigo-400" />
          </button>

          {/* JSON Backup */}
          <button
            onClick={handleExportJson}
            className="w-full flex items-center justify-between p-4 rounded-xl border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-800/60 transition-all text-left group"
          >
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-xl bg-blue-950/60 text-blue-400 border border-blue-800/40 group-hover:scale-105 transition-transform">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-white text-sm">Full Database JSON</div>
                <div className="text-xs text-slate-400">Complete raw backup of settings, breaks & logs</div>
              </div>
            </div>
            <Download className="w-4 h-4 text-slate-500 group-hover:text-indigo-400" />
          </button>
        </div>

        <div className="mt-6 pt-3 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
