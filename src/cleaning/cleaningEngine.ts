import type { ExtractedTable } from '../extraction/types.js';
import type { ColumnInfo } from '../analysis/types.js';
import { computeDescriptiveStats, detectOutliers } from '../analysis/statistics.js';
import { parseCleanNumber, type CleanedRowData } from '../analysis/typeInference.js';

export type IssueType =
  | 'missing'
  | 'duplicate'
  | 'inconsistent_category'
  | 'dirty_numerical'
  | 'outlier';

export interface CleaningAction {
  id: string;
  label: string;
  description: string;
  apply: (table: ExtractedTable) => ExtractedTable;
}

export interface CleaningIssue {
  id: string;
  type: IssueType;
  columnName?: string;
  columnIndex?: number;
  title: string;
  description: string;
  affectedCount: number;
  affectedRowIndices: number[];
  sampleValues: string[];
  actions: CleaningAction[];
}

/**
 * Calculates Levenshtein distance between two strings
 */
function levenshtein(a: string, b: string): number {
  const an = a.length;
  const bn = b.length;
  if (an === 0) return bn;
  if (bn === 0) return an;

  const matrix = Array.from({ length: bn + 1 }, () => new Array(an + 1).fill(0));
  for (let i = 0; i <= an; i++) matrix[0][i] = i;
  for (let j = 0; j <= bn; j++) matrix[j][0] = j;

  for (let j = 1; j <= bn; j++) {
    for (let i = 1; i <= an; i++) {
      if (b[j - 1] === a[i - 1]) {
        matrix[j][i] = matrix[j - 1][i - 1];
      } else {
        matrix[j][i] = Math.min(
          matrix[j - 1][i - 1] + 1, // substitution
          matrix[j][i - 1] + 1,     // insertion
          matrix[j - 1][i] + 1      // deletion
        );
      }
    }
  }
  return matrix[bn][an];
}

/**
 * Detects all potential data quality issues and generates non-destructive cleaning actions.
 */
