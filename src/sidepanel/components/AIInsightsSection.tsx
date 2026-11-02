import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  RefreshCw,
  Key,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Play,
  Lightbulb,
} from 'lucide-react';
import type { ExtractedTable } from '../../extraction/types.js';
import type { ColumnInfo, FunctionId } from '../../analysis/types.js';
import { generateDatasetInsights } from '../../ai/insightsEngine.js';
import { getGeminiApiKey, setGeminiApiKey } from '../../ai/geminiClient.js';
import type { InsightItem } from '../../ai/types.js';

interface AIInsightsSectionProps {
  table: ExtractedTable;
  columns: ColumnInfo[];
  onTriggerAnalysis: (functionId: FunctionId, primaryColumn: string, secondaryColumn?: string) => void;
}

export const AIInsightsSection: React.FC<AIInsightsSectionProps> = ({
  table,
  columns,
  onTriggerAnalysis,
}) => {
  const [insights, setInsights] = useState<InsightItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [activeExplainId, setActiveExplainId] = useState<string | null>(null);
  const [isKeyModalOpen, setIsKeyModalOpen] = useState<boolean>(false);
  const [apiKeyInput, setApiKeyInput] = useState<string>('');
  const [hasApiKey, setHasApiKey] = useState<boolean>(false);

  // Check stored API key on mount
  useEffect(() => {
    getGeminiApiKey().then((k) => {
      setHasApiKey(Boolean(k));
      setApiKeyInput(k);
    });
  }, []);

  const loadInsights = async () => {
    if (!table || columns.length === 0) return;
    setIsLoading(true);
    try {
      const res = await generateDatasetInsights(table, columns);
      setInsights(res);
    } catch (err) {
      console.error('[DataLens] Failed to generate AI insights:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInsights();
  }, [table.id, columns.length]);

  const handleSaveApiKey = async () => {
    await setGeminiApiKey(apiKeyInput);
    setHasApiKey(Boolean(apiKeyInput.trim()));
    setIsKeyModalOpen(false);
    // Reload insights with new key
    loadInsights();
  };

  const getCategoryBadgeClass = (category: string) => {
    switch (category) {
      case 'anomaly':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'quality':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'relationship':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'distribution':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      default:
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
  };

  if (!table) return null;

  return (
    <div className="rounded-2xl border border-indigo-100 bg-white p-3.5 shadow-xs">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <div className="flex h-5 w-5 items-center justify-center rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-2xs">
            <Sparkles className="h-3 w-3" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-xs font-bold text-slate-900">AI-Powered Automated Insights</h3>
              <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-semibold border ${hasApiKey ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                {hasApiKey ? 'Gemini 2.0 Live' : 'Deterministic Mode'}
              </span>
            </div>
            <p className="text-[10px] text-slate-500">
              Mathematically validated patterns, anomalies, and findings
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setIsKeyModalOpen(true)}
            title="Configure Gemini API Key"
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
          >
            <Key className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={loadInsights}
            disabled={isLoading}
            title="Regenerate Insights"
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin text-indigo-600' : ''}`} />
          </button>
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
          >
            {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {/* API Key Modal */}
      {isKeyModalOpen && (
        <div className="mb-3 rounded-xl bg-slate-50 p-3 border border-slate-200">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold text-slate-800">Secure Gemini API Key</span>
            <button
              type="button"
              onClick={() => setIsKeyModalOpen(false)}
              className="text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
            >
              ✕
            </button>
          </div>
          <p className="text-[10px] text-slate-500 mb-2">
            Keys are stored locally in your browser storage and never hardcoded in bundle source.
          </p>
          <div className="flex gap-1.5">
            <input
              type="password"
              placeholder="AIzaSy..."
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              className="flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <button
              type="button"
              onClick={handleSaveApiKey}
              className="rounded-lg bg-indigo-600 px-3 py-1 text-xs font-semibold text-white hover:bg-indigo-500 cursor-pointer"
            >
              Save
            </button>
          </div>
        </div>
      )}

      {/* Insights List */}
      {isExpanded && (
        <div className="space-y-2 pt-1">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-6 text-slate-400 gap-2">
              <RefreshCw className="h-5 w-5 animate-spin text-indigo-600" />
              <span className="text-xs">Synthesizing statistical findings...</span>
            </div>
          ) : insights.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-400">
              No prominent anomalies detected in this dataset.
            </div>
          ) : (
            insights.map((ins) => {
              const isExplaining = activeExplainId === ins.id;
              return (
                <div
                  key={ins.id}
                  className="rounded-xl border border-slate-200/90 bg-white p-2.5 shadow-2xs hover:border-slate-300 transition-all"
                >
                  <div className="flex items-start justify-between gap-1.5 mb-1">
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider border ${getCategoryBadgeClass(
                        ins.category
                      )}`}
                    >
                      {ins.category}
                    </span>
                    <div className="flex items-center gap-1">
                      {ins.explanation && (
                        <button
                          type="button"
                          onClick={() => setActiveExplainId(isExplaining ? null : ins.id)}
                          className="flex items-center gap-0.5 text-[10px] font-medium text-slate-400 hover:text-indigo-600 cursor-pointer"
                        >
                          <HelpCircle className="h-3 w-3" />
                          <span>{isExplaining ? 'Hide' : 'Explain'}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <h4 className="text-xs font-semibold text-slate-800 mb-0.5 leading-snug">
                    {ins.headline}
                  </h4>
                  <p className="text-[11px] text-slate-600 leading-relaxed mb-2">
                    {ins.observation}
                  </p>

                  {/* Supporting Columns */}
                  <div className="flex flex-wrap items-center justify-between gap-1 pt-1.5 border-t border-slate-100">
                    <div className="flex flex-wrap gap-1">
                      {ins.supportingColumns.map((colName) => (
                        <span
                          key={colName}
                          className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[9px] font-mono text-slate-600"
                        >
                          {colName}
                        </span>
                      ))}
                    </div>

                    {ins.suggestedAction && (
                      <button
                        type="button"
                        onClick={() =>
                          onTriggerAnalysis(
                            ins.suggestedAction!.functionId,
                            ins.suggestedAction!.primaryColumn,
                            ins.suggestedAction!.secondaryColumn
                          )
                        }
                        className="flex items-center gap-1 rounded-md bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-2 py-0.5 text-[10px] font-semibold cursor-pointer transition-colors"
                      >
                        <Play className="h-2.5 w-2.5 fill-current" />
                        <span>{ins.suggestedAction.label}</span>
                      </button>
                    )}
                  </div>

                  {/* Detailed Explanation Drawer */}
                  {isExplaining && ins.explanation && (
                    <div className="mt-2 rounded-lg bg-indigo-50/70 p-2 text-[10px] text-indigo-900 border border-indigo-100 animate-in fade-in">
                      <div className="flex items-start gap-1.5">
                        <Lightbulb className="h-3.5 w-3.5 text-indigo-600 shrink-0 mt-0.5" />
                        <div>
                          <strong>Methodological Interpretation:</strong> {ins.explanation}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
