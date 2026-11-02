import assert from 'node:assert';
import {
  computeDescriptiveStats,
  calculatePercentile,
  detectOutliers,
  computePearsonCorrelation,
  computeFrequencyDistribution,
} from '../src/analysis/statistics.ts';
import {
  inferColumnType,
  parseCleanNumber,
  parseCleanDate,
  parseCleanBoolean,
  getCleanedNumericalColumn,
} from '../src/analysis/typeInference.ts';
import {
  getCompatibleFunctions,
  executeAnalysis,
} from '../src/analysis/operations.ts';
import type { ExtractedTable } from '../src/extraction/types.ts';

console.log('🧪 Starting Statistical and EDA Engine Verification...\n');

// 1. Known Dataset Test: [10, 20, 30, 40, 50]
// Mean = 30
// Median = 30
// Sum = 150
// Min = 10, Max = 50, Range = 40
// Population Variance = ((10-30)^2 + (20-30)^2 + 0 + (40-30)^2 + (50-30)^2) / 5 = (400+100+0+100+400)/5 = 1000/5 = 200
// Sample Variance = 1000 / 4 = 250
// Sample Std Dev = sqrt(250) ≈ 15.8114
// Population Std Dev = sqrt(200) ≈ 14.1421
// Q1 = 20, Q2 = 30, Q3 = 40, IQR = 20
// Skewness = 0 (symmetric)

const dataset1 = [
  { rowIndex: 0, displayRow: 1, value: 10, rawValue: '10' },
  { rowIndex: 1, displayRow: 2, value: 20, rawValue: '20' },
  { rowIndex: 2, displayRow: 3, value: 30, rawValue: '30' },
  { rowIndex: 3, displayRow: 4, value: 40, rawValue: '40' },
  { rowIndex: 4, displayRow: 5, value: 50, rawValue: '50' },
];

const stats1 = computeDescriptiveStats(dataset1, 0);

assert.strictEqual(stats1.count, 5);
assert.strictEqual(stats1.mean, 30);
assert.strictEqual(stats1.median, 30);
assert.strictEqual(stats1.sum, 150);
assert.strictEqual(stats1.min, 10);
assert.strictEqual(stats1.max, 50);
assert.strictEqual(stats1.range, 40);
assert.strictEqual(stats1.sampleVariance, 250);
assert.strictEqual(stats1.populationVariance, 200);
assert.strictEqual(Math.round(stats1.sampleStdDev! * 10000) / 10000, 15.8114);
assert.strictEqual(Math.round(stats1.populationStdDev! * 10000) / 10000, 14.1421);
assert.strictEqual(stats1.q1, 20);
assert.strictEqual(stats1.q3, 40);
assert.strictEqual(stats1.iqr, 20);
assert.strictEqual(stats1.skewness, 0);
console.log('✔ Test 1: Known standard descriptive statistics verified mathematically');

// 2. Outlier Detection Test (Tukey's fences)
// Normal values: [10, 12, 13, 15, 16, 18, 20], Outlier: 100
const datasetWithOutlier = [
  { rowIndex: 0, displayRow: 1, value: 10, rawValue: '10' },
  { rowIndex: 1, displayRow: 2, value: 12, rawValue: '12' },
  { rowIndex: 2, displayRow: 3, value: 13, rawValue: '13' },
  { rowIndex: 3, displayRow: 4, value: 15, rawValue: '15' },
  { rowIndex: 4, displayRow: 5, value: 16, rawValue: '16' },
  { rowIndex: 5, displayRow: 6, value: 18, rawValue: '18' },
  { rowIndex: 6, displayRow: 7, value: 20, rawValue: '20' },
  { rowIndex: 7, displayRow: 8, value: 100, rawValue: '100' }, // Outlier
];

const outliers = detectOutliers(datasetWithOutlier);
assert.strictEqual(outliers.count, 1, 'Should find 1 outlier');
assert.strictEqual(outliers.items[0].value, 100);
assert.strictEqual(outliers.items[0].rowIndex, 7);
console.log('✔ Test 2: Tukey fence outlier detection correctly identified row 7 with value 100');

// 3. Pearson Correlation Test: Perfect positive correlation r = 1.0
const xSeries = [1, 2, 3, 4, 5];
const ySeries = [2, 4, 6, 8, 10];
const rPerfect = computePearsonCorrelation(xSeries, ySeries);
assert.strictEqual(rPerfect, 1.0, 'Linear series should have r = 1.0');

// Inverse correlation r = -1.0
const yInverse = [10, 8, 6, 4, 2];
const rInverse = computePearsonCorrelation(xSeries, yInverse);
assert.strictEqual(rInverse, -1.0, 'Inverse series should have r = -1.0');
console.log('✔ Test 3: Pearson correlation r mathematically verified (+1.0 and -1.0)');

