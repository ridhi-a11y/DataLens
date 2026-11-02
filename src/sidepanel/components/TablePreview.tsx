import React, { useState, useMemo } from 'react';
import {
  Eye,
  Copy,
  Check,
  Columns,
  ListOrdered,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import type { ExtractedTable } from '../../extraction/types.js';

interface TablePreviewProps {
  tables: ExtractedTable[];
  selectedTable: ExtractedTable | null;
  onSelectTable: (id: string) => void;
  onHighlight: (id: string) => void;
}

export const TablePreview: React.FC<TablePreviewProps> = ({
  tables,
  selectedTable,
  onSelectTable,
  onHighlight,
}) => {
  const [copied, setCopied] = useState(false);
  const [filterQuery, setFilterQuery] = useState('');
  const [pageSize, setPageSize] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);

  if (!selectedTable) return null;

  // Filter rows based on search query
  const filteredRows = useMemo(() => {
    if (!filterQuery.trim()) {
      return selectedTable.rows;
    }
    const q = filterQuery.toLowerCase();
    return selectedTable.rows.filter((row) =>
      row.some((cell) => cell.toLowerCase().includes(q))
    );
  }, [selectedTable, filterQuery]);

  // Calculate pagination boundaries
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);

  const startIndex = (safePage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filteredRows.length);
  const displayedRows = filteredRows.slice(startIndex, endIndex);

  const handleCopyCSV = () => {
    try {
      const escapeCell = (c: string) => `"${c.replace(/"/g, '""')}"`;
      const headerLine = selectedTable.headers.map(escapeCell).join(',');
      const rowLines = selectedTable.rows.map((row) => row.map(escapeCell).join(','));
      const csv = [headerLine, ...rowLines].join('\n');

      navigator.clipboard.writeText(csv);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy CSV:', err);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Table Selection Tabs (if multiple tables detected) */}
      {tables.length > 1 && (
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Select Detected Dataset ({tables.length})
          </label>
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
            {tables.map((table, idx) => {
              const isSelected = table.id === selectedTable.id;
              return (
                <button
                  key={table.id}
                  onClick={() => {
                    onSelectTable(table.id);
                    setCurrentPage(1);
                  }}
                  className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span className="font-semibold">#{idx + 1}</span>
                  <span className="max-w-[130px] truncate">{table.name}</span>
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                      isSelected ? 'bg-indigo-700/60 text-indigo-100' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {table.totalRows}r
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Table Preview Card */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
        {/* Card Header & Metadata */}
        <div className="border-b border-slate-100 p-3.5 bg-slate-50/50">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] rounded-md bg-indigo-50 border border-indigo-100 text-indigo-700 px-1.5 py-0.2 font-bold uppercase">
                  {selectedTable.sourceType || 'HTML'}
                </span>
                <h4 className="text-xs font-bold text-slate-900 leading-snug truncate max-w-[240px]">
                  {selectedTable.name}
                </h4>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {selectedTable.sourceDetails || `Dataset Index ${selectedTable.index + 1} on page`}
              </p>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onHighlight(selectedTable.id)}
                title="Highlight and scroll to this table on the web page"
                className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-600 hover:border-indigo-300 hover:text-indigo-600 transition-colors shadow-2xs cursor-pointer"
              >
                <Eye className="h-3 w-3" />
                <span>Locate</span>
              </button>

              <button
                type="button"
                onClick={handleCopyCSV}
                title="Copy entire table as CSV"
                className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-600 hover:border-indigo-300 hover:text-indigo-600 transition-colors shadow-2xs cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="h-3 w-3 text-emerald-600" />
                    <span className="text-emerald-600">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" />
                    <span>CSV</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px]">
            <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 font-medium text-slate-600">
              <ListOrdered className="h-3 w-3 text-slate-400" />
              {selectedTable.totalRows} Rows
            </span>
            <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 font-medium text-slate-600">
              <Columns className="h-3 w-3 text-slate-400" />
              {selectedTable.totalColumns} Columns
            </span>
            <span className="text-[10px] text-slate-400">
              {selectedTable.hasExplicitHeader ? 'Detected Headers' : 'Generated Headers'}
            </span>
          </div>
        </div>

        {/* Search inside table & Page Size */}
        <div className="border-b border-slate-100 px-3 py-2 bg-white flex items-center justify-between gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search table values..."
              value={filterQuery}
              onChange={(e) => {
                setFilterQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full rounded-lg border border-slate-200 pl-8 pr-3 py-1 text-[11px] text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center gap-1 text-[11px] text-slate-500">
            <span className="text-[10px] text-slate-400">Rows:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[11px] font-semibold text-slate-700 cursor-pointer"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>

        {/* Tabular Data Grid Preview */}
        <div className="max-h-[380px] overflow-auto scrollbar-thin">
          <table className="w-full border-collapse text-left text-[11px]">
            <thead className="sticky top-0 z-10 bg-slate-100/95 backdrop-blur-xs shadow-2xs">
              <tr>
                <th className="w-10 border-b border-slate-200 px-2.5 py-2 font-mono text-[10px] font-semibold text-slate-400 text-center">
                  #
                </th>
                {selectedTable.headers.map((header, hIdx) => (
                  <th
                    key={hIdx}
                    className="border-b border-slate-200 px-3 py-2 font-semibold text-slate-700 whitespace-nowrap min-w-[100px]"
                    title={header}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="truncate">{header || `Col ${hIdx + 1}`}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {displayedRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={selectedTable.headers.length + 1}
                    className="py-6 text-center text-xs text-slate-400"
                  >
                    No matching records found for "{filterQuery}"
                  </td>
                </tr>
              ) : (
                displayedRows.map((row, rIdx) => {
                  const globalRowIndex = startIndex + rIdx + 1;
                  return (
                    <tr
                      key={rIdx}
                      className="hover:bg-indigo-50/40 transition-colors odd:bg-slate-50/30"
                    >
                      <td className="w-10 px-2.5 py-1.5 font-mono text-[10px] text-slate-400 text-center select-none">
                        {globalRowIndex}
                      </td>
                      {row.map((cell, cIdx) => (
                        <td
                          key={cIdx}
                          className="px-3 py-1.5 text-slate-700 whitespace-nowrap max-w-[200px] truncate font-mono text-[10.5px]"
                          title={cell}
                        >
                          {cell || <span className="text-slate-300 italic">null</span>}
                        </td>
                      ))}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Navigation Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 px-3 py-2 bg-slate-50 text-[11px] text-slate-500">
          <span>
            Showing <strong>{filteredRows.length === 0 ? 0 : startIndex + 1}</strong>–<strong>{endIndex}</strong> of{' '}
            <strong>{filteredRows.length}</strong> {filteredRows.length === 1 ? 'row' : 'rows'}
            {selectedTable.totalRows > filteredRows.length && ' (filtered)'}
          </span>

          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setCurrentPage(1)}
              title="First page"
              className="rounded p-1 text-slate-500 hover:bg-slate-200 disabled:opacity-30 cursor-pointer"
            >
              <ChevronsLeft className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              title="Previous page"
              className="rounded p-1 text-slate-500 hover:bg-slate-200 disabled:opacity-30 cursor-pointer"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>

            <span className="px-1 text-[10px] font-semibold text-slate-700">
              Page {safePage} of {totalPages}
            </span>

            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              title="Next page"
              className="rounded p-1 text-slate-500 hover:bg-slate-200 disabled:opacity-30 cursor-pointer"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => setCurrentPage(totalPages)}
              title="Last page"
              className="rounded p-1 text-slate-500 hover:bg-slate-200 disabled:opacity-30 cursor-pointer"
            >
              <ChevronsRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
