import type { DataType, ColumnInfo } from './types.js';
import type { ExtractedTable } from '../extraction/types.js';

const BOOLEAN_TRUE = new Set(['true', 'yes', 'y', '1', 't', 'pass', 'passed', 'valid', 'active']);
const BOOLEAN_FALSE = new Set(['false', 'no', 'n', '0', 'f', 'fail', 'failed', 'invalid', 'inactive']);

/**
 * Checks if a string representation represents a missing/empty value
 */
export function isMissingValue(val: string | null | undefined): boolean {
  if (val === null || val === undefined) return true;
  const trimmed = val.trim().toLowerCase();
  return (
    trimmed === '' ||
    trimmed === '-' ||
    trimmed === '–' ||
    trimmed === '—' ||
    trimmed === 'n/a' ||
    trimmed === 'na' ||
    trimmed === 'null' ||
    trimmed === 'undefined' ||
    trimmed === 'none'
  );
}

/**
 * Parses a string into a clean numerical value if possible
 */
export function parseCleanNumber(val: string): number | null {
  if (isMissingValue(val)) return null;

  // Clean currency symbols, commas, percent signs, and spaces
  let cleaned = val
    .trim()
    .replace(/^[$€£¥₹]\s?/, '') // leading currency
    .replace(/\s?[$€£¥₹]$/, '') // trailing currency
    .replace(/,/g, '') // thousands separator
    .replace(/%$/, '') // percentage
    .replace(/^\((.*)\)$/, '-$1') // accounting format (123) -> -123
    .trim();

  if (cleaned === '' || isNaN(Number(cleaned))) {
    return null;
  }

  const num = Number(cleaned);
  return Number.isFinite(num) ? num : null;
}

/**
 * Parses a string into a valid Date timestamp if possible
 */
export function parseCleanDate(val: string): number | null {
  if (isMissingValue(val)) return null;
  const trimmed = val.trim();

  // Avoid pure small numbers (like "2024" or "42") being falsely parsed as timestamp unless formatted
  if (/^\d{1,4}$/.test(trimmed)) {
    return null;
  }

  // Must match common date formats: YYYY-MM-DD, MM/DD/YYYY, DD-Mon-YYYY, or ISO
  const hasDateDelimiters = /[-/.]/.test(trimmed) || /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/i.test(trimmed);
  if (!hasDateDelimiters) return null;

  const parsed = Date.parse(trimmed);
  if (isNaN(parsed)) return null;

  // Filter out dates outside realistic range (1900 to 2100)
  const year = new Date(parsed).getFullYear();
  if (year < 1800 || year > 2150) return null;

  return parsed;
}

/**
 * Parses a string into a boolean if possible
 */
export function parseCleanBoolean(val: string): boolean | null {
  if (isMissingValue(val)) return null;
  const lower = val.trim().toLowerCase();
  if (BOOLEAN_TRUE.has(lower)) return true;
  if (BOOLEAN_FALSE.has(lower)) return false;
  return null;
}

/**
 * Determines the dominant DataType for a column
 */