export function detectCleaningIssues(
  table: ExtractedTable,
  columns: ColumnInfo[]
): CleaningIssue[] {
  const issues: CleaningIssue[] = [];

  // 1. DUPLICATE ROWS DETECTION
  const seenRowStrings = new Map<string, number[]>();
  table.rows.forEach((row, idx) => {
    const key = row.map((c) => c.trim().toLowerCase()).join('||');
    const existing = seenRowStrings.get(key) || [];
    existing.push(idx);
    seenRowStrings.set(key, existing);
  });

  const duplicateRowIndices: number[] = [];
  seenRowStrings.forEach((indices) => {
    if (indices.length > 1) {
      // All occurrences after the first are duplicates
      duplicateRowIndices.push(...indices.slice(1));
    }
  });

  if (duplicateRowIndices.length > 0) {
    issues.push({
      id: 'issue-duplicates',
      type: 'duplicate',
      title: `${duplicateRowIndices.length} Duplicate Rows Detected`,
      description: `Identical row observations found across all columns. Keeping duplicates can artificially skew variance and counts.`,
      affectedCount: duplicateRowIndices.length,
      affectedRowIndices: duplicateRowIndices,
      sampleValues: duplicateRowIndices.slice(0, 3).map((idx) => `Row #${idx + 1}: ${table.rows[idx].slice(0, 3).join(', ')}...`),
      actions: [
        {
          id: 'remove-duplicates',
          label: 'Deduplicate (Remove Exact Duplicates)',
          description: `Retain the first unique occurrence and drop ${duplicateRowIndices.length} duplicate rows.`,
          apply: (t) => {
            const keepIndices = new Set<number>();
            const seen = new Set<string>();
            t.rows.forEach((r, i) => {
              const k = r.map((c) => c.trim().toLowerCase()).join('||');
              if (!seen.has(k)) {
                seen.add(k);
                keepIndices.add(i);
              }
            });
            const newRows = t.rows.filter((_, i) => keepIndices.has(i));
            return {
              ...t,
              rows: newRows,
              rowIndices: newRows.map((_, i) => i),
              totalRows: newRows.length,
              sampleRows: newRows.slice(0, 10),
            };
          },
        },
      ],
    });
  }

  // 2. COLUMN-SPECIFIC CHECKS
  columns.forEach((col) => {
    const colIdx = col.index;
    const rawValues = table.rows.map((r) => r[colIdx] || '');

    // A. Missing Values
    const missingIndices: number[] = [];
    rawValues.forEach((val, idx) => {
      const v = val.trim().toLowerCase();
      if (!v || v === 'na' || v === 'n/a' || v === 'null' || v === 'none' || v === '-' || v === 'nan') {
        missingIndices.push(idx);
      }
    });

    if (missingIndices.length > 0) {
      const missingPct = ((missingIndices.length / table.totalRows) * 100).toFixed(1);
      const actions: CleaningAction[] = [
        {
          id: `drop-missing-${col.name}`,
          label: `Drop rows with missing "${col.name}"`,
          description: `Safely delete ${missingIndices.length} rows (${missingPct}%) that lack a value for this column.`,
          apply: (t) => {
            const newRows = t.rows.filter((_, i) => !missingIndices.includes(i));
            return {
              ...t,
              rows: newRows,
              rowIndices: newRows.map((_, i) => i),
              totalRows: newRows.length,
              sampleRows: newRows.slice(0, 10),
            };
          },
        },
      ];

      // If numerical, offer Mean and Median imputation
      if (col.dataType === 'numerical') {
        const cleanedData: CleanedRowData<number>[] = [];
        rawValues.forEach((val, idx) => {
          const num = parseCleanNumber(val);
          if (num !== null) {
            cleanedData.push({ rowIndex: idx, displayRow: idx + 1, rawValue: String(val), value: num });
          }
        });

        const stats = computeDescriptiveStats(cleanedData, missingIndices.length);
        if (stats.mean !== undefined) {
          const meanFormatted = stats.mean.toFixed(2);
          actions.push({
            id: `impute-mean-${col.name}`,
            label: `Impute missing with Mean (${meanFormatted})`,
            description: `Replace all ${missingIndices.length} missing cells with the calculated sample mean.`,
            apply: (t) => {
              const newRows = t.rows.map((row, i) => {
                if (missingIndices.includes(i)) {
                  const updated = [...row];
                  updated[colIdx] = meanFormatted;
                  return updated;
                }
                return row;
              });
              return { ...t, rows: newRows, sampleRows: newRows.slice(0, 10) };
            },
          });
        }

        if (stats.median !== undefined) {
          const medianFormatted = stats.median.toFixed(2);
          actions.push({
            id: `impute-median-${col.name}`,
            label: `Impute missing with Median (${medianFormatted})`,
            description: `Replace all ${missingIndices.length} missing cells with the robust column median.`,
            apply: (t) => {
              const newRows = t.rows.map((row, i) => {
                if (missingIndices.includes(i)) {
                  const updated = [...row];
                  updated[colIdx] = medianFormatted;
                  return updated;
                }
                return row;
              });
              return { ...t, rows: newRows, sampleRows: newRows.slice(0, 10) };
            },
          });
        }
      }

      // If categorical, offer Mode imputation
      if (col.dataType === 'categorical') {
        const counts = new Map<string, number>();
        rawValues.forEach((val) => {
          const v = val.trim();
          if (v && !['na', 'n/a', 'null', 'none', '-'].includes(v.toLowerCase())) {
            counts.set(v, (counts.get(v) || 0) + 1);
          }
        });
        let topCategory = '';
        let topCount = 0;
        counts.forEach((cnt, cat) => {
          if (cnt > topCount) {
            topCount = cnt;
            topCategory = cat;
          }
        });
        if (topCategory) {
          actions.push({
            id: `impute-mode-${col.name}`,
            label: `Impute missing with Mode ("${topCategory}")`,
            description: `Fill empty records with the most frequent category.`,
            apply: (t) => {
              const newRows = t.rows.map((row, i) => {
                if (missingIndices.includes(i)) {
                  const updated = [...row];
                  updated[colIdx] = topCategory;
                  return updated;
                }
                return row;
              });
              return { ...t, rows: newRows, sampleRows: newRows.slice(0, 10) };
            },
          });
        }
      }

      issues.push({
        id: `issue-missing-${col.name}`,
        type: 'missing',
        columnName: col.name,
        columnIndex: colIdx,
        title: `${missingIndices.length} Missing Values in "${col.name}" (${missingPct}%)`,
        description: `Empty or null records can bias aggregations and lead to calculation errors.`,
        affectedCount: missingIndices.length,
        affectedRowIndices: missingIndices,
        sampleValues: missingIndices.slice(0, 3).map((idx) => `Row #${idx + 1}`),
        actions,
      });
    }

    // B. Formatting / Dirty Numerical Strings (e.g. '$1,200', '15.5%')
    if (col.dataType === 'numerical') {
      const dirtyIndices: number[] = [];
      rawValues.forEach((val, idx) => {
        if (!val) return;
        const cleaned = parseCleanNumber(val);
        // If string had symbols like $, %, commas, but parses to a clean number
        if (cleaned !== null && /[$,%£€¥\s]/.test(val)) {
          dirtyIndices.push(idx);
        }
      });

      if (dirtyIndices.length > 0) {
        issues.push({
          id: `issue-formatting-${col.name}`,
          type: 'dirty_numerical',
          columnName: col.name,
          columnIndex: colIdx,
          title: `Raw Currency/Symbols in "${col.name}"`,
          description: `${dirtyIndices.length} values contain commas, dollar signs ($), or percent symbols (%) that can be standardized to clean raw numeric values.`,
          affectedCount: dirtyIndices.length,
          affectedRowIndices: dirtyIndices,
          sampleValues: dirtyIndices.slice(0, 3).map((idx) => `Row #${idx + 1}: "${rawValues[idx]}"`),
          actions: [
            {
              id: `standardize-numbers-${col.name}`,
              label: `Standardize to Pure Decimals`,
              description: `Strip non-numeric symbols ($ , % space) while preserving numbers.`,
              apply: (t) => {
                const newRows = t.rows.map((row, i) => {
                  if (dirtyIndices.includes(i)) {
                    const updated = [...row];
                    const num = parseCleanNumber(row[colIdx]);
                    if (num !== null) updated[colIdx] = String(num);
                    return updated;
                  }
                  return row;
                });
                return { ...t, rows: newRows, sampleRows: newRows.slice(0, 10) };
              },
            },
          ],
        });
      }

      // C. Outlier Detection in Numerical Columns
      const validCleaned: CleanedRowData<number>[] = [];
      rawValues.forEach((v, idx) => {
        const n = parseCleanNumber(v);
        if (n !== null) {
          validCleaned.push({ rowIndex: idx, displayRow: idx + 1, rawValue: String(v), value: n });
        }
      });

      if (validCleaned.length >= 6) {
        const outliers = detectOutliers(validCleaned);

        if (outliers.items.length > 0) {
          const outlierRowIndices = outliers.items.map((item) => item.rowIndex);
          issues.push({
            id: `issue-outliers-${col.name}`,
            type: 'outlier',
            columnName: col.name,
            columnIndex: colIdx,
            title: `${outliers.count} Statistical Outliers in "${col.name}"`,
            description: `Values falling outside Tukey's fences [${outliers.lowerBound.toFixed(2)}, ${outliers.upperBound.toFixed(2)}].`,
            affectedCount: outliers.count,
            affectedRowIndices: outlierRowIndices,
            sampleValues: outliers.items.slice(0, 3).map((item) => `Value ${item.value} (${item.severity})`),
            actions: [
              {
                id: `exclude-outliers-${col.name}`,
                label: `Filter Outliers from Dataset`,
                description: `Exclude ${outliers.count} anomalous rows from the active working dataset.`,
                apply: (t) => {
                  const newRows = t.rows.filter((_, i) => !outlierRowIndices.includes(i));
                  return {
                    ...t,
                    rows: newRows,
                    rowIndices: newRows.map((_, i) => i),
                    totalRows: newRows.length,
                    sampleRows: newRows.slice(0, 10),
                  };
                },
              },
            ],
          });
        }
      }
    }

    // D. Inconsistent Categorical Labels (e.g. 'USA' vs 'usa' vs 'U.S.A.')
    if (col.dataType === 'categorical') {
      const frequencyMap = new Map<string, number>();
      rawValues.forEach((v) => {
        const trimmed = v.trim();
        if (trimmed) {
          frequencyMap.set(trimmed, (frequencyMap.get(trimmed) || 0) + 1);
        }
      });

      const uniqueValues = Array.from(frequencyMap.keys());
      const replacements = new Map<string, string>();

      // Check near-identical strings using cluster grouping
      const clusters: string[][] = [];

      for (const val of uniqueValues) {
        let placedInCluster = false;
        for (const cluster of clusters) {
          const rep = cluster[0];
          const isCaseMatch = val.toLowerCase() === rep.toLowerCase();
          const isPunctMatch = val.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() === rep.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
          const isNearMatch = Math.abs(val.length - rep.length) <= 2 && levenshtein(val.toLowerCase(), rep.toLowerCase()) === 1;

          if (isCaseMatch || isPunctMatch || isNearMatch) {
            cluster.push(val);
            placedInCluster = true;
            break;
          }
        }
        if (!placedInCluster) {
          clusters.push([val]);
        }
      }

      for (const cluster of clusters) {
        if (cluster.length > 1) {
          // Sort cluster: highest frequency first, then preferred uppercase
          cluster.sort((a, b) => {
            const countA = frequencyMap.get(a) || 0;
            const countB = frequencyMap.get(b) || 0;
            if (countB !== countA) return countB - countA;
            return b.localeCompare(a);
          });
          const canonical = cluster[0];
          for (let k = 1; k < cluster.length; k++) {
            replacements.set(cluster[k], canonical);
          }
        }
      }

      if (replacements.size > 0) {
        const affectedIndices: number[] = [];
        rawValues.forEach((val, idx) => {
          if (replacements.has(val.trim())) {
            affectedIndices.push(idx);
          }
        });

        issues.push({
          id: `issue-categories-${col.name}`,
          type: 'inconsistent_category',
          columnName: col.name,
          columnIndex: colIdx,
          title: `Inconsistent Labels in "${col.name}"`,
          description: `Discovered near-duplicate categorical labels (e.g., casing or formatting differences) that split category counts.`,
          affectedCount: affectedIndices.length,
          affectedRowIndices: affectedIndices,
          sampleValues: Array.from(replacements.entries()).slice(0, 3).map(([from, to]) => `"${from}" → "${to}"`),
          actions: [
            {
              id: `standardize-categories-${col.name}`,
              label: `Standardize Categorical Labels`,
              description: `Unify category variations to their dominant canonical representations.`,
              apply: (t) => {
                const newRows = t.rows.map((row) => {
                  const val = (row[colIdx] || '').trim();
                  if (replacements.has(val)) {
                    const updated = [...row];
                    updated[colIdx] = replacements.get(val)!;
                    return updated;
                  }
                  return row;
                });
                return { ...t, rows: newRows, sampleRows: newRows.slice(0, 10) };
              },
            },
          ],
        });
      }
    }
  });

  return issues;
}
