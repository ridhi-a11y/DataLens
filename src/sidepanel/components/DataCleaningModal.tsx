import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Undo2,
  RotateCcw,
  Download,
  X,
  ChevronRight,
  ShieldCheck,
  FileCheck2,
} from 'lucide-react';
import type { ExtractedTable } from '../../extraction/types.js';
import type { ColumnInfo } from '../../analysis/types.js';
import { detectCleaningIssues, type CleaningIssue, type CleaningAction } from '../../cleaning/cleaningEngine.js';
import { exportTableToCsv, exportTableToExcel } from '../../analysis/exportUtils.js';

interface DataCleaningModalProps {
  originalTable: ExtractedTable;
  activeTable: ExtractedTable;
  columns: ColumnInfo[];
  onUpdateTable: (table: ExtractedTable) => void;
  onClose: () => void;
}

export const DataCleaningModal: React.FC<DataCleaningModalProps> = ({
  originalTable,
  activeTable,
  columns,
  onUpdateTable,
  onClose,
}) => {
  const [history, setHistory] = useState<ExtractedTable[]>([]);
  const [appliedCount, setAppliedCount] = useState<number>(0);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Detect issues based on the current active working table
  const issues = React.useMemo(() => {
    return detectCleaningIssues(activeTable, columns);
  }, [activeTable, columns]);

  const handleApplyAction = (_issue: CleaningIssue, action: CleaningAction) => {
    // Push current table to history stack for undo
    setHistory((prev) => [...prev, activeTable]);
    const cleaned = action.apply(activeTable);
    onUpdateTable(cleaned);
    setAppliedCount((c) => c + 1);
    setSuccessMessage(`Applied: ${action.label} (${activeTable.totalRows} → ${cleaned.totalRows} rows)`);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    setHistory((prev) => prev.slice(0, prev.length - 1));
    onUpdateTable(previous);
    setAppliedCount((c) => Math.max(0, c - 1));
    setSuccessMessage(`Undid last cleaning operation`);
    setTimeout(() => setSuccessMessage(null), 2500);
  };

  const handleResetToOriginal = () => {
    setHistory([]);
    onUpdateTable(originalTable);
    setAppliedCount(0);
    setSuccessMessage(`Reset to original extracted table`);
    setTimeout(() => setSuccessMessage(null), 2500);
  };

  const handleExportCleanedCsv = () => {
    exportTableToCsv(activeTable, `${activeTable.name}_cleaned.csv`);
  };

  const handleExportCleanedExcel = () => {
    exportTableToExcel(activeTable, `${activeTable.name}_cleaned.xlsx`);
  };

  const isModified = activeTable !== originalTable || history.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-3">
      <div className="flex h-[92vh] w-full max-w-lg flex-col rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900">Intelligent Data Cleaning Assistant</h3>
              <p className="text-[10px] text-slate-500">
                Non-destructive preview-and-confirm working dataset cleaning
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Working Copy Banner */}
        <div className="bg-indigo-50/60 px-4 py-2 border-b border-indigo-100/70 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-indigo-900 text-[11px]">
            <FileCheck2 className="h-3.5 w-3.5 text-indigo-600" />
            <span>
              Working Copy: <strong>{activeTable.totalRows}</strong> rows, <strong>{activeTable.totalColumns}</strong> cols
              {isModified && <span className="ml-1 text-emerald-700 font-bold">({appliedCount} fixes applied)</span>}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleUndo}
              disabled={history.length === 0}
              title="Undo last cleaning operation"
              className="flex items-center gap-1 rounded-md bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-700 border border-slate-200 shadow-2xs hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
            >
              <Undo2 className="h-3 w-3" />
              <span>Undo</span>
            </button>
            <button
              type="button"
              onClick={handleResetToOriginal}
              disabled={!isModified}
              title="Reset all modifications back to original"
              className="flex items-center gap-1 rounded-md bg-white px-2 py-0.5 text-[10px] font-semibold text-rose-600 border border-rose-200 shadow-2xs hover:bg-rose-50 disabled:opacity-40 cursor-pointer"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* Notification Alert */}
        {successMessage && (
          <div className="bg-emerald-50 px-4 py-1.5 border-b border-emerald-100 text-[11px] text-emerald-800 flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Body Issues List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
          {issues.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center text-slate-500">
              <CheckCircle2 className="h-10 w-10 text-emerald-500 mb-2" />
              <h4 className="text-xs font-bold text-slate-800">Clean Dataset</h4>
              <p className="text-[11px] text-slate-500 mt-1 max-w-xs">
                No critical data quality issues (missing values, duplicates, format inconsistencies, or extreme outliers) detected in the active dataset.
              </p>
            </div>
          ) : (
            issues.map((issue) => (
              <div
                key={issue.id}
                className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-2xs hover:border-slate-300 transition-all"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                    <h4 className="text-xs font-bold text-slate-800">{issue.title}</h4>
                  </div>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                    {issue.affectedCount} Affected
                  </span>
                </div>

                <p className="text-[11px] text-slate-600 mb-2.5 leading-relaxed">
                  {issue.description}
                </p>

                {issue.sampleValues.length > 0 && (
                  <div className="mb-3 rounded-xl bg-slate-50 p-2 text-[10px] text-slate-500 border border-slate-100 font-mono">
                    <span className="text-slate-400 block mb-0.5">Affected preview:</span>
                    {issue.sampleValues.join(' • ')}
                  </div>
                )}

                {/* Actions */}
                <div className="space-y-1.5 pt-1 border-t border-slate-100">
                  {issue.actions.map((act) => (
                    <button
                      key={act.id}
                      type="button"
                      onClick={() => handleApplyAction(issue, act)}
                      className="w-full flex items-center justify-between rounded-xl bg-slate-100/80 px-2.5 py-1.5 text-xs text-slate-800 hover:bg-indigo-600 hover:text-white transition-all group cursor-pointer"
                    >
                      <div className="text-left">
                        <span className="font-semibold block text-[11px]">{act.label}</span>
                        <span className="text-[10px] text-slate-500 group-hover:text-indigo-100 block">
                          {act.description}
                        </span>
                      </div>
                      <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer with Exports & Done */}
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/80 px-4 py-3">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleExportCleanedCsv}
              className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-slate-700 hover:bg-slate-100 shadow-2xs cursor-pointer"
            >
              <Download className="h-3 w-3 text-slate-500" />
              <span>Cleaned CSV</span>
            </button>
            <button
              type="button"
              onClick={handleExportCleanedExcel}
              className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-slate-700 hover:bg-slate-100 shadow-2xs cursor-pointer"
            >
              <Download className="h-3 w-3 text-emerald-600" />
              <span>Cleaned Excel</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500 cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
