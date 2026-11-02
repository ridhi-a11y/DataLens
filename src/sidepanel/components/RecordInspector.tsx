import React from 'react';
import { X, Database, ListFilter } from 'lucide-react';
import type { ExtractedTable } from '../../extraction/types.js';

interface RecordInspectorProps {
  selection: {
    rowIndices: number[];
    label: string;
    value?: string | number;
  } | null;
  table: ExtractedTable;
  onClear: () => void;
  onHighlightTable?: (tableId: string) => void;
}

export const RecordInspector: React.FC<RecordInspectorProps> = ({
  selection,
  table,
  onClear,
}) => {
  if (!selection || selection.rowIndices.length === 0) return null;

  // Find corresponding rows in table
  const matchingRows = selection.rowIndices
    .map((origIdx) => {
      // Find row where table.rowIndices[i] === origIdx, or fallback to index origIdx
      let localIdx = table.rowIndices?.indexOf(origIdx) ?? -1;
      if (localIdx === -1 && origIdx < table.rows.length) {
        localIdx = origIdx;
      }
      return localIdx !== -1 ? { displayRow: origIdx + 1, data: table.rows[localIdx] } : null;
    })
    .filter((r): r is { displayRow: number; data: string[] } => r !== null);

  return (
    <div className="rounded-2xl border border-indigo-200 bg-indigo-50/40 p-3 shadow-sm transition-all animate-in fade-in slide-in-from-top-2">
      <div className="flex items-center justify-between pb-2 border-b border-indigo-100">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-600 text-white">
            <Database className="h-3.5 w-3.5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900">
              Inspected Records: <span className="text-indigo-700 font-semibold">{selection.label}</span>
            </h4>
            <p className="text-[10px] text-slate-500">
              {matchingRows.length} {matchingRows.length === 1 ? 'record' : 'records'} mapped from chart selection
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClear}
          className="rounded-lg p-1 text-slate-400 hover:bg-indigo-100 hover:text-slate-700 cursor-pointer"
          title="Close Inspector"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Matching Rows Table */}
      <div className="mt-2 max-h-40 overflow-auto rounded-xl border border-indigo-100 bg-white scrollbar-thin">
        <table className="w-full border-collapse text-left text-[11px]">
          <thead className="sticky top-0 bg-slate-100/90 text-slate-700 font-semibold shadow-2xs">
            <tr>
              <th className="w-12 px-2 py-1.5 text-center font-mono text-[10px] text-slate-400">
                Row #
              </th>
              {table.headers.map((h, i) => (
                <th key={i} className="px-2.5 py-1.5 truncate max-w-[120px]" title={h}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {matchingRows.length === 0 ? (
              <tr>
                <td colSpan={table.headers.length + 1} className="py-3 text-center text-slate-400">
                  <ListFilter className="mx-auto h-4 w-4 mb-1 opacity-50" />
                  No source row data mapped.
                </td>
              </tr>
            ) : (
              matchingRows.map((r, rIdx) => (
                <tr key={rIdx} className="hover:bg-indigo-50/60 transition-colors">
                  <td className="px-2 py-1.5 text-center font-mono text-[10px] font-bold text-indigo-600 bg-indigo-50/40">
                    #{r.displayRow}
                  </td>
                  {r.data.map((cell, cIdx) => (
                    <td key={cIdx} className="px-2.5 py-1.5 max-w-[140px] truncate text-slate-700" title={cell}>
                      {cell || <span className="text-slate-300 italic">null</span>}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
