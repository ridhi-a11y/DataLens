import React, { useState, useEffect, useMemo } from 'react';
import {
  Sparkles,
  Play,
  Loader2,
  Trash2,
  Download,
  FileSpreadsheet,
  FileText,
  GitCompare,
  Table,
  CheckSquare,
  ShieldCheck,
} from 'lucide-react';
import type { ExtractedTable } from '../../extraction/types.js';
import type {
  ColumnInfo,
  FunctionId,
  AnalysisResult,
  DataType,
} from '../../analysis/types.js';
import { analyzeTableColumns } from '../../analysis/typeInference.js';
import {
  FUNCTION_DEFINITIONS,
  getCompatibleFunctions,
  executeAnalysis,
} from '../../analysis/operations.js';
import { generateRecommendations, type AnalysisRecommendation } from '../../analysis/recommendations.js';
import { RecommendationsCard } from './RecommendationsCard.js';
import { AIInsightsSection } from './AIInsightsSection.js';
import { DataCleaningModal } from './DataCleaningModal.js';
import { AnalysisResultCard } from './AnalysisResultCard.js';
import { RecordInspector } from './RecordInspector.js';
import { CompareColumnsModal } from './CompareColumnsModal.js';
import { exportResultsToCSV, exportToExcel, exportToPDF } from '../../analysis/exportUtils.js';

interface EDAPanelProps {
  tables: ExtractedTable[];
  selectedTableId: string | null;
  onSelectTable: (id: string) => void;
  pageTitle?: string;
  pageUrl?: string;
  onUpdateTable?: (table: ExtractedTable) => void;
}

