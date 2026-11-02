import React, { useState, useMemo } from 'react';
import { AlertCircle, BarChart3, Table as TableIcon, Bot } from 'lucide-react';
import { useActiveTab } from './hooks/useActiveTab.js';
import { useTableScanner } from './hooks/useTableScanner.js';
import { Header } from './components/Header.js';
import { PageContextCard } from './components/PageContextCard.js';
import { ScannerAction } from './components/ScannerAction.js';
import { EDAPanel } from './components/EDAPanel.js';
import { TablePreview } from './components/TablePreview.js';
import { DataAssistantChat } from './components/DataAssistantChat.js';
import { EmptyState } from './components/EmptyState.js';
import { analyzeTableColumns } from '../analysis/typeInference.js';

export const App: React.FC = () => {
  const { tabInfo, refreshActiveTab } = useActiveTab();
  const {
    isScanning,
    tables,
    metadata,
    selectedTable,
    selectedTableId,
    setSelectedTableId,
    error,
    hasScanned,
    hasDynamicUpdates,
    scanCurrentPage,
    importLocalFile,
    updateTable,
    highlightTableOnPage,
  } = useTableScanner(tabInfo);

  const [activeView, setActiveView] = useState<'eda' | 'ai' | 'grid'>('eda');

  // Columns for the currently selected table
  const selectedTableColumns = useMemo(() => {
    if (!selectedTable) return [];
    return analyzeTableColumns(selectedTable);
  }, [selectedTable]);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50/70 text-slate-900 font-sans antialiased selection:bg-indigo-500 selection:text-white">
      {/* 1. DataLens Heading */}
      <Header
        tabInfo={tabInfo}
        onRefresh={refreshActiveTab}
        isScanning={isScanning}
      />

      {/* Main Content Area */}
      <main className="flex-1 space-y-3.5 p-3.5">
        {/* Active Webpage Context Card */}
        <PageContextCard tabInfo={tabInfo} />

        {/* Scanner Action & Status */}
        <ScannerAction
          isScanning={isScanning}
          onScan={scanCurrentPage}
          disabled={!tabInfo.isScannable}
          metadata={metadata}
          tableCount={tables.length}
          hasScanned={hasScanned}
          hasDynamicUpdates={hasDynamicUpdates}
          onImportFile={importLocalFile}
        />

        {/* Error notification if any */}
        {error && (
          <div className="flex items-start gap-2 rounded-2xl bg-rose-50 p-3 text-xs text-rose-800 border border-rose-200">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
            <div className="leading-snug">{error}</div>
          </div>
        )}

        {/* When tables are detected */}
        {tables.length > 0 ? (
          <div className="space-y-3">
            {/* 3-View Switcher: EDA vs AI Assistant vs Raw Grid */}
            <div className="flex rounded-xl bg-slate-200/70 p-1 border border-slate-200">
              <button
                type="button"
                onClick={() => setActiveView('eda')}
                className={`flex-1 flex items-center justify-center gap-1 rounded-lg py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                  activeView === 'eda'
                    ? 'bg-white text-indigo-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <BarChart3 className="h-3.5 w-3.5" />
                <span>Workspace</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveView('ai')}
                className={`flex-1 flex items-center justify-center gap-1 rounded-lg py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                  activeView === 'ai'
                    ? 'bg-white text-indigo-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Bot className="h-3.5 w-3.5 text-indigo-600" />
                <span>AI Assistant</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveView('grid')}
                className={`flex-1 flex items-center justify-center gap-1 rounded-lg py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                  activeView === 'grid'
                    ? 'bg-white text-indigo-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <TableIcon className="h-3.5 w-3.5" />
                <span>Data Grid</span>
              </button>
            </div>

            {/* View 1: Complete EDA Analysis System */}
            {activeView === 'eda' && (
              <EDAPanel
                tables={tables}
                selectedTableId={selectedTableId}
                onSelectTable={setSelectedTableId}
                pageTitle={tabInfo.title}
                pageUrl={tabInfo.url}
                onUpdateTable={updateTable}
              />
            )}

            {/* View 2: Conversational Data Assistant */}
            {activeView === 'ai' && selectedTable && (
              <DataAssistantChat
                table={selectedTable}
                columns={selectedTableColumns}
                onVisualizeInWorkspace={() => {
                  setActiveView('eda');
                }}
              />
            )}

            {/* View 3: Raw Table Data Grid Preview */}
            {activeView === 'grid' && (
              <TablePreview
                tables={tables}
                selectedTable={selectedTable}
                onSelectTable={setSelectedTableId}
                onHighlight={highlightTableOnPage}
              />
            )}
          </div>
        ) : (
          <EmptyState
            hasScanned={hasScanned}
            onScan={scanCurrentPage}
            isScanning={isScanning}
            disabled={!tabInfo.isScannable}
          />
        )}
      </main>

      {/* Subtle Footer */}
      <footer className="border-t border-slate-200/60 bg-white/60 px-4 py-2 text-center text-[10px] text-slate-400">
        DataLens EDA Extension • Manifest V3 • Plotly.js Powered
      </footer>
    </div>
  );
};

export default App;
