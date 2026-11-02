import React, { useEffect, useRef, useState } from 'react';
import Plotly from 'plotly.js-dist-min';
import { Camera, RefreshCw, ZoomIn, ZoomOut } from 'lucide-react';
import type { ChartDataSeries } from '../../analysis/types.js';

interface PlotlyChartProps {
  chartId: string;
  data: ChartDataSeries[];
  layout: Record<string, unknown>;
  chartType: string;
  onSelectRecords?: (info: { rowIndices: number[]; label: string; value?: string | number }) => void;
  // Controls for interactive adjustments
  showBinControl?: boolean;
  onBinCountChange?: (bins: number) => void;
  showSortControl?: boolean;
  onSortChange?: (ascending: boolean) => void;
  showColorScaleControl?: boolean;
  onColorScaleChange?: (scale: string) => void;
}

export const PlotlyChart: React.FC<PlotlyChartProps> = ({
  chartId,
  data,
  layout,
  chartType,
  onSelectRecords,
  showBinControl,
  onBinCountChange,
  showSortControl,
  onSortChange,
  showColorScaleControl,
  onColorScaleChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [binCount, setBinCount] = useState<number>(10);
  const [colorScale, setColorScale] = useState<string>('Blues');
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Side panel responsive styling with ample margins for axes, scale ticks, and legends
    const mergedLayout = {
      autosize: true,
      height: 330,
      margin: { l: 80, r: 30, t: 55, b: 65, pad: 4 },
      paper_bgcolor: 'transparent',
      plot_bgcolor: 'transparent',
      font: {
        family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        size: 10,
        color: '#475569',
      },
      showlegend: true,
      legend: {
        orientation: 'h',
        x: 0,
        y: 1.15,
        font: { size: 10, color: '#475569' },
        bgcolor: 'rgba(255, 255, 255, 0.8)',
        bordercolor: '#e2e8f0',
        borderwidth: 1,
      },
      hoverlabel: {
        bgcolor: '#0f172a',
        font: { color: '#ffffff', size: 11, family: 'sans-serif' },
      },
      ...layout,
    };

    const config = {
      responsive: true,
      displayModeBar: false,
    };

    // Purge any lingering DOM traces from previous plots before rendering new chart
    Plotly.purge(el);

    Plotly.newPlot(
      el,
      data as unknown as Plotly.Data[],
      mergedLayout as unknown as Partial<Plotly.Layout>,
      config as unknown as Partial<Plotly.Config>
    ).then(() => {
      // Event listeners for graph-to-data interaction
      const plotEl = el as unknown as {
        on: (event: string, callback: (eventData: { points?: Array<{ customdata?: unknown; pointIndex?: number; label?: string; x?: string | number; y?: string | number }> }) => void) => void;
      };

      if (plotEl && plotEl.on && onSelectRecords) {
        plotEl.on('plotly_click', (eventData) => {
          if (!eventData?.points?.length) return;
          const pt = eventData.points[0];

          let rowIndices: number[] = [];
          if (typeof pt.customdata === 'number') {
            rowIndices = [pt.customdata];
          } else if (Array.isArray(pt.customdata)) {
            rowIndices = pt.customdata.filter((c): c is number => typeof c === 'number');
          } else if (typeof pt.pointIndex === 'number') {
            rowIndices = [pt.pointIndex];
          }

          const label = String(pt.label ?? pt.x ?? `Point #${pt.pointIndex ?? 0}`);
          const value = pt.y ?? pt.x;

          onSelectRecords({ rowIndices, label, value });
        });
      }
    });

    const resizeObserver = new ResizeObserver(() => {
      Plotly.Plots.resize(el);
    });
    resizeObserver.observe(el);

    return () => {
      resizeObserver.disconnect();
      Plotly.purge(el);
    };
  }, [data, layout, onSelectRecords]);

  // Mode bar helpers
  const handleDownloadPNG = () => {
    if (containerRef.current) {
      Plotly.downloadImage(containerRef.current, {
        format: 'png',
        filename: `DataLens-${chartId}`,
        width: 800,
        height: 500,
      });
    }
  };

  const handleReset = () => {
    if (containerRef.current) {
      Plotly.relayout(containerRef.current, {
        'xaxis.autorange': true,
        'yaxis.autorange': true,
      });
    }
  };

  const handleZoom = (factor: number) => {
    if (containerRef.current) {
      const graphDiv = containerRef.current as unknown as {
        layout?: { xaxis?: { range?: [number, number] }; yaxis?: { range?: [number, number] } };
      };
      const xr = graphDiv.layout?.xaxis?.range;
      const yr = graphDiv.layout?.yaxis?.range;
      if (xr && typeof xr[0] === 'number') {
        const xSpan = (xr[1] - xr[0]) * factor;
        const xCenter = (xr[0] + xr[1]) / 2;
        Plotly.relayout(containerRef.current, {
          'xaxis.range': [xCenter - xSpan / 2, xCenter + xSpan / 2],
        });
      } else if (yr && typeof yr[0] === 'number') {
        const ySpan = (yr[1] - yr[0]) * factor;
        const yCenter = (yr[0] + yr[1]) / 2;
        Plotly.relayout(containerRef.current, {
          'yaxis.range': [yCenter - ySpan / 2, yCenter + ySpan / 2],
        });
      }
    }
  };

  return (
    <div className="flex flex-col rounded-xl bg-slate-50/70 p-2.5 border border-slate-100">
      {/* Mini Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-1.5 pb-1 border-b border-slate-200/60 mb-1">
        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
          {chartType.replace(/-/g, ' ').toUpperCase()}
        </span>

        {/* Dynamic Controls depending on chart type */}
        <div className="flex items-center gap-1">
          {/* Histogram Bins */}
          {showBinControl && (
            <div className="flex items-center gap-1 bg-white px-1.5 py-0.5 rounded border border-slate-200 text-[10px]">
              <span className="text-slate-400">Bins:</span>
              <button
                type="button"
                onClick={() => {
                  const nb = Math.max(5, binCount - 5);
                  setBinCount(nb);
                  onBinCountChange?.(nb);
                }}
                className="px-1 font-bold hover:text-indigo-600 cursor-pointer"
              >
                -
              </button>
              <span className="font-semibold text-slate-700">{binCount}</span>
              <button
                type="button"
                onClick={() => {
                  const nb = Math.min(50, binCount + 5);
                  setBinCount(nb);
                  onBinCountChange?.(nb);
                }}
                className="px-1 font-bold hover:text-indigo-600 cursor-pointer"
              >
                +
              </button>
            </div>
          )}

          {/* Bar Chart Sort */}
          {showSortControl && (
            <button
              type="button"
              onClick={() => {
                const next = !sortAsc;
                setSortAsc(next);
                onSortChange?.(next);
              }}
              className="rounded bg-white px-1.5 py-0.5 border border-slate-200 text-[10px] font-medium text-slate-600 hover:text-indigo-600 cursor-pointer"
            >
              Sort: {sortAsc ? 'Asc ↑' : 'Desc ↓'}
            </button>
          )}

          {/* Heatmap Colorscale */}
          {showColorScaleControl && (
            <select
              value={colorScale}
              onChange={(e) => {
                setColorScale(e.target.value);
                onColorScaleChange?.(e.target.value);
              }}
              className="rounded bg-white px-1.5 py-0.5 border border-slate-200 text-[10px] text-slate-600 focus:outline-none cursor-pointer"
            >
              <option value="Blues">Blues</option>
              <option value="Viridis">Viridis</option>
              <option value="RdBu">RdBu</option>
              <option value="Magma">Magma</option>
            </select>
          )}

          {/* Standard Navigation Tools */}
          <button
            type="button"
            onClick={() => handleZoom(0.8)}
            title="Zoom In"
            className="rounded p-1 text-slate-400 hover:bg-white hover:text-slate-700 cursor-pointer"
          >
            <ZoomIn className="h-3 w-3" />
          </button>
          <button
            type="button"
            onClick={() => handleZoom(1.25)}
            title="Zoom Out"
            className="rounded p-1 text-slate-400 hover:bg-white hover:text-slate-700 cursor-pointer"
          >
            <ZoomOut className="h-3 w-3" />
          </button>
          <button
            type="button"
            onClick={handleReset}
            title="Reset View"
            className="rounded p-1 text-slate-400 hover:bg-white hover:text-slate-700 cursor-pointer"
          >
            <RefreshCw className="h-3 w-3" />
          </button>
          <button
            type="button"
            onClick={handleDownloadPNG}
            title="Download Graph PNG"
            className="rounded p-1 text-slate-400 hover:bg-white hover:text-indigo-600 cursor-pointer"
          >
            <Camera className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Plotly Canvas Container */}
      <div ref={containerRef} className="w-full min-h-[330px]" />

      <p className="text-[10px] text-slate-400 italic text-center pt-1">
        💡 Tip: Click any bar, outlier, slice or point to inspect the original table records.
      </p>
    </div>
  );
};
