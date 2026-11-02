import { extractTableStatisticalSummary, generateDatasetInsights } from '../src/ai/insightsEngine.js';
import { planQueryRuleBased, executeNaturalLanguageQuery } from '../src/ai/queryInterpreter.js';
import { analyzeTableColumns } from '../src/analysis/typeInference.js';
import type { ExtractedTable } from '../src/extraction/types.js';

console.log('🧪 Starting Phase 3 Tests (AI Insights & Natural Language Queries)...');

const sampleDataset: ExtractedTable = {
  id: 'test-ai-1',
  index: 0,
  name: 'Tech Corp Financials',
  headers: ['Quarter', 'Revenue', 'Operating_Expenses', 'Region'],
  rows: [
    ['Q1 2024', '1200', '800', 'North America'],
    ['Q2 2024', '1450', '920', 'North America'],
    ['Q3 2024', '1600', '1050', 'Europe'],
    ['Q4 2024', '1900', '1200', 'Europe'],
    ['Q1 2025', '2100', '1350', 'Asia-Pacific'],
    ['Q2 2025', '2400', '1500', 'Asia-Pacific'],
  ],
  rowIndices: [0, 1, 2, 3, 4, 5],
  totalRows: 6,
  totalColumns: 4,
  hasExplicitHeader: true,
  sampleRows: [],
};

const columns = analyzeTableColumns(sampleDataset);

// Test 1: Statistical Summary Extraction
const summary = extractTableStatisticalSummary(sampleDataset, columns);
if (summary.totalRows !== 6 || summary.totalColumns !== 4) {
  throw new Error(`Summary dimensions mismatch: ${summary.totalRows}x${summary.totalColumns}`);
}
const revNum = summary.numerical.find((n) => n.column === 'Revenue');
if (!revNum) throw new Error('Missing Revenue numerical summary');
if (revNum.mean !== 1775) throw new Error(`Expected Revenue mean 1775, got ${revNum.mean}`);
if (summary.correlations.length === 0) throw new Error('Expected correlation calculation between Revenue and Expenses');
console.log(`✔ Test 1: Statistical summary generated (Revenue Mean: ${revNum.mean}, Correlation r: ${summary.correlations[0].r})`);

// Test 2: AI Insights Generation (Deterministic & Synthesized)
const insights = await generateDatasetInsights(sampleDataset, columns);
if (insights.length === 0) throw new Error('Expected at least 1 insight');
const hasHeadline = insights.every((i) => i.headline && i.observation && i.supportingColumns.length > 0);
if (!hasHeadline) throw new Error('Incomplete insight fields detected');
console.log(`✔ Test 2: Generated ${insights.length} structured insights with supporting columns and methodological explanations`);

// Test 3: Natural Language Query Planning
const query1 = 'What is the average revenue?';
const plan1 = planQueryRuleBased(query1, columns);
if (plan1.functionId !== 'MEAN' || plan1.primaryColumn !== 'Revenue') {
  throw new Error(`Plan 1 failed: expected MEAN on Revenue, got ${plan1.functionId} on ${plan1.primaryColumn}`);
}

const query2 = 'Show me the top 3 records by Revenue';
const plan2 = planQueryRuleBased(query2, columns);
if (plan2.intent !== 'TOP_N' || plan2.topN?.n !== 3) {
  throw new Error(`Plan 2 failed: expected TOP_N with n=3, got ${plan2.intent} with n=${plan2.topN?.n}`);
}

const query3 = 'Find records where Revenue exceeds 1500';
const plan3 = planQueryRuleBased(query3, columns);
if (plan3.intent !== 'FILTER' || plan3.filterCondition?.value !== 1500) {
  throw new Error(`Plan 3 failed: expected FILTER > 1500, got ${plan3.intent} > ${plan3.filterCondition?.value}`);
}
console.log('✔ Test 3: Natural language query planning correctly mapped questions to calculations & filters');

// Test 4: End-to-End Natural Language Query Execution
const chatRes1 = await executeNaturalLanguageQuery(query1, sampleDataset, columns);
if (!chatRes1.text.includes('1775')) {
  throw new Error(`Chat execution 1 failed to return calculated mean 1775: "${chatRes1.text}"`);
}
if (!chatRes1.calculatedResult) {
  throw new Error('Chat response missing underlying AnalysisResult');
}

const chatRes2 = await executeNaturalLanguageQuery(query2, sampleDataset, columns);
if (!chatRes2.filteredRows || chatRes2.filteredRows.length !== 3) {
  throw new Error(`Expected 3 top rows, got ${chatRes2.filteredRows?.length}`);
}
// Top row should be Q2 2025 with 2400 revenue
if (chatRes2.filteredRows[0][1] !== '2400') {
  throw new Error(`Top row revenue expected 2400, got ${chatRes2.filteredRows[0][1]}`);
}

console.log('✔ Test 4: End-to-end question answering returned exact calculated values and row rankings');
console.log('🎉 PHASE 3 VERIFICATION TESTS COMPLETED SUCCESSFULLY!');