// 4. Type Inference on Messy Real-World Data
assert.strictEqual(parseCleanNumber('$1,450.75'), 1450.75);
assert.strictEqual(parseCleanNumber('24.5%'), 24.5);
assert.strictEqual(parseCleanNumber('(500)'), -500); // Accounting negative
assert.strictEqual(parseCleanNumber('€ 9,999.00'), 9999.0);
assert.strictEqual(parseCleanNumber('N/A'), null);

const numColInference = inferColumnType(['$100', '$200', 'N/A', '$450', '500']);
assert.strictEqual(numColInference.dataType, 'numerical');
assert.strictEqual(numColInference.validCount, 4);
assert.strictEqual(numColInference.missingCount, 1);

const catColInference = inferColumnType(['North America', 'EMEA', 'APAC', 'LATAM']);
assert.strictEqual(catColInference.dataType, 'categorical');

const dateColInference = inferColumnType(['2025-01-15', '2025-02-20', '2025-03-25']);
assert.strictEqual(dateColInference.dataType, 'date');

const boolColInference = inferColumnType(['True', 'False', 'true', 'false']);
assert.strictEqual(boolColInference.dataType, 'boolean');
console.log('✔ Test 4: Automatic data type inference passed across numerical, categorical, date, boolean');

// 5. Incompatible Functions Filter Test
const numFuncs = getCompatibleFunctions('numerical');
const catFuncs = getCompatibleFunctions('categorical');

assert.ok(numFuncs.some((f) => f.id === 'MEAN'), 'Numerical must support MEAN');
assert.ok(numFuncs.some((f) => f.id === 'BOX_PLOT'), 'Numerical must support BOX_PLOT');
assert.ok(numFuncs.some((f) => f.id === 'SCATTER_PLOT'), 'Numerical must support SCATTER_PLOT');

assert.ok(!catFuncs.some((f) => f.id === 'MEAN'), 'Categorical must NOT support MEAN');
assert.ok(!catFuncs.some((f) => f.id === 'VARIANCE'), 'Categorical must NOT support VARIANCE');
assert.ok(!catFuncs.some((f) => f.id === 'BOX_PLOT'), 'Categorical must NOT support BOX_PLOT');
assert.ok(catFuncs.some((f) => f.id === 'BAR_CHART'), 'Categorical must support BAR_CHART');
assert.ok(catFuncs.some((f) => f.id === 'FREQUENCY_DIST'), 'Categorical must support FREQUENCY_DIST');
console.log('✔ Test 5: Incompatible function filtering strictly enforced');

// 6. Complete End-to-End Analysis Execution on Table
const testTable: ExtractedTable = {
  id: 'table-test',
  index: 0,
  name: 'Employee Compensation Table',
  headers: ['Department', 'Salary', 'Bonus'],
  rows: [
    ['Engineering', '120000', '15000'],
    ['Engineering', '140000', '20000'],
    ['Sales', '90000', '35000'],
    ['Sales', '110000', '28000'],
    ['Product', '130000', '18000'],
  ],
  rowIndices: [0, 1, 2, 3, 4],
  totalRows: 5,
  totalColumns: 3,
  hasExplicitHeader: true,
  sampleRows: [],
};

const salaryCol = {
  index: 1,
  name: 'Salary',
  dataType: 'numerical' as const,
  totalCount: 5,
  missingCount: 0,
  validCount: 5,
  uniqueCount: 5,
};

const bonusCol = {
  index: 2,
  name: 'Bonus',
  dataType: 'numerical' as const,
  totalCount: 5,
  missingCount: 0,
  validCount: 5,
  uniqueCount: 5,
};

// Test Mean
const meanResult = executeAnalysis(testTable, salaryCol, 'MEAN');
assert.strictEqual(meanResult.primaryMetric?.value, 118000);
assert.ok(meanResult.interpretation.includes('118,000'));

// Test Scatter Plot (2 Columns)
const scatterResult = executeAnalysis(testTable, salaryCol, 'SCATTER_PLOT', bonusCol);
assert.ok(scatterResult.chart);
assert.strictEqual(scatterResult.chart.chartType, 'scatter');
assert.strictEqual(scatterResult.chart.data[0].x?.length, 5);
assert.strictEqual(scatterResult.chart.data[0].customdata?.length, 5);

// Test Heatmap
const heatmapResult = executeAnalysis(testTable, salaryCol, 'HEATMAP', undefined, ['Salary', 'Bonus']);
assert.ok(heatmapResult.chart);
assert.strictEqual(heatmapResult.chart.chartType, 'heatmap');
assert.strictEqual(heatmapResult.chart.data[0].z?.length, 2);

// Test Line Chart
const lineResult = executeAnalysis(testTable, salaryCol, 'LINE_CHART');
assert.ok(lineResult.chart);
assert.strictEqual(lineResult.chart.chartType, 'line');
assert.strictEqual(lineResult.chart.data[0].mode, 'lines+markers');

console.log('✔ Test 6: End-to-end execution of descriptive, 2-column scatter, line chart, and correlation heatmap passed');

console.log('\n🎉 ALL STATISTICAL AND EDA TESTS PASSED WITH 100% MATHEMATICAL ACCURACY!\n');