export function inferColumnType(values: string[]): {
  dataType: DataType;
  missingCount: number;
  validCount: number;
  uniqueCount: number;
} {
  let missingCount = 0;
  let numberCount = 0;
  let dateCount = 0;
  let booleanCount = 0;
  const nonMissingValues: string[] = [];
  const uniqueSet = new Set<string>();

  for (const raw of values) {
    if (isMissingValue(raw)) {
      missingCount++;
      continue;
    }

    const trimmed = raw.trim();
    nonMissingValues.push(trimmed);
    uniqueSet.add(trimmed.toLowerCase());

    if (parseCleanNumber(trimmed) !== null) {
      numberCount++;
    }
    if (parseCleanBoolean(trimmed) !== null) {
      booleanCount++;
    }
    if (parseCleanDate(trimmed) !== null) {
      dateCount++;
    }
  }

  const validCount = nonMissingValues.length;
  const uniqueCount = uniqueSet.size;

  if (validCount === 0) {
    return { dataType: 'categorical', missingCount, validCount, uniqueCount };
  }

  // Threshold: if 75% or more of non-missing values match a type, infer that type
  const numRatio = numberCount / validCount;
  const dateRatio = dateCount / validCount;
  const boolRatio = booleanCount / validCount;

  // Strict check for boolean: must be predominantly boolean and have <= 2 unique values
  if (boolRatio >= 0.85 && uniqueCount <= 3) {
    return { dataType: 'boolean', missingCount, validCount, uniqueCount };
  }

  // Check numerical
  if (numRatio >= 0.75) {
    return { dataType: 'numerical', missingCount, validCount, uniqueCount };
  }

  // Check date
  if (dateRatio >= 0.75) {
    return { dataType: 'date', missingCount, validCount, uniqueCount };
  }

  return { dataType: 'categorical', missingCount, validCount, uniqueCount };
}

/**
 * Analyses all columns in an ExtractedTable and returns ColumnInfo metadata
 */
export function analyzeTableColumns(table: ExtractedTable): ColumnInfo[] {
  return table.headers.map((header, colIndex) => {
    const rawColValues = table.rows.map((row) => row[colIndex] || '');
    const { dataType, missingCount, validCount, uniqueCount } = inferColumnType(rawColValues);

    return {
      index: colIndex,
      name: header || `Column ${colIndex + 1}`,
      dataType,
      totalCount: table.totalRows,
      missingCount,
      validCount,
      uniqueCount,
    };
  });
}

/**
 * Extracts parsed typed data along with original row index
 */
export interface CleanedRowData<T> {
  rowIndex: number; // 0-based original row index
  displayRow: number; // 1-based display row index
  value: T;
  rawValue: string;
}

export function getCleanedNumericalColumn(
  table: ExtractedTable,
  colIndex: number
): {
  valid: CleanedRowData<number>[];
  missing: Array<{ rowIndex: number; rawValue: string }>;
  invalid: Array<{ rowIndex: number; rawValue: string }>;
} {
  const valid: CleanedRowData<number>[] = [];
  const missing: Array<{ rowIndex: number; rawValue: string }> = [];
  const invalid: Array<{ rowIndex: number; rawValue: string }> = [];

  table.rows.forEach((row, i) => {
    const origIndex = table.rowIndices && table.rowIndices[i] !== undefined ? table.rowIndices[i] : i;
    const raw = row[colIndex] || '';

    if (isMissingValue(raw)) {
      missing.push({ rowIndex: origIndex, rawValue: raw });
      return;
    }

    const num = parseCleanNumber(raw);
    if (num !== null) {
      valid.push({
        rowIndex: origIndex,
        displayRow: origIndex + 1,
        value: num,
        rawValue: raw,
      });
    } else {
      invalid.push({ rowIndex: origIndex, rawValue: raw });
    }
  });

  return { valid, missing, invalid };
}

export function getCleanedCategoricalColumn(
  table: ExtractedTable,
  colIndex: number
): {
  valid: CleanedRowData<string>[];
  missing: Array<{ rowIndex: number; rawValue: string }>;
} {
  const valid: CleanedRowData<string>[] = [];
  const missing: Array<{ rowIndex: number; rawValue: string }> = [];

  table.rows.forEach((row, i) => {
    const origIndex = table.rowIndices && table.rowIndices[i] !== undefined ? table.rowIndices[i] : i;
    const raw = (row[colIndex] || '').trim();

    if (isMissingValue(raw)) {
      missing.push({ rowIndex: origIndex, rawValue: raw });
    } else {
      valid.push({
        rowIndex: origIndex,
        displayRow: origIndex + 1,
        value: raw,
        rawValue: raw,
      });
    }
  });

  return { valid, missing };
}
