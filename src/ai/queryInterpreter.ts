import type { ExtractedTable } from '../extraction/types.js';
import type { ColumnInfo, FunctionId, AnalysisResult } from '../analysis/types.js';
import { executeAnalysis } from '../analysis/operations.js';
import { parseCleanNumber } from '../analysis/typeInference.js';
import { callGemini } from './geminiClient.js';
import type { ChatMessage, NaturalLanguageQueryPlan } from './types.js';

/**
 * Finds the closest matching column name in the dataset
 */
function findClosestColumn(query: string, columns: ColumnInfo[]): ColumnInfo | null {
  const lower = query.toLowerCase();

  // 1. Exact or substring match
  for (const col of columns) {
    const colLower = col.name.toLowerCase();
    if (lower.includes(colLower) || colLower.includes(lower)) {
      return col;
    }
  }

  // 2. Token overlap
  const queryTokens = lower.split(/[^a-zA-Z0-9]+/).filter((t) => t.length > 2);
  let bestCol: ColumnInfo | null = null;
  let maxOverlap = 0;

  for (const col of columns) {
    const colTokens = col.name.toLowerCase().split(/[^a-zA-Z0-9]+/);
    const overlap = queryTokens.filter((t) => colTokens.includes(t)).length;
    if (overlap > maxOverlap) {
      maxOverlap = overlap;
      bestCol = col;
    }
  }

  if (bestCol) return bestCol;

  // Default to first numerical column if exists
  return columns.find((c) => c.dataType === 'numerical') || columns[0] || null;
}

/**
 * Deterministic query planner that resolves natural language intents into engine operations
 */
