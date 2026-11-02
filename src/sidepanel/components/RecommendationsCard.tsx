import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Play, Compass } from 'lucide-react';
import type { AnalysisRecommendation } from '../../analysis/recommendations.js';

interface RecommendationsCardProps {
  recommendations: AnalysisRecommendation[];
  onSelectRecommendation: (rec: AnalysisRecommendation) => void;
}

export const RecommendationsCard: React.FC<RecommendationsCardProps> = ({
  recommendations,
  onSelectRecommendation,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  if (recommendations.length === 0) return null;

  return (
    <div className="rounded-2xl border border-indigo-100 bg-gradient-to-b from-indigo-50/50 to-white p-3.5 shadow-xs">
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-1.5">
          <div className="flex h-5 w-5 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-2xs">
            <Compass className="h-3 w-3" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-900">Recommended Analyses</h3>
            <p className="text-[10px] text-slate-500">
              Data-driven statistical operations tailored to your column types
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="rounded-lg p-1 text-slate-400 hover:bg-indigo-100/50 hover:text-indigo-700 transition-colors cursor-pointer"
        >
          {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
      </div>

      {isExpanded && (
        <div className="grid grid-cols-1 gap-2 pt-1">
          {recommendations.slice(0, 4).map((rec) => (
            <div
              key={rec.id}
              className="flex items-center justify-between gap-2 rounded-xl border border-indigo-100/80 bg-white p-2.5 shadow-2xs hover:border-indigo-300 hover:shadow-xs transition-all"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="rounded-md bg-indigo-50 px-1.5 py-0.5 text-[9px] font-bold text-indigo-700 uppercase tracking-wider">
                    {rec.badge}
                  </span>
                  <h4 className="truncate text-xs font-semibold text-slate-800" title={rec.title}>
                    {rec.title}
                  </h4>
                </div>
                <p className="line-clamp-1 text-[10px] text-slate-500" title={rec.reason}>
                  {rec.reason}
                </p>
              </div>

              <button
                type="button"
                onClick={() => onSelectRecommendation(rec)}
                className="flex shrink-0 items-center gap-1 rounded-lg bg-indigo-600 px-2.5 py-1.5 text-[11px] font-semibold text-white shadow-2xs hover:bg-indigo-500 transition-all cursor-pointer"
              >
                <Play className="h-2.5 w-2.5 fill-current" />
                <span>Run</span>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
