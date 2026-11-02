import React, { useState, useEffect } from 'react';
import { Trash2, Download, Info, ChevronDown, ChevronUp } from 'lucide-react';
import type { AnalysisResult } from '../../analysis/types.js';
import { PlotlyChart } from './PlotlyChart.js';
import { exportResultsToCSV } from '../../analysis/exportUtils.js';

interface AnalysisResultCardProps {
  result: AnalysisResult;
  onRemove: (id: string) => void;
  onSelectRecords?: (info: { rowIndices: number[]; label: string; value?: string | number }) => void;
}

export const AnalysisResultCard: React.FC<AnalysisResultCardProps> = ({
  result,
  onRemove,
  onSelectRecords,
}) => {
  const [showDetails, setShowDetails] = useState<boolean>(false);
  const [chartData, setChartData] = useState(result.chart?.data || []);

  // Synchronize chart data immediately whenever a new analysis is executed
  useEffect(() => {
    setChartData(result.chart?.data || []);
  }, [result.id, result.chart?.data]);

  const getCategoryBadgeColor = (cat: string) => {
    switch (cat) {
      case 'DESCRIPTIVE':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'DISTRIBUTION':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'QUALITY':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'VISUALIZATION':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  // Interactive adjustments for histogram bins
  const handleBinCountChange = (bins: number) => {
    if (result.functionId === 'HISTOGRAM' && chartData[0]) {
      const updated = [
        {
          ...chartData[0],
          nbinsx: bins,
        },
      ];
      setChartData(updated);
    }
  };

  // Interactive sort for bar chart
  const handleSortChange = (ascending: boolean) => {
    if ((result.functionId === 'BAR_CHART' || result.functionId === 'HORIZONTAL_BAR_CHART') && chartData[0]) {
      const isH = result.functionId === 'HORIZONTAL_BAR_CHART';
      const catArray = [...((isH ? chartData[0].y : chartData[0].x) || [])] as string[];
      const valArray = [...((isH ? chartData[0].x : chartData[0].y) || [])] as number[];

      const combined = catArray.map((c, i) => ({ c, v: valArray[i] }));
      combined.sort((a, b) => (ascending ? a.v - b.v : b.v - a.v));

      const updated = [
        {
          ...chartData[0],
          x: isH ? combined.map((x) => x.v) : combined.map((x) => x.c),
          y: isH ? combined.map((x) => x.c) : combined.map((x) => x.v),
        },
      ];
      setChartData(updated);
    }
  };

  // Interactive color scale for heatmap
  const handleColorScaleChange = (scale: string) => {
    if (result.functionId === 'HEATMAP' && chartData[0]) {
      const updated = [
        {
          ...chartData[0],
          colorscale: scale,
        },
      ];
      setChartData(updated);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-xs transition-all hover:shadow-sm">
      {/* Card Header */}
      <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <span
              className={`rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider border ${getCategoryBadgeColor(
                result.category
              )}`}
            >
              {result.category}
            </span>
            <span className="text-[11px] font-medium text-slate-400">
              {new Date(result.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          <h3 className="text-xs font-bold text-slate-900 leading-snug">
            {result.functionLabel}
          </h3>
          <p className="text-[11px] text-slate-500">
            Column: <span className="font-semibold text-slate-700">{result.primaryColumn}</span>
            {result.secondaryColumn && (
              <span> vs <span className="font-semibold text-slate-700">{result.secondaryColumn}</span></span>
            )}
            <span className="ml-1 text-[10px] text-slate-400 font-mono">({result.primaryColumnType})</span>
          </p>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => exportResultsToCSV([result], result.datasetName)}
            title="Export result to CSV"
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onRemove(result.id)}
            title="Remove result"
            className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 cursor-pointer"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Primary Result Metric Highlight */}
      {result.primaryMetric && (
        <div className="my-2.5 rounded-xl bg-gradient-to-r from-slate-50 to-indigo-50/30 p-2.5 border border-slate-100">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            {result.primaryMetric.label}
          </div>
          <div className="flex items-baseline justify-between mt-0.5">
            <span className="text-base font-extrabold text-indigo-900 font-mono">
              {typeof result.primaryMetric.value === 'number'
                ? result.primaryMetric.value.toLocaleString()
                : String(result.primaryMetric.value)}
            </span>
            {result.primaryMetric.secondaryLabel && (
              <span className="text-[11px] font-medium text-slate-500">
                {result.primaryMetric.secondaryLabel}:{' '}
                <strong className="text-slate-700">{String(result.primaryMetric.secondaryValue)}</strong>
              </span>
            )}
          </div>
        </div>
      )}

      {/* Interactive Visualisation (if applicable) */}
      {result.chart && (
        <div className="my-2">
          <PlotlyChart
            key={result.id}
            chartId={result.id}
            data={chartData}
            layout={result.chart.layout}
            chartType={result.chart.chartType}
            onSelectRecords={onSelectRecords}
            showBinControl={result.functionId === 'HISTOGRAM'}
            onBinCountChange={handleBinCountChange}
            showSortControl={result.functionId === 'BAR_CHART' || result.functionId === 'HORIZONTAL_BAR_CHART'}
            onSortChange={handleSortChange}
            showColorScaleControl={result.functionId === 'HEATMAP'}
            onColorScaleChange={handleColorScaleChange}
          />
        </div>
      )}

      {/* Statistical Interpretation */}
      <div className="mt-2.5 rounded-xl bg-slate-50/80 p-2.5 border border-slate-100/80 text-[11px] text-slate-600 leading-relaxed">
        <div className="flex items-center gap-1 font-semibold text-slate-700 mb-0.5">
          <Info className="h-3 w-3 text-indigo-500 shrink-0" />
          <span>Interpretation</span>
        </div>
        <p>{result.interpretation}</p>
        {result.notes && result.notes.length > 0 && (
          <ul className="mt-1.5 space-y-0.5 text-[10px] text-slate-400 list-disc list-inside">
            {result.notes.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
        )}
      </div>

      {/* Detailed Breakdown Toggle */}
      {(result.stats || result.quality || (result.frequencies && result.frequencies.length > 0)) && (
        <div className="mt-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center gap-1 text-[10px] font-semibold text-slate-500 hover:text-indigo-600 cursor-pointer"
          >
            <span>{showDetails ? 'Hide Detailed Statistics' : 'Show Detailed Statistics'}</span>
            {showDetails ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>

          {showDetails && (
            <div className="mt-2 grid grid-cols-2 gap-1.5 text-[11px] bg-slate-50/60 p-2 rounded-lg border border-slate-100">
              {result.stats && (
                <>
                  <div><span className="text-slate-400">Mean:</span> <strong>{result.stats.mean ?? 'N/A'}</strong></div>
                  <div><span className="text-slate-400">Median:</span> <strong>{result.stats.median ?? 'N/A'}</strong></div>
                  <div><span className="text-slate-400">Min / Max:</span> <strong>{result.stats.min} / {result.stats.max}</strong></div>
                  <div><span className="text-slate-400">Std Dev (s):</span> <strong>{result.stats.sampleStdDev ?? 'N/A'}</strong></div>
                  <div><span className="text-slate-400">IQR (Q3-Q1):</span> <strong>{result.stats.iqr ?? 'N/A'}</strong></div>
                  <div><span className="text-slate-400">Skewness:</span> <strong>{result.stats.skewness ?? 'N/A'}</strong></div>
                </>
              )}
              {result.quality && (
                <>
                  <div><span className="text-slate-400">Missing:</span> <strong>{result.quality.missingCount} ({result.quality.missingPercentage}%)</strong></div>
                  <div><span className="text-slate-400">Unique:</span> <strong>{result.quality.uniqueCount}</strong></div>
                  <div><span className="text-slate-400">Duplicates:</span> <strong>{result.quality.duplicateCount}</strong></div>
                  <div><span className="text-slate-400">Outliers:</span> <strong>{result.quality.outliers?.count ?? 0}</strong></div>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