export function planQueryRuleBased(
  query: string,
  columns: ColumnInfo[]
): NaturalLanguageQueryPlan {
  const lower = query.toLowerCase();
  const targetCol = findClosestColumn(query, columns);
  const colName = targetCol ? targetCol.name : columns[0]?.name;

  // 1. TOP N RECORDS (e.g. "top 5 records", "highest 3 sales")
  const topMatch = lower.match(/(?:top|highest|best|first)\s*(\d+)?/);
  if (topMatch && (lower.includes('record') || lower.includes('row') || targetCol?.dataType === 'numerical')) {
    const n = topMatch[1] ? parseInt(topMatch[1], 10) : 5;
    return {
      intent: 'TOP_N',
      primaryColumn: colName,
      topN: { n, column: colName, ascending: false },
      visualizationSuggestion: 'BAR_CHART',
    };
  }

  // 2. FILTERING (e.g. "exceeds 1000", "greater than 50", "more than 200")
  const filterMatch = lower.match(/(?:exceeds?|greater than|more than|>|above)\s*(\d+[\d,.]*)/);
  if (filterMatch) {
    const val = parseFloat(filterMatch[1].replace(/,/g, ''));
    return {
      intent: 'FILTER',
      primaryColumn: colName,
      filterCondition: { column: colName, operator: '>', value: val },
      visualizationSuggestion: 'BAR_CHART',
    };
  }

  // 3. STATISTICAL FUNCTIONS MAPPING
  if (lower.includes('mean') || lower.includes('average') || lower.includes('avg')) {
    return { intent: 'CALCULATE', functionId: 'MEAN', primaryColumn: colName, visualizationSuggestion: 'HISTOGRAM' };
  }
  if (lower.includes('median') || lower.includes('middle value')) {
    return { intent: 'CALCULATE', functionId: 'MEDIAN', primaryColumn: colName, visualizationSuggestion: 'BOX_PLOT' };
  }
  if (lower.includes('maximum') || lower.includes('highest') || lower.includes('max') || lower.includes('peak')) {
    return { intent: 'CALCULATE', functionId: 'MAXIMUM', primaryColumn: colName, visualizationSuggestion: 'BAR_CHART' };
  }
  if (lower.includes('minimum') || lower.includes('lowest') || lower.includes('min')) {
    return { intent: 'CALCULATE', functionId: 'MINIMUM', primaryColumn: colName, visualizationSuggestion: 'BAR_CHART' };
  }
  if (lower.includes('sum') || lower.includes('total') || lower.includes('aggregate')) {
    return { intent: 'CALCULATE', functionId: 'SUM', primaryColumn: colName, visualizationSuggestion: 'BAR_CHART' };
  }
  if (lower.includes('standard deviation') || lower.includes('std dev') || lower.includes('spread') || lower.includes('volatility')) {
    return { intent: 'CALCULATE', functionId: 'STD_DEV', primaryColumn: colName, visualizationSuggestion: 'BOX_PLOT' };
  }
  if (lower.includes('variance') || lower.includes('variability')) {
    return { intent: 'CALCULATE', functionId: 'VARIANCE', primaryColumn: colName, visualizationSuggestion: 'HISTOGRAM' };
  }
  if (lower.includes('outlier') || lower.includes('unusual') || lower.includes('anomal')) {
    return { intent: 'CALCULATE', functionId: 'OUTLIER_DETECTION', primaryColumn: colName, visualizationSuggestion: 'BOX_PLOT' };
  }
  if (lower.includes('missing') || lower.includes('empty') || lower.includes('null')) {
    return { intent: 'CALCULATE', functionId: 'MISSING_VALUES', primaryColumn: colName, visualizationSuggestion: 'BAR_CHART' };
  }
  if (lower.includes('histogram') || lower.includes('distribution') || lower.includes('frequency')) {
    return { intent: 'VISUALIZE', functionId: 'HISTOGRAM', primaryColumn: colName, visualizationSuggestion: 'HISTOGRAM' };
  }
  if (lower.includes('box plot') || lower.includes('boxplot') || lower.includes('whiskers')) {
    return { intent: 'VISUALIZE', functionId: 'BOX_PLOT', primaryColumn: colName, visualizationSuggestion: 'BOX_PLOT' };
  }
  if (lower.includes('pie chart') || lower.includes('donut') || lower.includes('breakdown')) {
    return { intent: 'VISUALIZE', functionId: 'PIE_CHART', primaryColumn: colName, visualizationSuggestion: 'PIE_CHART' };
  }
  if (lower.includes('scatter') || lower.includes('correlation') || lower.includes('relation')) {
    const numCols = columns.filter((c) => c.dataType === 'numerical');
    const secCol = numCols.find((c) => c.name !== colName)?.name || numCols[1]?.name;
    return {
      intent: 'VISUALIZE',
      functionId: 'SCATTER_PLOT',
      primaryColumn: colName,
      secondaryColumn: secCol,
      visualizationSuggestion: 'SCATTER_PLOT',
    };
  }

  // Default fallback calculation
  return {
    intent: 'CALCULATE',
    functionId: targetCol?.dataType === 'numerical' ? 'MEAN' : 'COUNT',
    primaryColumn: colName,
    visualizationSuggestion: targetCol?.dataType === 'numerical' ? 'HISTOGRAM' : 'BAR_CHART',
  };
}

/**
 * Executes natural language queries by combining AI intent planning with the mathematical calculation engine.
 */
