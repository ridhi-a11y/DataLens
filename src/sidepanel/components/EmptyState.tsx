import React from 'react';
import { Table, Sparkles, Compass, Lightbulb } from 'lucide-react';

interface EmptyStateProps {
  hasScanned: boolean;
  onScan: () => void;
  isScanning: boolean;
  disabled: boolean;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  hasScanned,
  onScan,
  isScanning,
  disabled,
}) => {
  if (hasScanned) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center shadow-xs">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 mb-3">
          <Table className="h-6 w-6 opacity-80" />
        </div>
        <h4 className="text-xs font-semibold text-slate-800">No HTML Tables Detected</h4>
        <p className="mt-1 max-w-[240px] text-[11px] text-slate-500">
          This webpage doesn't contain any standard HTML &lt;table&gt; structures.
        </p>

        <div className="mt-4 w-full rounded-xl bg-slate-50 p-3 text-left">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-700">
            <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
            <span>Try testing on pages with tables:</span>
          </div>
          <ul className="mt-2 space-y-1 text-[11px] text-slate-500">
            <li>• Wikipedia list or comparison pages</li>
            <li>• Financial stock tables (e.g. Yahoo Finance)</li>
            <li>• GitHub release notes or benchmark tables</li>
            <li>• Government & open data portals</li>
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200/80 bg-white p-6 text-center shadow-xs">
      <div className="relative mb-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-50 to-violet-50 text-indigo-600">
          <Compass className="h-6 w-6" />
        </div>
        <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-violet-600 text-white">
          <Sparkles className="h-2.5 w-2.5" />
        </span>
      </div>

      <h4 className="text-xs font-bold text-slate-800">Automated Web Data Lens</h4>
      <p className="mt-1 max-w-[250px] text-[11px] text-slate-500 leading-relaxed">
        Click below to inspect the DOM of the active webpage and extract any HTML datasets for instant EDA.
      </p>

      <button
        onClick={onScan}
        disabled={disabled || isScanning}
        className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-[11px] font-medium text-white shadow-xs hover:bg-slate-800 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
      >
        <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
        <span>Inspect Active Tab</span>
      </button>

      <div className="mt-5 grid grid-cols-2 gap-2 w-full pt-4 border-t border-slate-100 text-left">
        <div className="rounded-lg bg-slate-50/70 p-2">
          <div className="text-[10px] font-semibold text-slate-700">Non-Intrusive</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Read-only DOM parsing</div>
        </div>
        <div className="rounded-lg bg-slate-50/70 p-2">
          <div className="text-[10px] font-semibold text-slate-700">Manifest V3</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Native Chrome Side Panel</div>
        </div>
      </div>
    </div>
  );
};
