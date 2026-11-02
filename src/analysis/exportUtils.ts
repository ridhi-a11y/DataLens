import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { AnalysisResult } from './types.js';
import type { ExtractedTable } from '../extraction/types.js';

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Exports multiple or single analysis results to CSV
 */
export function exportResultsToCSV(results: AnalysisResult[], datasetName: string) {
  const headers = ['Timestamp', 'Dataset', 'Operation', 'Category', 'Primary Column', 'Primary Result', 'Secondary Metric', 'Interpretation'];
  const rows = results.map((r) => {
    const time = new Date(r.timestamp).toISOString();
    const primary = r.primaryMetric ? `${r.primaryMetric.label}: ${r.primaryMetric.value}` : '';
    const secondary = r.primaryMetric?.secondaryLabel ? `${r.primaryMetric.secondaryLabel}: ${r.primaryMetric.secondaryValue}` : '';
    return [
      time,
      r.datasetName,
      r.functionLabel,
      r.category,
      r.primaryColumn,
      primary,
      secondary,
      r.interpretation.replace(/[\r\n]+/g, ' '),
    ];
  });

  const escapeCell = (val: string) => `"${String(val ?? '').replace(/"/g, '""')}"`;
  const csvContent = [headers.map(escapeCell).join(','), ...rows.map((row) => row.map(escapeCell).join(','))].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, `DataLens-${datasetName.replace(/\s+/g, '_')}-Analysis.csv`);
}

/**
 * Exports statistical summaries and raw dataset into an Excel workbook (.xlsx)
 */
export function exportToExcel(results: AnalysisResult[], table: ExtractedTable) {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Summary Statistics
  const summaryData = results.map((r) => ({
    'Analysis ID': r.id,
    'Date & Time': new Date(r.timestamp).toLocaleString(),
    'Operation': r.functionLabel,
    'Category': r.category,
    'Column': r.primaryColumn,
    'Calculated Value': r.primaryMetric?.value ?? 'N/A',
    'Secondary Detail': r.primaryMetric?.secondaryValue ?? 'N/A',
    'Interpretation': r.interpretation,
  }));

  const wsSummary = XLSX.utils.json_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'EDA Summary');

  // Sheet 2: Raw Extracted Table
  const tableData = [table.headers, ...table.rows];
  const wsTable = XLSX.utils.aoa_to_sheet(tableData);
  XLSX.utils.book_append_sheet(wb, wsTable, 'Source Dataset');

  XLSX.writeFile(wb, `DataLens-${(table.name || 'Dataset').replace(/\s+/g, '_')}.xlsx`);
}

/**
 * Exports a PDF analysis report using jsPDF and autoTable
 */
export function exportToPDF(results: AnalysisResult[], table: ExtractedTable, pageTitle?: string, pageUrl?: string) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Header Banner
  doc.setFillColor(79, 70, 229); // Indigo 600
  doc.rect(0, 0, 210, 24, 'F');

  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text('DataLens – Exploratory Data Analysis Report', 14, 15);

  // Metadata Section
  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105);
  doc.text(`Dataset: ${table.name || 'Webpage Table'} (${table.totalRows} rows, ${table.totalColumns} columns)`, 14, 32);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 38);
  if (pageTitle) {
    doc.text(`Page: ${pageTitle}`, 14, 44);
  }
  if (pageUrl) {
    doc.text(`URL: ${pageUrl.slice(0, 80)}`, 14, 49);
  }

  // Summary Table of Analyses
  const tableRows = results.map((r, i) => [
    `#${i + 1}`,
    r.functionLabel,
    r.primaryColumn,
    String(r.primaryMetric?.value ?? 'Visualized'),
    r.interpretation.length > 90 ? `${r.interpretation.slice(0, 87)}...` : r.interpretation,
  ]);

  autoTable(doc, {
    startY: 50,
    head: [['#', 'Operation', 'Column', 'Result', 'Statistical Summary']],
    body: tableRows,
    theme: 'striped',
    headStyles: {
      fillColor: [79, 70, 229],
      textColor: 255,
      fontSize: 9,
      fontStyle: 'bold',
    },
    bodyStyles: {
      fontSize: 8.5,
      textColor: [30, 41, 59],
    },
    columnStyles: {
      0: { cellWidth: 10 },
      1: { cellWidth: 32 },
      2: { cellWidth: 30 },
      3: { cellWidth: 28 },
      4: { cellWidth: 80 },
    },
  });

  doc.save(`DataLens-${(table.name || 'Analysis').replace(/\s+/g, '_')}-Report.pdf`);
}

/**
 * Exports any raw or cleaned ExtractedTable directly to CSV
 */
export function exportTableToCsv(table: ExtractedTable, filename?: string) {
  const escapeCell = (val: string) => `"${String(val ?? '').replace(/"/g, '""')}"`;
  const csvContent = [
    table.headers.map(escapeCell).join(','),
    ...table.rows.map((row) => row.map(escapeCell).join(',')),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, filename || `DataLens-${(table.name || 'Dataset').replace(/\s+/g, '_')}.csv`);
}

/**
 * Exports any raw or cleaned ExtractedTable directly to an Excel sheet (.xlsx)
 */
export function exportTableToExcel(table: ExtractedTable, filename?: string) {
  const wb = XLSX.utils.book_new();
  const wsData = [table.headers, ...table.rows];
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  XLSX.utils.book_append_sheet(wb, ws, 'Cleaned Dataset');
  XLSX.writeFile(wb, filename || `DataLens-${(table.name || 'Dataset').replace(/\s+/g, '_')}.xlsx`);
}