export async function executeNaturalLanguageQuery(
  userQuery: string,
  table: ExtractedTable,
  columns: ColumnInfo[],
  _chatHistory: ChatMessage[] = []
): Promise<ChatMessage> {
  let plan = planQueryRuleBased(userQuery, columns);

  // If Gemini API is available, ask Gemini to parse intent into structured parameters
  try {
    const prompt = `Interpret the following user question regarding the dataset "${table.name}":
Columns available: ${columns.map((c) => `"${c.name}" (${c.dataType})`).join(', ')}

User question: "${userQuery}"

Available operations: MEAN, MEDIAN, MODE, MINIMUM, MAXIMUM, RANGE, SUM, COUNT, VARIANCE, STD_DEV, QUARTILES, IQR, SKEWNESS, KURTOSIS, HISTOGRAM, BOX_PLOT, MISSING_VALUES, DUPLICATE_DETECTION, OUTLIER_DETECTION, BAR_CHART, LINE_CHART, SCATTER_PLOT, HEATMAP.

Return a JSON object matching this schema:
{
  "intent": "CALCULATE" | "FILTER" | "TOP_N" | "COMPARE" | "EXPLAIN" | "VISUALIZE",
  "functionId": string,
  "primaryColumn": string,
  "secondaryColumn": string or null,
  "topNCount": number or null
}
Return ONLY valid JSON.`;

    const aiRes = await callGemini(prompt, 'You are an intelligent query planner for a statistical calculation engine.');
    const cleaned = aiRes.replace(/```json/gi, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleaned);

    if (parsed.functionId) {
      plan = {
        intent: parsed.intent || plan.intent,
        functionId: parsed.functionId as FunctionId,
        primaryColumn: parsed.primaryColumn || plan.primaryColumn,
        secondaryColumn: parsed.secondaryColumn || plan.secondaryColumn,
        visualizationSuggestion: plan.visualizationSuggestion,
      };
    }
  } catch {
    // Graceful fallback to rule-based planner
  }

  const primaryColInfo = columns.find((c) => c.name === plan.primaryColumn) || columns[0];
  const secondaryColInfo = plan.secondaryColumn ? columns.find((c) => c.name === plan.secondaryColumn) : undefined;

  // 1. Handle TOP N QUERY
  if (plan.intent === 'TOP_N' && plan.topN) {
    const colIdx = primaryColInfo.index;
    const sortedRows = [...table.rows].sort((a, b) => {
      const numA = parseCleanNumber(a[colIdx]) ?? -Infinity;
      const numB = parseCleanNumber(b[colIdx]) ?? -Infinity;
      return numB - numA;
    });
    const topRows = sortedRows.slice(0, plan.topN.n);

    return {
      id: `chat-${Date.now()}`,
      role: 'assistant',
      text: `Here are the top ${plan.topN.n} records ranked by **${primaryColInfo.name}**:`,
      timestamp: Date.now(),
      queryPlan: plan,
      filteredRows: topRows,
      suggestedFunctionId: 'BAR_CHART',
      suggestedColumn: primaryColInfo.name,
    };
  }

  // 2. Handle FILTER QUERY
  if (plan.intent === 'FILTER' && plan.filterCondition) {
    const colIdx = primaryColInfo.index;
    const targetVal = Number(plan.filterCondition.value);
    const matched = table.rows.filter((r) => {
      const num = parseCleanNumber(r[colIdx]);
      return num !== null && num > targetVal;
    });

    return {
      id: `chat-${Date.now()}`,
      role: 'assistant',
      text: `Found **${matched.length}** records where **${primaryColInfo.name}** exceeds ${targetVal} (out of ${table.totalRows} total rows).`,
      timestamp: Date.now(),
      queryPlan: plan,
      filteredRows: matched.slice(0, 10),
      suggestedFunctionId: 'BAR_CHART',
      suggestedColumn: primaryColInfo.name,
    };
  }

  // 3. Handle STATISTICAL CALCULATION / VISUALIZATION QUERY
  if (plan.functionId) {
    try {
      const result: AnalysisResult = executeAnalysis(
        table,
        primaryColInfo,
        plan.functionId,
        secondaryColInfo
      );

      let responseText = '';
      if (result.primaryMetric) {
        responseText = `The calculated **${result.functionLabel}** for **"${primaryColInfo.name}"** is **${result.primaryMetric.value}**. ${result.interpretation}`;
      } else {
        responseText = `Generated **${result.functionLabel}** for **"${primaryColInfo.name}"**. ${result.interpretation}`;
      }

      return {
        id: `chat-${Date.now()}`,
        role: 'assistant',
        text: responseText,
        timestamp: Date.now(),
        queryPlan: plan,
        calculatedResult: result,
        suggestedFunctionId: plan.visualizationSuggestion || plan.functionId,
        suggestedColumn: primaryColInfo.name,
      };
    } catch (err) {
      return {
        id: `chat-${Date.now()}`,
        role: 'assistant',
        text: `Could not complete the requested analysis: ${err instanceof Error ? err.message : String(err)}`,
        timestamp: Date.now(),
        queryPlan: plan,
      };
    }
  }

  return {
    id: `chat-${Date.now()}`,
    role: 'assistant',
    text: `I understood your inquiry regarding **${primaryColInfo.name}**. You can run descriptive statistics or generate a chart using the options below.`,
    timestamp: Date.now(),
    queryPlan: plan,
  };
}
