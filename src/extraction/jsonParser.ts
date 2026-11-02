import type { ExtractedTable } from './types.js';

export interface JsonParseOptions {
  tableName?: string;
  sourceDetails?: string;
}

/**
 * Recursively flattens a nested object into key-value pairs with dot notation.
 * e.g. { name: "Product A", details: { category: "Electronics", rating: 4.5 } }
 * becomes { "name": "Product A", "details.category": "Electronics", "details.rating": "4.5" }
 */
export function flattenObject(
  obj: Record<string, unknown>,
  prefix = ''
): Record<string, string> {
  const result: Record<string, string> = {};

  for (const key of Object.keys(obj)) {
    const value = obj[key];
    const newKey = prefix ? `${prefix}.${key}` : key;

    if (value === null || value === undefined) {
      result[newKey] = '';
    } else if (Array.isArray(value)) {
      // If array contains primitives, join with commas; if objects, stringify
      const isSimple = value.every((v) => typeof v !== 'object' || v === null);
      if (isSimple) {
        result[newKey] = value.join(', ');
      } else {
        result[newKey] = JSON.stringify(value);
      }
    } else if (typeof value === 'object') {
      // Recurse into nested object
      const nested = flattenObject(value as Record<string, unknown>, newKey);
      Object.assign(result, nested);
    } else {
      result[newKey] = String(value);
    }
  }

  return result;
}

/**
 * Discovers the primary array of records in a JSON structure.
 */
function extractRecordArray(parsed: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(parsed)) {
    return parsed.filter((item) => typeof item === 'object' && item !== null) as Array<Record<string, unknown>>;
  }

  if (typeof parsed === 'object' && parsed !== null) {
    const obj = parsed as Record<string, unknown>;

    // Common container keys
    const candidateKeys = ['data', 'items', 'records', 'rows', 'results', 'elements', 'table'];
    for (const key of candidateKeys) {
      if (Array.isArray(obj[key]) && (obj[key] as unknown[]).length > 0) {
        return (obj[key] as unknown[]).filter(
          (item) => typeof item === 'object' && item !== null
        ) as Array<Record<string, unknown>>;
      }
    }

    // Check if any property is an array of objects
    for (const key of Object.keys(obj)) {
      const val = obj[key];
      if (Array.isArray(val) && val.length > 0 && typeof val[0] === 'object') {
        return val.filter((item) => typeof item === 'object' && item !== null) as Array<Record<string, unknown>>;
      }
    }

    // Single object: treat as a single record
    return [obj];
  }

  return [];
}

/**
 * Parses JSON string or object into an ExtractedTable for DataLens EDA.
 */
export function parseJsonToTable(
  jsonData: string | unknown,
  options: JsonParseOptions = {}
): ExtractedTable | null {
  let parsed: unknown;

  if (typeof jsonData === 'string') {
    try {
      parsed = JSON.parse(jsonData);
    } catch {
      return null;
    }
  } else {
    parsed = jsonData;
  }

  const rawRecords = extractRecordArray(parsed);
  if (rawRecords.length === 0) return null;

  // Flatten every record to dot notation
  const flattenedRecords = rawRecords.map((r) => flattenObject(r));

  // Collect the union of all keys across all records to form consistent headers
  const headerSet = new Set<string>();
  for (const rec of flattenedRecords) {
    for (const key of Object.keys(rec)) {
      headerSet.add(key);
    }
  }

  const headers = Array.from(headerSet);
  if (headers.length === 0) return null;

  // Build standardized rows
  const standardizedRows = flattenedRecords.map((rec) => {
    return headers.map((header) => (rec[header] !== undefined ? rec[header] : ''));
  });

  const id = `datalens-json-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const name = options.tableName || 'Imported JSON Dataset';

  return {
    id,
    index: 0,
    name,
    headers,
    rows: standardizedRows,
    rowIndices: standardizedRows.map((_, i) => i),
    totalRows: standardizedRows.length,
    totalColumns: headers.length,
    hasExplicitHeader: true,
    sampleRows: standardizedRows.slice(0, 10),
    sourceType: 'json',
    sourceDetails: options.sourceDetails || `Flattened ${standardizedRows.length} records across ${headers.length} attributes`,
  };
}
