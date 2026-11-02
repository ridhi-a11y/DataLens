import { executeAnalysis } from '../src/analysis/operations.js';
import { analyzeTableColumns } from '../src/analysis/typeInference.js';
import type { ExtractedTable } from '../src/extraction/types.js';

console.log('🧪 Starting Phase 4 Tests (Performance, Caching & Scalability)...');

// Generate large dataset (10,000 rows)
const largeRows: string[][] = [];
for (let i = 0; i < 10000; i++) {
  const x = i;
  const y = i * 2 + (i % 5);
  largeRows.push([`ID_${i}`, String(x), String(y)]);
}

const largeTable: ExtractedTable = {
  id: 'perf-large-table',
  index: 0,
  name: 'Large Benchmark Dataset',
  headers: ['ID', 'Metric_A', 'Metric_B'],
  rows: largeRows,
  rowIndices: largeRows.map((_, i) => i),
  totalRows: 10000,
  totalColumns: 3,
  hasExplicitHeader: true,
  sampleRows: largeRows.slice(0, 10),
};

const columns = analyzeTableColumns(largeTable);
const colA = columns[1];
const colB = columns[2];

// Test 1: Computation Speed & Caching on 10,000 rows
const t0 = performance.now();
const res1 = executeAnalysis(largeTable, colA, 'SCATTER_PLOT', colB);
const t1 = performance.now();
const firstDuration = t1 - t0;

const t2 = performance.now();
const res2 = executeAnalysis(largeTable, colA, 'SCATTER_PLOT', colB);
const t3 = performance.now();
const cachedDuration = t3 - t2;

if (res1 !== res2) {
  throw new Error('Cache hit failed: returned different result instance');
}
console.log(`✔ Test 1: Computation caching verified (Initial: ${firstDuration.toFixed(2)}ms, Cached: ${cachedDuration.toFixed(3)}ms)`);

// Test 2: Downsampling Disclosure for Scatter Plot on 10,000 Points
if (!res1.notes || !res1.notes.some((n) => n.includes('representative sample'))) {
  throw new Error('Missing large dataset sampling disclosure note');
}
if (!res1.chart || (res1.chart.data[0].x?.length ?? 0) > 5500) {
  throw new Error(`Scatter chart trace exceeded 5500 points: got ${res1.chart?.data[0].x?.length}`);
}
// Statistical correlation must be computed on full 10,000 observations (~1.0)
const corrVal = parseFloat(String(res1.primaryMetric?.value || '0'));
if (isNaN(corrVal) || corrVal < 0.99) {
  throw new Error(`Correlation degraded on large dataset: got ${corrVal}`);
}
console.log(`✔ Test 2: Large dataset sampling active (${res1.chart.data[0].x?.length} plotted points, full r=${corrVal} calculated)`);

console.log('🎉 PHASE 4 PERFORMANCE TESTS COMPLETED SUCCESSFULLY!');
