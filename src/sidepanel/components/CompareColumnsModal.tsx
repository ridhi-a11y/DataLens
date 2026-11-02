import React, { useState } from 'react';
import { X, GitCompare, Download } from 'lucide-react';
import type { ExtractedTable } from '../../extraction/types.js';
import type { ColumnInfo } from '../../analysis/types.js';
import { getCleanedNumericalColumn } from '../../analysis/typeInference.js';
import { computeDescriptiveStats } from '../../analysis/statistics.js';
import { PlotlyChart } from './PlotlyChart.js';

interface CompareColumnsModalProps {
  isOpen: boolean;
  onClose: () => void;
  table: ExtractedTable;
  columns: ColumnInfo[];
}

export const CompareColumnsModal: React.FC<CompareColumnsModalProps> = ({
  isOpen,
  onClose,
  table,
  columns,
}) => {
  const numericalCols = columns.filter((c) => c.dataType === 'numerical');
  const [selectedColNames, setSelectedColNames] = useState<string[]>(
    numericalCols.slice(0, 3).map((c) => c.name)
  );

  if (!isOpen) return null;

  const toggleColumn = (name: string) => {
    if (selectedColNames.includes(name)) {
      if (selectedColNames.length > 2) {
        setSelectedColNames(selectedColNames.filter((c) => c !== name));
      }
    } else {
      setSelectedColNames([...selectedColNames, name]);
    }
  };

  // Compute stats for each selected column
  const comparisonData = selectedColNames.map((name) => {
    const colInfo = columns.find((c) => c.name === name);
    if (!colInfo) return null;
    const { valid, missing } = getCleanedNumericalColumn(table, colInfo.index);
    const stats = computeDescriptiveStats(valid, missing.length);
    return { name, stats };
  }).filter((c): c is { name: string; stats: ReturnType<typeof computeDescriptiveStats> } => c !== null);

  const metricRows = [
    { label: 'Count (N)', getVal: (s: typeof comparisonData[0]['stats']) => s.count },
    { label: 'Mean', getVal: (s: typeof comparisonData[0]['stats']) => s.mean ?? 'N/A' },
    { label: 'Median', getVal: (s: typeof comparisonData[0]['stats']) => s.median ?? 'N/A' },
    { label: 'Std Dev (s)', getVal: (s: typeof comparisonData[0]['stats']) => s.sampleStdDev ?? 'N/A' },
    { label: 'Variance (s²)', getVal: (s: typeof comparisonData[0]['stats']) => s.sampleVariance ?? 'N/A' },
    { label: 'Min', getVal: (s: typeof comparisonData[0]['stats']) => s.min ?? 'N/A' },
    { label: 'Q1 (25%)', getVal: (s: typeof comparisonData[0]['stats']) => s.q1 ?? 'N/A' },
    { label: 'Q3 (75%)', getVal: (s: typeof comparisonData[0]['stats']) => s.q3 ?? 'N/A' },
    { label: 'Max', getVal: (s: typeof comparisonData[0]['stats']) => s.max ?? 'N/A' },
    { label: 'IQR', getVal: (s: typeof comparisonData[0]['stats']) => s.iqr ?? 'N/A' },
    { label: 'Skewness', getVal: (s: typeof comparisonData[0]['stats']) => s.skewness ?? 'N/A' },
  ];

  const handleExportComparisonCSV = () => {
    const headers = ['Metric', ...comparisonData.map((c) => `"${c.name}"`)].join(',');
    const rows = metricRows.map((m) => {
      return [`"${m.label}"`, ...comparisonData.map((c) => `"${m.getVal(c.stats)}"` )].join(',');
    });
    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `DataLens-Comparison-${table.name || 'Dataset'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-3">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl bg-white shadow-xl border border-slate-200 overflow-hidden animate-in zoom-in-95">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 p-3.5 bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-indigo-600 text-white">
              <GitCompare className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900">Compare & Analyse Numerical Columns</h3>
              <p className="text-[10px] text-slate-500">Cross-column statistical comparison and grouped visualizer</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Column Selectors */}
        <div className="p-3 border-b border-slate-100">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5 block">
            Select Numerical Columns to Compare (select at least 2)
          </label>
          <div className="flex flex-wrap gap-1.5">
            {numericalCols.map((c) => {
              const isSelected = selectedColNames.includes(c.name);
              return (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => toggleColumn(c.name)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {c.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-3.5 space-y-3 scrollbar-thin">
          {/* Comparison Table */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
            <div className="flex items-center justify-between p-2.5 bg-slate-50 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-800">Statistical Comparison Matrix</span>
              <button
                type="button"
                onClick={handleExportComparisonCSV}
                className="flex items-center gap-1 text-[10px] font-medium text-indigo-600 hover:underline cursor-pointer"
              >
                <Download className="h-3 w-3" />
                <span>Export CSV</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-[11px]">
                <thead className="bg-slate-100/70 text-slate-700 font-semibold">
                  <tr>
                    <th className="px-3 py-1.5 border-b border-slate-200">Statistic</th>
                    {comparisonData.map((c) => (
                      <th key={c.name} className="px-3 py-1.5 border-b border-slate-200 font-bold text-indigo-900">
                        {c.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {metricRows.map((m, idx) => (
                    <tr key={idx} className="hover:bg-indigo-50/30 transition-colors">
                      <td className="px-3 py-1.5 font-medium text-slate-600 bg-slate-50/50">
                        {m.label}
                      </td>
                      {comparisonData.map((c) => (
                        <td key={c.name} className="px-3 py-1.5 font-mono text-slate-800">
                          {String(m.getVal(c.stats))}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Grouped Bar Chart comparing Means & Medians */}
          <div className="rounded-xl border border-slate-200 bg-white p-2">
            <PlotlyChart
              chartId="compare-chart"
              chartType="bar"
              data={[
                {
                  type: 'bar',
                  name: 'Mean',
                  x: comparisonData.map((c) => c.name),
                  y: comparisonData.map((c) => c.stats.mean ?? 0),
                  marker: { color: '#6366f1' },
                },
                {
                  type: 'bar',
                  name: 'Median',
                  x: comparisonData.map((c) => c.name),
                  y: comparisonData.map((c) => c.stats.median ?? 0),
                  marker: { color: '#8b5cf6' },
                },
              ]}
              layout={{
                title: 'Mean vs Median Comparison',
                barmode: 'group',
                xaxis: { automargin: true },
                yaxis: { title: 'Value', automargin: true },
              }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end border-t border-slate-100 p-3 bg-slate-50">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-800 px-4 py-1.5 text-xs font-medium text-white hover:bg-slate-700 cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
