import type { ExtractedTable } from './types.js';

export interface CsvParseOptions {
  tableName?: string;
  sourceDetails?: string;
  delimiter?: string;
  hasHeader?: boolean;
}

/**
 * Auto-detects the most consistent CSV delimiter across a sample of rows.
 */
export function detectDelimiter(text: string): string {
  const candidateDelimiters = [',', ';', '\t', '|'];
  const sampleLines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .slice(0, 15);

  if (sampleLines.length === 0) return ',';

  let bestDelimiter = ',';
  let bestScore = -1;

  for (const delim of candidateDelimiters) {
    const counts = sampleLines.map((line) => {
      // Simple split count for estimation (disregarding quotes for fast heuristic)
      let count = 0;
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') inQuotes = !inQuotes;
        else if (char === delim && !inQuotes) count++;
      }
      return count;
    });

    const firstCount = counts[0];
    if (firstCount === 0) continue;

    // Check consistency across lines
    const consistent = counts.every((c) => c === firstCount);
    const score = consistent ? firstCount * 10 + firstCount : counts.reduce((a, b) => a + b, 0);

    if (score > bestScore) {
      bestScore = score;
      bestDelimiter = delim;
    }
  }

  return bestDelimiter;
}

/**
 * Parses raw CSV string compliant with RFC 4180 (supporting quotes, escaped quotes "", and newlines).
 */
export function parseCsvRaw(csvText: string, delimiter?: string): string[][] {
  const delim = delimiter || detectDelimiter(csvText);
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;

  const len = csvText.length;
  let i = 0;

  while (i < len) {
    const char = csvText[i];

    if (inQuotes) {
      if (char === '"') {
        // Lookahead for escaped quote ""
        if (i + 1 < len && csvText[i + 1] === '"') {
          currentField += '"';
          i += 2;
          continue;
        } else {
          // Closing quote
          inQuotes = false;
          i++;
          continue;
        }
      } else {
        currentField += char;
        i++;
        continue;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
        i++;
        continue;
      } else if (char === delim) {
        currentRow.push(currentField.trim());
        currentField = '';
        i++;
        continue;
      } else if (char === '\r') {
        if (i + 1 < len && csvText[i + 1] === '\n') {
          i++; // skip \r in \r\n
        }
        currentRow.push(currentField.trim());
        currentField = '';
        // Only push row if non-empty
        if (currentRow.some((f) => f.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
        i++;
        continue;
      } else if (char === '\n') {
        currentRow.push(currentField.trim());
        currentField = '';
        if (currentRow.some((f) => f.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
        i++;
        continue;
      } else {
        currentField += char;
        i++;
        continue;
      }
    }
  }

  // Push lingering field and row
  if (currentField.length > 0 || inQuotes) {
    currentRow.push(currentField.trim());
  }
  if (currentRow.some((f) => f.length > 0)) {
    rows.push(currentRow);
  }

  return rows;
}

/**
 * Parses CSV text into a fully standardized ExtractedTable for DataLens EDA.
 */
export function parseCsvToTable(
  csvText: string,
  options: CsvParseOptions = {}
): ExtractedTable | null {
  const rawRows = parseCsvRaw(csvText, options.delimiter);
  if (rawRows.length === 0) return null;

  const maxCols = Math.max(...rawRows.map((r) => r.length));
  if (maxCols === 0) return null;

  let headers: string[] = [];
  let dataRows: string[][] = [];
  const hasExplicitHeader = options.hasHeader ?? true;

  if (hasExplicitHeader && rawRows.length > 0) {
    headers = rawRows[0];
    dataRows = rawRows.slice(1);
  } else {
    dataRows = rawRows;
  }

  // Ensure headers exist and are non-empty
  if (headers.length === 0) {
    headers = Array.from({ length: maxCols }, (_, idx) => `Column ${idx + 1}`);
  } else {
    headers = headers.map((h, idx) => (h && h.trim().length > 0 ? h.trim() : `Column ${idx + 1}`));
    if (headers.length < maxCols) {
      for (let i = headers.length; i < maxCols; i++) {
        headers.push(`Column ${i + 1}`);
      }
    }
  }

  // Standardize row lengths to maxCols
  const standardizedRows = dataRows.map((row) => {
    if (row.length < maxCols) {
      return [...row, ...Array(maxCols - row.length).fill('')];
    }
    return row.slice(0, maxCols);
  });

  const id = `datalens-csv-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const name = options.tableName || 'Imported CSV Dataset';

  return {
    id,
    index: 0,
    name,
    headers,
    rows: standardizedRows,
    rowIndices: standardizedRows.map((_, i) => i),
    totalRows: standardizedRows.length,
    totalColumns: maxCols,
    hasExplicitHeader: true,
    sampleRows: standardizedRows.slice(0, 10),
    sourceType: 'csv',
    sourceDetails: options.sourceDetails || `Parsed ${standardizedRows.length} rows from CSV`,
  };
}
