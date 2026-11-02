import { useState, useCallback, useEffect } from 'react';
import type { ExtractedTable, ExtractionMetadata, ExtractionResult } from '../../extraction/types.js';
import { parseCsvToTable } from '../../extraction/csvParser.js';
import { parseJsonToTable } from '../../extraction/jsonParser.js';
import type { ActiveTabInfo } from './useActiveTab.js';

export function useTableScanner(tabInfo: ActiveTabInfo) {
  const [isScanning, setIsScanning] = useState(false);
  const [tables, setTables] = useState<ExtractedTable[]>([]);
  const [metadata, setMetadata] = useState<ExtractionMetadata | null>(null);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasScanned, setHasScanned] = useState(false);
  const [hasDynamicUpdates, setHasDynamicUpdates] = useState(false);

  const selectedTable = tables.find((t) => t.id === selectedTableId) || tables[0] || null;

  // Listen for dynamic table updates from content script
  useEffect(() => {
    if (typeof chrome === 'undefined' || !chrome.runtime?.onMessage) return;

    const messageListener = (msg: { type?: string; payload?: { tableCount: number; hasNewTables: boolean } }) => {
      if (msg && msg.type === 'DYNAMIC_TABLES_UPDATE') {
        setHasDynamicUpdates(true);
      }
    };

    chrome.runtime.onMessage.addListener(messageListener);
    return () => {
      chrome.runtime.onMessage.removeListener(messageListener);
    };
  }, []);

  const scanCurrentPage = useCallback(async () => {
    if (!tabInfo.isScannable || !tabInfo.id) {
      setError(tabInfo.unscannableReason || 'Active tab is not scannable');
      return;
    }

    setIsScanning(true);
    setError(null);
    setHasDynamicUpdates(false);

    // Development fallback when testing outside Chrome extension runtime
    if (typeof chrome === 'undefined' || !chrome.tabs) {
      setTimeout(() => {
        const mockTables: ExtractedTable[] = [
          {
            id: 'mock-table-1',
            index: 0,
            name: 'Quarterly Financial Performance (2025-2026)',
            headers: ['Fiscal Quarter', 'Revenue ($M)', 'Operating Margin', 'YoY Growth', 'Active Users (M)'],
            rows: [
              ['Q1 2025', '1,420.5', '24.2%', '+18.4%', '34.2'],
              ['Q2 2025', '1,560.8', '25.8%', '+21.1%', '37.8'],
              ['Q3 2025', '1,680.0', '26.4%', '+19.6%', '41.5'],
              ['Q4 2025', '1,895.2', '28.1%', '+23.5%', '46.0'],
              ['Q1 2026', '2,010.4', '29.3%', '+26.8%', '50.3'],
            ],
            totalRows: 5,
            totalColumns: 5,
            rowIndices: [0, 1, 2, 3, 4],
            hasExplicitHeader: true,
            sampleRows: [
              ['Q1 2025', '1,420.5', '24.2%', '+18.4%', '34.2'],
              ['Q2 2025', '1,560.8', '25.8%', '+21.1%', '37.8'],
              ['Q3 2025', '1,680.0', '26.4%', '+19.6%', '41.5'],
              ['Q4 2025', '1,895.2', '28.1%', '+23.5%', '46.0'],
              ['Q1 2026', '2,010.4', '29.3%', '+26.8%', '50.3'],
            ],
            sourceType: 'html',
            sourceDetails: 'Rendered DOM Table #1',
          },
          {
            id: 'mock-table-2',
            index: 1,
            name: 'Regional Sales Distribution',
            headers: ['Region', 'Country Count', 'Top Product', 'Gross Volume ($K)'],
            rows: [
              ['North America', '3', 'Enterprise Suite', '842,500'],
              ['EMEA', '28', 'Pro Cloud Plan', '620,100'],
              ['APAC', '14', 'Developer Tier', '495,300'],
              ['LATAM', '9', 'Starter Bundle', '180,400'],
            ],
            totalRows: 4,
            totalColumns: 4,
            rowIndices: [0, 1, 2, 3],
            hasExplicitHeader: true,
            sampleRows: [
              ['North America', '3', 'Enterprise Suite', '842,500'],
              ['EMEA', '28', 'Pro Cloud Plan', '620,100'],
              ['APAC', '14', 'Developer Tier', '495,300'],
              ['LATAM', '9', 'Starter Bundle', '180,400'],
            ],
            sourceType: 'html',
            sourceDetails: 'Rendered DOM Table #2',
          },
        ];

        setTables((prev) => {
          // Preserve any user-imported files while updating page tables
          const imported = prev.filter((t) => t.sourceType === 'csv' || t.sourceType === 'json');
          return [...mockTables, ...imported];
        });
        setSelectedTableId(mockTables[0].id);
        setMetadata({
          extractedAt: Date.now(),
          pageTitle: tabInfo.title || 'Sample Data Page',
          pageUrl: tabInfo.url || 'http://localhost:5173',
          totalTables: mockTables.length,
          totalCells: 41,
        });
        setHasScanned(true);
        setIsScanning(false);
      }, 400);
      return;
    }

    try {
      const tabId = tabInfo.id;

      const sendScanMessage = (): Promise<ExtractionResult> => {
        return new Promise((resolve, reject) => {
          chrome.tabs.sendMessage(
            tabId,
            { type: 'SCAN_TABLES_REQUEST' },
            (response: { type?: string; payload?: ExtractionResult } | undefined) => {
              if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
                return;
              }
              if (response && response.payload) {
                resolve(response.payload);
              } else {
                reject(new Error('Invalid response received from webpage content script'));
              }
            }
          );
        });
      };

      let result: ExtractionResult;

      try {
        result = await sendScanMessage();
      } catch (firstErr) {
        console.info('[DataLens] Content script not responding, injecting dynamically...', firstErr);

        if (chrome.scripting) {
          await chrome.scripting.executeScript({
            target: { tabId },
            files: ['content.js'],
          });

          await new Promise((r) => setTimeout(r, 120));
          result = await sendScanMessage();
        } else {
          throw firstErr;
        }
      }

      if (result.success) {
        setTables((prev) => {
          const imported = prev.filter((t) => t.sourceType === 'csv' || t.sourceType === 'json');
          return [...result.tables, ...imported];
        });
        setMetadata(result.metadata);
        if (result.tables.length > 0 && !selectedTableId) {
          setSelectedTableId(result.tables[0].id);
        }
        setHasScanned(true);
      } else {
        setError(result.error || 'Failed to detect tables on this webpage');
      }
    } catch (err: unknown) {
      console.error('[DataLens] Scanning error:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Could not connect to webpage. Try refreshing the active tab.'
      );
    } finally {
      setIsScanning(false);
    }
  }, [tabInfo, selectedTableId]);

  // Import local CSV or JSON file
  const importLocalFile = useCallback(async (file: File) => {
    setError(null);
    try {
      const text = await file.text();
      const ext = file.name.split('.').pop()?.toLowerCase();

      let table: ExtractedTable | null = null;
      if (ext === 'json') {
        table = parseJsonToTable(text, {
          tableName: file.name.replace(/\.json$/i, ''),
          sourceDetails: `Imported from local file: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`,
        });
      } else {
        // Default to CSV
        table = parseCsvToTable(text, {
          tableName: file.name.replace(/\.csv$/i, ''),
          sourceDetails: `Imported from local file: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`,
        });
      }

      if (!table) {
        throw new Error(`Could not parse tabular data from ${file.name}. Ensure it contains valid CSV or JSON records.`);
      }

      setTables((prev) => [table!, ...prev]);
      setSelectedTableId(table.id);
      setHasScanned(true);
      return table;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      throw err;
    }
  }, []);

  const highlightTableOnPage = useCallback(
    (tableId: string) => {
      if (!tabInfo.id || typeof chrome === 'undefined' || !chrome.tabs) {
        return;
      }
      chrome.tabs.sendMessage(tabInfo.id, {
        type: 'HIGHLIGHT_TABLE_REQUEST',
        tableId,
      });
    },
    [tabInfo.id]
  );

  const updateTable = useCallback((updatedTable: ExtractedTable) => {
    setTables((prev) => prev.map((t) => (t.id === updatedTable.id ? updatedTable : t)));
  }, []);

  return {
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
  };
}
