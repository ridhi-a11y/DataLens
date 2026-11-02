import { detectCleaningIssues } from '../src/cleaning/cleaningEngine.js';
import { generateRecommendations } from '../src/analysis/recommendations.js';
import { analyzeTableColumns } from '../src/analysis/typeInference.js';
import type { ExtractedTable } from '../src/extraction/types.js';

console.log('🧪 Starting Phase 2 Tests (Data Cleaning & Recommendations)...');

const dirtyTable: ExtractedTable = {
  id: 'dirty-1',
  index: 0,
  name: 'Dirty Customer Orders',
  headers: ['OrderID', 'Customer', 'Country', 'Amount', 'Discount'],
  rows: [
    ['101', 'Alice', 'USA', '$1,200', '10%'],
    ['102', 'Bob', 'usa', '$850', '5%'],
    ['103', 'Charlie', 'U.S.A.', 'NA', '0%'], // missing Amount
    ['104', 'David', 'UK', '$2,100', '12%'],
    ['105', 'Eve', 'United Kingdom', '$1,400', '8%'],
    ['101', 'Alice', 'USA', '$1,200', '10%'], // exact duplicate of row 0
    ['106', 'Frank', 'Germany', '$100,000', '15%'], // huge numerical outlier
    ['107', 'Grace', 'Germany', '$1,350', '7%'],
    ['108', 'Heidi', 'France', '$1,600', '9%'],
  ],
  rowIndices: [0, 1, 2, 3, 4, 5, 6, 7, 8],
  totalRows: 9,
  totalColumns: 5,
  hasExplicitHeader: true,
  sampleRows: [],
};

const columns = analyzeTableColumns(dirtyTable);

// Test 1: Data Cleaning Issue Detection
const issues = detectCleaningIssues(dirtyTable, columns);

const duplicateIssue = issues.find((i) => i.type === 'duplicate');
if (!duplicateIssue) throw new Error('Failed to detect duplicate row');
if (duplicateIssue.affectedCount !== 1) throw new Error(`Expected 1 duplicate row, got ${duplicateIssue.affectedCount}`);
console.log('✔ Test 1: Duplicate row detection passed');

// Test 2: Apply Deduplication
const dedupAction = duplicateIssue.actions[0];
const dedupedTable = dedupAction.apply(dirtyTable);
if (dedupedTable.totalRows !== 8) throw new Error(`Expected 8 rows after deduplication, got ${dedupedTable.totalRows}`);
console.log('✔ Test 2: Deduplication non-destructive execution passed');

// Test 3: Missing Value Detection & Imputation
const missingIssue = issues.find((i) => i.type === 'missing' && i.columnName === 'Amount');
if (!missingIssue) throw new Error('Failed to detect missing value in Amount');
const imputeMeanAction = missingIssue.actions.find((a) => a.id.startsWith('impute-mean'));
if (!imputeMeanAction) throw new Error('Missing impute-mean action');
const imputedTable = imputeMeanAction.apply(dirtyTable);
// Row 2 Amount was 'NA', now should be numeric mean
const imputedVal = Number(imputedTable.rows[2][3]);
if (isNaN(imputedVal) || imputedVal <= 0) throw new Error(`Invalid imputed mean value: ${imputedTable.rows[2][3]}`);
console.log('✔ Test 3: Missing value imputation execution passed (filled with ' + imputedVal + ')');

// Test 4: Inconsistent Categorical Label Detection (USA vs usa vs U.S.A.)
const categoryIssue = issues.find((i) => i.type === 'inconsistent_category' && i.columnName === 'Country');
if (!categoryIssue) throw new Error('Failed to detect inconsistent categories in Country');
const standardizeAction = categoryIssue.actions[0];
const standardizedTable = standardizeAction.apply(dirtyTable);
// All USA variants should now be identical
const countryValues = standardizedTable.rows.map((r) => r[2]);
const usaVariants = countryValues.filter((c) => /usa|u\.s\.a/i.test(c));
const allIdentical = usaVariants.every((c) => c === usaVariants[0]);
if (!allIdentical) throw new Error(`Country standardization failed: ${usaVariants.join(', ')}`);
console.log('✔ Test 4: Inconsistent category label standardization passed');

// Test 5: Automatic Statistical Recommendations
const recommendations = generateRecommendations(dirtyTable, columns);
if (recommendations.length === 0) throw new Error('Expected at least one recommendation');
const hasBoxPlot = recommendations.some((r) => r.functionId === 'BOX_PLOT');
const hasScatterOrHeatmap = recommendations.some((r) => r.functionId === 'SCATTER_PLOT' || r.functionId === 'HEATMAP');
if (!hasBoxPlot) throw new Error('Expected Box Plot recommendation for numerical columns');
if (!hasScatterOrHeatmap) throw new Error('Expected Bivariate or Multivariate recommendation');
console.log(`✔ Test 5: Generated ${recommendations.length} data-driven recommendations tailored to column types`);

console.log('🎉 PHASE 2 VERIFICATION TESTS COMPLETED SUCCESSFULLY!');
