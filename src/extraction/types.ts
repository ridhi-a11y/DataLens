export type DatasetSource = 'html' | 'csv' | 'json' | 'file';

export interface TableColumn {
  id: string;
  name: string;
  index: number;
}

export interface ExtractedTable {
  id: string;
  index: number;
  name: string;
  headers: string[];
  rows: string[][];
  rowIndices: number[]; // 0-based index of original table row for each row
  totalRows: number;
  totalColumns: number;
  hasExplicitHeader: boolean;
  sampleRows: string[][]; // up to 10 rows for quick inspection
  sourceType?: DatasetSource;
  sourceDetails?: string;
}

export interface ExtractionMetadata {
  extractedAt: number;
  pageTitle: string;
  pageUrl: string;
  totalTables: number;
  totalCells: number;
}

export interface ExtractionResult {
  success: boolean;
  metadata: ExtractionMetadata;
  tables: ExtractedTable[];
  error?: string;
}
