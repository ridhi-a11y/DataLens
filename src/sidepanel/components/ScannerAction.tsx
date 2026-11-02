import React, { useRef } from 'react';
import { Search, Loader2, Table2, Layers, Upload, FileSpreadsheet, RefreshCw } from 'lucide-react';
import type { ExtractionMetadata } from '../../extraction/types.js';

interface ScannerActionProps {
  isScanning: boolean;
  onScan: () => void;
  disabled: boolean;
  metadata: ExtractionMetadata | null;
  tableCount: number;
  hasScanned: boolean;
  hasDynamicUpdates?: boolean;
  onImportFile?: (file: File) => Promise<unknown>;
}

export const ScannerAction: React.FC<ScannerActionProps> = ({
  isScanning,
  onScan,
  disabled,
  metadata,
  tableCount,
  hasScanned,
  hasDynamicUpdates,
  onImportFile,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onImportFile) {
      onImportFile(file).catch(console.error);
    }
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-xs font-semibold text-slate-900">Dataset Detection & Import</h3>
          <p className="text-[11px] text-slate-500">
            Scan DOM tables, dynamic content, or upload CSV / JSON
          </p>
        </div>

        {hasScanned && (
          <div className="flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-1 border border-indigo-100">
            <Table2 className="h-3.5 w-3.5 text-indigo-600" />
            <span className="text-xs font-semibold text-indigo-700">
              {tableCount} {tableCount === 1 ? 'Dataset' : 'Datasets'}
            </span>
          </div>
        )}
      </div>

      {/* Dynamic DOM Update Alert */}
      {hasDynamicUpdates && (
        <div className="mb-3 flex items-center justify-between rounded-xl bg-amber-50 p-2.5 border border-amber-200 text-xs text-amber-900 animate-pulse">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4 text-amber-600 animate-spin" />
            <span className="font-medium text-[11px]">New dynamic tables detected on page</span>
          </div>
          <button
            type="button"
            onClick={onScan}
            className="rounded-lg bg-amber-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-amber-700 cursor-pointer shadow-2xs"
          >
            Re-scan
          </button>
        </div>
      )}

      <div className="grid grid-cols-3 gap-2">
        {/* Main Scan Button */}
        <button
          type="button"
          onClick={onScan}
          disabled={disabled || isScanning}
          className="col-span-2 group relative flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-3 py-2.5 text-xs font-medium text-white shadow-sm shadow-indigo-500/25 transition-all hover:from-indigo-500 hover:to-violet-500 active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
        >
          {isScanning ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin text-white/90" />
              <span>Scanning Page...</span>
            </>
          ) : (
            <>
              <Search className="h-4 w-4 text-white/90 group-hover:scale-110 transition-transform" />
              <span>{hasScanned ? 'Re-scan Page' : 'Scan Page'}</span>
            </>
          )}
        </button>

        {/* Upload CSV / JSON Button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          title="Upload local .csv or .json dataset"
          className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300 px-2 py-2.5 text-xs font-medium text-slate-700 transition-all cursor-pointer shadow-2xs"
        >
          <Upload className="h-3.5 w-3.5 text-slate-600" />
          <span>Upload File</span>
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.tsv,.json,application/json,text/csv"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {hasScanned && metadata && (
        <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3">
          <div className="flex items-center gap-2 rounded-xl bg-slate-50 p-2">
            <Layers className="h-3.5 w-3.5 text-slate-500" />
            <div className="min-w-0">
              <span className="block text-[10px] text-slate-500">Datasets Loaded</span>
              <span className="text-xs font-bold text-slate-800">{tableCount}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-slate-50 p-2">
            <FileSpreadsheet className="h-3.5 w-3.5 text-slate-500" />
            <div className="min-w-0">
              <span className="block text-[10px] text-slate-500">Total Cells</span>
              <span className="text-xs font-bold text-slate-800">
                {metadata.totalCells.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