export const EDAPanel: React.FC<EDAPanelProps> = ({
  tables,
  selectedTableId,
  onSelectTable,
  pageTitle,
  pageUrl,
  onUpdateTable,
}) => {
  const selectedTable = tables.find((t) => t.id === selectedTableId) || tables[0] || null;

  // Preserve pristine original versions of tables
  const [originalTablesMap, setOriginalTablesMap] = useState<Map<string, ExtractedTable>>(new Map());

  useEffect(() => {
    setOriginalTablesMap((prev) => {
      const next = new Map(prev);
      tables.forEach((t) => {
        if (!next.has(t.id)) {
          next.set(t.id, t);
        }
      });
      return next;
    });
  }, [tables]);

  const originalTable = (selectedTable ? originalTablesMap.get(selectedTable.id) : null) || selectedTable;

  // Analyze columns of selected table
  const columns: ColumnInfo[] = useMemo(() => {
    if (!selectedTable) return [];
    return analyzeTableColumns(selectedTable);
  }, [selectedTable]);

  // Selected inputs
  const [selectedColumnName, setSelectedColumnName] = useState<string>('');
  const [selectedFunctionId, setSelectedFunctionId] = useState<FunctionId>('MEAN');
  const [secondaryColumnName, setSecondaryColumnName] = useState<string>('');
  const [selectedMultiColumns, setSelectedMultiColumns] = useState<string[]>([]);

  // Execution & State
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentResult, setCurrentResult] = useState<AnalysisResult | null>(null);
  const [isCompareOpen, setIsCompareOpen] = useState<boolean>(false);
  const [isCleaningOpen, setIsCleaningOpen] = useState<boolean>(false);

  // Automatic Statistical Recommendations (Module 6)
  const recommendations = useMemo(() => {
    if (!selectedTable || columns.length === 0) return [];
    return generateRecommendations(selectedTable, columns);
  }, [selectedTable, columns]);

  const handleSelectRecommendation = (rec: AnalysisRecommendation) => {
    setSelectedColumnName(rec.primaryColumn);
    if (rec.secondaryColumn) setSecondaryColumnName(rec.secondaryColumn);
    if (rec.multiColumns) setSelectedMultiColumns(rec.multiColumns);
    setSelectedFunctionId(rec.functionId);

    // Auto-execute recommendation
    setTimeout(() => {
      if (!selectedTable) return;
      const primaryCol = columns.find((c) => c.name === rec.primaryColumn) || columns[0];
      const secCol = rec.secondaryColumn ? columns.find((c) => c.name === rec.secondaryColumn) : undefined;
      try {
        const res = executeAnalysis(selectedTable, primaryCol, rec.functionId, secCol, rec.multiColumns);
        setCurrentResult(res);
      } catch (e) {
        setErrorMessage(e instanceof Error ? e.message : String(e));
      }
    }, 50);
  };

  const handleTriggerAnalysis = (functionId: FunctionId, primaryColumn: string, secondaryColumn?: string) => {
    setSelectedColumnName(primaryColumn);
    if (secondaryColumn) setSecondaryColumnName(secondaryColumn);
    setSelectedFunctionId(functionId);

    setTimeout(() => {
      if (!selectedTable) return;
      const primaryCol = columns.find((c) => c.name === primaryColumn) || columns[0];
      const secCol = secondaryColumn ? columns.find((c) => c.name === secondaryColumn) : undefined;
      try {
        const res = executeAnalysis(selectedTable, primaryCol, functionId, secCol);
        setCurrentResult(res);
      } catch (e) {
        setErrorMessage(e instanceof Error ? e.message : String(e));
      }
    }, 50);
  };

  // Graph-to-Data inspector state
  const [inspectedSelection, setInspectedSelection] = useState<{
    rowIndices: number[];
    label: string;
    value?: string | number;
  } | null>(null);

  // Synchronize column selection when table changes
  useEffect(() => {
    setCurrentResult(null);
    setInspectedSelection(null);
    if (columns.length > 0) {
      // Pick first numerical column if exists, otherwise first column
      const numCol = columns.find((c) => c.dataType === 'numerical') || columns[0];
      setSelectedColumnName(numCol.name);

      const otherNum = columns.filter((c) => c.dataType === 'numerical' && c.name !== numCol.name);
      if (otherNum.length > 0) {
        setSecondaryColumnName(otherNum[0].name);
      }
      setSelectedMultiColumns(columns.filter((c) => c.dataType === 'numerical').map((c) => c.name));
    }
  }, [selectedTable?.id, columns]);

  const selectedColInfo = columns.find((c) => c.name === selectedColumnName) || columns[0];

  // Dynamically filter functions compatible with selected column data type
  const compatibleFunctions = useMemo(() => {
    if (!selectedColInfo) return [];
    return getCompatibleFunctions(selectedColInfo.dataType);
  }, [selectedColInfo]);

  // Synchronize function selection if current function is not compatible
  useEffect(() => {
    if (compatibleFunctions.length > 0) {
      const isStillCompatible = compatibleFunctions.some((f) => f.id === selectedFunctionId);
      if (!isStillCompatible) {
        setSelectedFunctionId(compatibleFunctions[0].id);
      }
    }
  }, [compatibleFunctions, selectedFunctionId]);

  const selectedFuncDef = FUNCTION_DEFINITIONS.find((f) => f.id === selectedFunctionId);

  // Group functions by category
  const groupedFunctions = useMemo(() => {
    const groups: Record<string, typeof compatibleFunctions> = {
      'Descriptive Statistics': [],
      'Data Distribution': [],
      'Data Quality': [],
      'Visualisations': [],
    };

    compatibleFunctions.forEach((fn) => {
      if (fn.category === 'DESCRIPTIVE') groups['Descriptive Statistics'].push(fn);
      else if (fn.category === 'DISTRIBUTION') groups['Data Distribution'].push(fn);
      else if (fn.category === 'QUALITY') groups['Data Quality'].push(fn);
      else if (fn.category === 'VISUALIZATION') groups['Visualisations'].push(fn);
    });

    return groups;
  }, [compatibleFunctions]);

  // Handle Analysis Execution
  const handleExecute = async () => {
    if (!selectedTable || !selectedColInfo || !selectedFuncDef) return;

    setIsExecuting(true);
    setErrorMessage(null);

    // Give UI a tick to show spinner
    await new Promise((r) => setTimeout(r, 60));

    try {
      const secondaryColInfo = selectedFuncDef.requiresSecondColumn
        ? columns.find((c) => c.name === secondaryColumnName)
        : undefined;

      const result = executeAnalysis(
        selectedTable,
        selectedColInfo,
        selectedFunctionId,
        secondaryColInfo,
        selectedFuncDef.requiresMultiColumn ? selectedMultiColumns : undefined
      );

      // Display only the current analysis
      setCurrentResult(result);
      setInspectedSelection(null);
    } catch (err) {
      console.error('[DataLens] Analysis execution error:', err);
      setErrorMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setIsExecuting(false);
    }
  };

  const handleClearCurrentResult = () => {
    setCurrentResult(null);
    setInspectedSelection(null);
  };

  const getTypeBadge = (type: DataType) => {
    switch (type) {
      case 'numerical':
        return <span className="text-[10px] text-blue-600 font-mono font-bold">[123]</span>;
      case 'categorical':
        return <span className="text-[10px] text-emerald-600 font-mono font-bold">[Abc]</span>;
      case 'date':
        return <span className="text-[10px] text-amber-600 font-mono font-bold">[Date]</span>;
      case 'boolean':
        return <span className="text-[10px] text-purple-600 font-mono font-bold">[Bool]</span>;
    }
  };

  if (!selectedTable) return null;

  return (
    <div className="flex flex-col gap-3.5">
      {/* 1. DATASET SELECTION & CONTEXT */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-xs">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2.5">
          <div className="flex items-center gap-1.5">
            <Table className="h-4 w-4 text-indigo-600" />
            <span className="text-xs font-bold text-slate-900">Dataset Context</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsCleaningOpen(true)}
              className="flex items-center gap-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold cursor-pointer transition-colors shadow-2xs"
              title="Open Intelligent Data Cleaning Assistant"
            >
              <ShieldCheck className="h-3 w-3 text-emerald-600" />
              <span>Clean Data</span>
            </button>
            <div className="flex items-center gap-1 text-[11px] text-slate-500 font-medium">
              <span className="bg-slate-100 px-2 py-0.5 rounded-md font-mono">{selectedTable.totalRows} rows</span>
              <span className="bg-slate-100 px-2 py-0.5 rounded-md font-mono">{selectedTable.totalColumns} cols</span>
            </div>
          </div>
        </div>

        {/* If single table detected, show name directly; if multiple, show selector dropdown */}
        {tables.length === 1 ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 truncate">
              <span className="text-[10px] rounded-md bg-indigo-50 border border-indigo-100 text-indigo-700 px-1.5 py-0.5 font-bold uppercase">
                {selectedTable.sourceType || 'HTML'}
              </span>
              <div className="truncate text-xs font-semibold text-slate-800" title={selectedTable.name}>
                {selectedTable.name}
              </div>
            </div>
            <span className="text-[10px] rounded-full bg-emerald-50 text-emerald-700 px-2 py-0.5 font-medium shrink-0">
              Primary Dataset
            </span>
          </div>
        ) : (
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Select Dataset to Analyse ({tables.length} Detected)
            </label>
            <select
              value={selectedTable.id}
              onChange={(e) => onSelectTable(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-1.5 text-xs font-medium text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            >
              {tables.map((t, i) => (
                <option key={t.id} value={t.id}>
                  #{i + 1} [{t.sourceType ? t.sourceType.toUpperCase() : 'HTML'}] {t.name} ({t.totalRows} rows, {t.totalColumns} cols)
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* 1B. AUTOMATIC STATISTICAL RECOMMENDATIONS (Module 6) */}
      <RecommendationsCard
        recommendations={recommendations}
        onSelectRecommendation={handleSelectRecommendation}
      />

      {/* 1C. AI-POWERED AUTOMATED INSIGHTS (Module 1) */}
      <AIInsightsSection
        table={selectedTable}
        columns={columns}
        onTriggerAnalysis={handleTriggerAnalysis}
      />

      {/* 2. COLUMN AND FUNCTION SELECTION (SIDE BY SIDE) */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-xs">
        <div className="grid grid-cols-2 gap-2.5">
          {/* Dropdown 1: Select Column */}
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Select Column
            </label>
            <select
              value={selectedColumnName}
              onChange={(e) => setSelectedColumnName(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-2.5 py-2 text-xs font-semibold text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            >
              {columns.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name} ({c.dataType})
                </option>
              ))}
            </select>
            {selectedColInfo && (
              <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400 px-1">
                <span>Type: {getTypeBadge(selectedColInfo.dataType)} {selectedColInfo.dataType}</span>
                <span>{selectedColInfo.validCount} valid</span>
              </div>
            )}
          </div>

          {/* Dropdown 2: Select Function */}
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Select Function
            </label>
            <select
              value={selectedFunctionId}
              onChange={(e) => setSelectedFunctionId(e.target.value as FunctionId)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-2.5 py-2 text-xs font-semibold text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            >
              {Object.entries(groupedFunctions).map(([catName, fns]) => {
                if (fns.length === 0) return null;
                return (
                  <optgroup key={catName} label={catName}>
                    {fns.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.label}
                      </option>
                    ))}
                  </optgroup>
                );
              })}
            </select>
            {selectedFuncDef && (
              <div className="mt-1 text-[10px] text-slate-400 px-1 truncate" title={selectedFuncDef.description}>
                {selectedFuncDef.description}
              </div>
            )}
          </div>
        </div>

        {/* 2B. SECONDARY COLUMN SELECTOR (For 2-column functions like Scatter Plot) */}
        {selectedFuncDef?.requiresSecondColumn && (
          <div className="mt-3 pt-3 border-t border-slate-100">
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Select Y-Axis Column (Numerical)
            </label>
            <select
              value={secondaryColumnName}
              onChange={(e) => setSecondaryColumnName(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            >
              {columns
                .filter((c) => c.name !== selectedColumnName && c.dataType === 'numerical')
                .map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name}
                  </option>
                ))}
            </select>
          </div>
        )}

        {/* 2C. MULTI-COLUMN SELECTOR (For Heatmap) */}
        {selectedFuncDef?.requiresMultiColumn && (
          <div className="mt-3 pt-3 border-t border-slate-100">
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Select Numerical Columns for Correlation Matrix (minimum 2)
            </label>
            <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-1 scrollbar-thin">
              {columns
                .filter((c) => c.dataType === 'numerical')
                .map((c) => {
                  const isChecked = selectedMultiColumns.includes(c.name);
                  return (
                    <button
                      key={c.name}
                      type="button"
                      onClick={() => {
                        if (isChecked) {
                          if (selectedMultiColumns.length > 2) {
                            setSelectedMultiColumns(selectedMultiColumns.filter((n) => n !== c.name));
                          }
                        } else {
                          setSelectedMultiColumns([...selectedMultiColumns, c.name]);
                        }
                      }}
                      className={`flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium transition-colors cursor-pointer ${
                        isChecked
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      <CheckSquare className="h-3 w-3" />
                      <span>{c.name}</span>
                    </button>
                  );
                })}
            </div>
          </div>
        )}

        {/* 3. ANALYSE BUTTON & COMPARE BUTTON */}
        <div className="mt-3.5 flex items-center gap-2">
          <button
            type="button"
            onClick={handleExecute}
            disabled={isExecuting || !selectedColInfo}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm shadow-indigo-500/25 transition-all hover:from-indigo-500 hover:to-violet-500 active:scale-[0.99] disabled:opacity-50 cursor-pointer"
          >
            {isExecuting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Computing Mathematical Model...</span>
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5 fill-current" />
                <span>Analyse Dataset</span>
              </>
            )}
          </button>

          {/* Compare & Analyse Button (Feature 4) */}
          {columns.filter((c) => c.dataType === 'numerical').length >= 2 && (
            <button
              type="button"
              onClick={() => setIsCompareOpen(true)}
              title="Compare multiple numerical columns side-by-side"
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-700 hover:border-indigo-300 hover:text-indigo-600 transition-colors shadow-2xs cursor-pointer"
            >
              <GitCompare className="h-3.5 w-3.5 text-indigo-600" />
              <span>Compare</span>
            </button>
          )}
        </div>

        {/* Error notification */}
        {errorMessage && (
          <div className="mt-2.5 rounded-xl bg-rose-50 p-2.5 text-xs text-rose-700 border border-rose-200">
            {errorMessage}
          </div>
        )}
      </div>

      {/* GRAPH-TO-DATA RECORD INSPECTOR */}
      {inspectedSelection && (
        <RecordInspector
          selection={inspectedSelection}
          table={selectedTable}
          onClear={() => setInspectedSelection(null)}
        />
      )}

      {/* CURRENT ANALYSIS RESULT & EXPORTS */}
      {currentResult && (
        <div className="space-y-3">
          {/* Header Bar for Result */}
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-indigo-600" />
              <h3 className="text-xs font-bold text-slate-800">
                Current Analysis Result
              </h3>
            </div>

            {/* Export & Clear Actions */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => exportResultsToCSV([currentResult], selectedTable.name)}
                title="Export result to CSV"
                className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold text-slate-600 hover:text-indigo-600 cursor-pointer shadow-2xs"
              >
                <Download className="h-3 w-3" />
                <span>CSV</span>
              </button>

              <button
                type="button"
                onClick={() => exportToExcel([currentResult], selectedTable)}
                title="Export workbook with data to Excel (.xlsx)"
                className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold text-slate-600 hover:text-emerald-600 cursor-pointer shadow-2xs"
              >
                <FileSpreadsheet className="h-3 w-3" />
                <span>Excel</span>
              </button>

              <button
                type="button"
                onClick={() => exportToPDF([currentResult], selectedTable, pageTitle, pageUrl)}
                title="Export full PDF analysis report"
                className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold text-slate-600 hover:text-rose-600 cursor-pointer shadow-2xs"
              >
                <FileText className="h-3 w-3" />
                <span>PDF</span>
              </button>

              <button
                type="button"
                onClick={handleClearCurrentResult}
                title="Clear current result"
                className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Single Current Analysis Card */}
          <AnalysisResultCard
            key={currentResult.id}
            result={currentResult}
            onRemove={handleClearCurrentResult}
            onSelectRecords={setInspectedSelection}
          />
        </div>
      )}

      {/* Compare & Analyse Modal */}
      <CompareColumnsModal
        isOpen={isCompareOpen}
        onClose={() => setIsCompareOpen(false)}
        table={selectedTable}
        columns={columns}
      />

      {/* Intelligent Data Cleaning Modal (Module 5) */}
      {isCleaningOpen && originalTable && onUpdateTable && (
        <DataCleaningModal
          originalTable={originalTable}
          activeTable={selectedTable}
          columns={columns}
          onUpdateTable={(cleaned) => {
            onUpdateTable(cleaned);
          }}
          onClose={() => setIsCleaningOpen(false)}
        />
      )}
    </div>
  );
};
