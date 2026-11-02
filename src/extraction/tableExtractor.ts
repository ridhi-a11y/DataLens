import type { ExtractedTable, ExtractionResult } from './types.js';

/**
 * Normalizes text extracted from a DOM cell
 */
function cleanCellText(text: string | null | undefined): string {
  if (!text) return '';
  return text
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Finds a descriptive title for an HTML table
 */
function findTableTitle(table: HTMLTableElement, index: number): string {
  // 1. Check table caption
  const caption = table.querySelector('caption');
  if (caption && caption.textContent?.trim()) {
    return cleanCellText(caption.textContent);
  }

  // 2. Check aria-label or title attribute
  const ariaLabel = table.getAttribute('aria-label') || table.getAttribute('title');
  if (ariaLabel && ariaLabel.trim()) {
    return cleanCellText(ariaLabel);
  }

  // 3. Check aria-labelledby
  const labelledBy = table.getAttribute('aria-labelledby');
  if (labelledBy) {
    const labelEl = document.getElementById(labelledBy);
    if (labelEl && labelEl.textContent?.trim()) {
      return cleanCellText(labelEl.textContent);
    }
  }

  // 4. Look for preceding heading in siblings or parent siblings
  let current: Element | null = table;
  let attempts = 0;

  while (current && attempts < 6) {
    let sibling = current.previousElementSibling;
    while (sibling) {
      if (/^H[1-6]$/i.test(sibling.tagName)) {
        const headingText = cleanCellText(sibling.textContent);
        if (headingText && headingText.length < 120) {
          return headingText;
        }
      }
      sibling = sibling.previousElementSibling;
    }
    current = current.parentElement;
    attempts++;
  }

  return `Table ${index + 1}`;
}

/**
 * Parses an HTMLTableElement into an ExtractedTable object
 */
export function parseTableElement(table: HTMLTableElement, index: number): ExtractedTable | null {
  // Mark table element for highlighting
  const tableId = `datalens-table-${index}`;
  table.setAttribute('data-datalens-id', tableId);

  const title = findTableTitle(table, index);

  // Extract all rows directly belonging to this table (ignoring nested tables)
  const allTrElements = Array.from(table.querySelectorAll('tr')).filter(
    (tr) => tr.closest('table') === table
  );

  if (allTrElements.length === 0) {
    return null;
  }

  let headers: string[] = [];
  const rawRows: string[][] = [];
  const rowIndices: number[] = [];
  let hasExplicitHeader = false;

  // Check thead for headers
  const thead = table.querySelector('thead');
  if (thead) {
    const theadRows = Array.from(thead.querySelectorAll('tr')).filter(
      (tr) => tr.closest('table') === table
    );
    if (theadRows.length > 0) {
      const lastHeadRow = theadRows[theadRows.length - 1];
      const thCells = Array.from(lastHeadRow.querySelectorAll('th, td')).filter(
        (cell) => cell.closest('table') === table
      );
      if (thCells.length > 0) {
        headers = thCells.map((cell) => cleanCellText(cell.textContent));
        hasExplicitHeader = true;
      }
    }
  }

  // Process rows
  for (let rIdx = 0; rIdx < allTrElements.length; rIdx++) {
    const tr = allTrElements[rIdx];

    // If this row was already used as thead header, skip
    if (thead && thead.contains(tr)) {
      continue;
    }

    const cells = Array.from(tr.querySelectorAll('th, td')).filter(
      (cell) => cell.closest('table') === table
    );

    if (cells.length === 0) continue;

    // Check if the very first row has only <th> and we don't have headers yet
    const isAllTh = cells.every((c) => c.tagName.toLowerCase() === 'th');
    if (!hasExplicitHeader && rIdx === 0 && (isAllTh || cells.length > 0)) {
      headers = cells.map((cell) => cleanCellText(cell.textContent));
      hasExplicitHeader = true;
      continue;
    }

    const rowData: string[] = [];
    cells.forEach((cell) => {
      const text = cleanCellText(cell.textContent);
      const colSpan = Number(cell.getAttribute('colspan')) || 1;
      for (let s = 0; s < Math.min(colSpan, 10); s++) {
        rowData.push(text);
      }
    });

    // Ignore completely empty rows
    if (rowData.some((val) => val.length > 0)) {
      rawRows.push(rowData);
      rowIndices.push(rIdx);
    }
  }

  // Determine maximum column count across all parsed rows
  const maxCols = Math.max(
    headers.length,
    ...rawRows.map((r) => r.length),
    0
  );

  // If table has no meaningful data, filter it out
  if (maxCols === 0 || (rawRows.length === 0 && headers.length === 0)) {
    return null;
  }

  // If we still have no headers, generate default column names
  if (headers.length === 0) {
    headers = Array.from({ length: maxCols }, (_, i) => `Column ${i + 1}`);
  } else if (headers.length < maxCols) {
    // Pad headers if some rows have more columns
    for (let i = headers.length; i < maxCols; i++) {
      headers.push(`Column ${i + 1}`);
    }
  }

  // Standardize row lengths to maxCols
  const standardizedRows = rawRows.map((row) => {
    if (row.length < maxCols) {
      return [...row, ...Array(maxCols - row.length).fill('')];
    }
    return row.slice(0, maxCols);
  });

  return {
    id: tableId,
    index,
    name: title,
    headers,
    rows: standardizedRows,
    rowIndices: rowIndices.length === standardizedRows.length ? rowIndices : standardizedRows.map((_, i) => i),
    totalRows: standardizedRows.length,
    totalColumns: maxCols,
    hasExplicitHeader,
    sampleRows: standardizedRows.slice(0, 10),
    sourceType: 'html',
    sourceDetails: `Extracted from HTML <table> with ${standardizedRows.length} rows`,
  };
}

/**
 * Scans the active document and same-origin iframes for HTML tables
 */
export function extractTablesFromDocument(doc: Document = document): ExtractionResult {
  try {
    const tableElements: HTMLTableElement[] = Array.from(doc.querySelectorAll('table'));

    // Module 4: Support same-origin iframes
    const iframes = Array.from(doc.querySelectorAll('iframe'));
    for (const iframe of iframes) {
      try {
        const iframeDoc = iframe.contentDocument;
        if (iframeDoc) {
          const iframeTables = Array.from(iframeDoc.querySelectorAll('table'));
          tableElements.push(...iframeTables);
        }
      } catch {
        // Cross-origin iframes are naturally restricted by browser security policies
      }
    }

    const validTables: ExtractedTable[] = [];

    let detectedIndex = 0;
    for (const tableEl of tableElements) {
      // Filter out invisible or purely layout tables
      const style = window.getComputedStyle(tableEl);
      if (style.display === 'none' || style.visibility === 'hidden') {
        continue;
      }

      // Check if table has some dimension
      const rect = tableEl.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0 && !tableEl.offsetParent) {
        continue;
      }

      const parsed = parseTableElement(tableEl, detectedIndex);
      if (parsed) {
        validTables.push(parsed);
        detectedIndex++;
      }
    }

    const totalCells = validTables.reduce(
      (acc, t) => acc + t.totalRows * t.totalColumns,
      0
    );

    return {
      success: true,
      metadata: {
        extractedAt: Date.now(),
        pageTitle: doc.title || 'Untitled Page',
        pageUrl: window.location.href,
        totalTables: validTables.length,
        totalCells,
      },
      tables: validTables,
    };
  } catch (error) {
    return {
      success: false,
      metadata: {
        extractedAt: Date.now(),
        pageTitle: doc.title || '',
        pageUrl: window.location.href,
        totalTables: 0,
        totalCells: 0,
      },
      tables: [],
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Highlights a table on the web page when selected in the side panel
 */
export function highlightTable(tableId: string): boolean {
  // Remove existing highlights
  document.querySelectorAll('[data-datalens-highlight]').forEach((el) => {
    el.removeAttribute('data-datalens-highlight');
    if (el instanceof HTMLElement) {
      el.style.outline = '';
      el.style.boxShadow = '';
      el.style.transition = '';
    }
  });

  const table = document.querySelector(`[data-datalens-id="${tableId}"]`);
  if (!table || !(table instanceof HTMLElement)) {
    return false;
  }

  // Scroll into view smoothly
  table.scrollIntoView({ behavior: 'smooth', block: 'center' });

  // Add noticeable temporary outline
  table.setAttribute('data-datalens-highlight', 'true');
  table.style.transition = 'outline 0.3s ease, box-shadow 0.3s ease';
  table.style.outline = '3px solid #6366f1';
  table.style.boxShadow = '0 0 0 6px rgba(99, 102, 241, 0.25)';

  setTimeout(() => {
    if (table.getAttribute('data-datalens-highlight') === 'true') {
      table.style.outline = '2px solid rgba(99, 102, 241, 0.6)';
      table.style.boxShadow = 'none';
    }
  }, 2500);

  return true;
}
