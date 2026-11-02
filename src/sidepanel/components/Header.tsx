import React from 'react';
import { Sparkles, RefreshCw } from 'lucide-react';
import type { ActiveTabInfo } from '../hooks/useActiveTab.js';

interface HeaderProps {
  tabInfo: ActiveTabInfo;
  onRefresh: () => void;
  isScanning: boolean;
}

export const Header: React.FC<HeaderProps> = ({ tabInfo, onRefresh, isScanning }) => {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200/80 bg-white/95 px-4 py-3 backdrop-blur-md">
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 text-white shadow-sm shadow-indigo-500/20">
          <Sparkles className="h-4 w-4" />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <h1 className="text-sm font-semibold tracking-tight text-slate-900">DataLens</h1>
            <span className="rounded-full bg-indigo-50 px-1.5 py-0.5 text-[10px] font-medium text-indigo-600">
              EDA
            </span>
          </div>
          <p className="text-[11px] text-slate-500">Automated Data Inspector</p>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <div
          className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
            tabInfo.isScannable
              ? 'bg-emerald-50 text-emerald-700'
              : 'bg-amber-50 text-amber-700'
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              tabInfo.isScannable ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
            }`}
          />
          {tabInfo.isScannable ? 'Ready' : 'System Page'}
        </div>

        <button
          onClick={onRefresh}
          disabled={isScanning}
          title="Refresh active tab connection"
          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isScanning ? 'animate-spin' : ''}`} />
        </button>
      </div>
    </header>
  );
};
