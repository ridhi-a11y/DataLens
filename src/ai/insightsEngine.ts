import type { ExtractedTable } from '../extraction/types.js';
import type { ColumnInfo } from '../analysis/types.js';
import {
  computeDescriptiveStats,
  detectOutliers,
  computePearsonCorrelation,
  computeFrequencyDistribution,
} from '../analysis/statistics.js';
import { parseCleanNumber, type CleanedRowData } from '../analysis/typeInference.js';
import { callGemini } from './geminiClient.js';
import type { InsightItem } from './types.js';

interface StatisticalSummary {
  numerical: Array<{
    column: string;
    mean: number;
    median: number;
    stdDev: number;
    variance: number;
    min: number;
    max: number;
    skewness?: number;
    outlierCount: number;
    missingCount: number;
  }>;
  categorical: Array<{
    column: string;
    uniqueCount: number;
    topCategory: string;
    topCategoryPercentage: number;
    missingCount: number;
  }>;
  correlations: Array<{
    colA: string;
    colB: string;
    r: number;
    strength: string;
  }>;
  totalRows: number;
  totalColumns: number;
}

/**
 * Computes deterministic statistics across all columns in the table
 */
export function extractTableStatisticalSummary(
  table: ExtractedTable,
  columns: ColumnInfo[]
): StatisticalSummary {
  const summary: StatisticalSummary = {
    numerical: [],
    categorical: [],
    correlations: [],
    totalRows: table.totalRows,
    totalColumns: table.totalColumns,
  };

  const numCleanedMap = new Map<string, CleanedRowData<number>[]>();

  columns.forEach((col) => {
    const rawValues = table.rows.map((r) => r[col.index] || '');

    if (col.dataType === 'numerical') {
      const cleanedData: CleanedRowData<number>[] = [];
      rawValues.forEach((val, idx) => {
        const n = parseCleanNumber(val);
        if (n !== null) {
          cleanedData.push({ rowIndex: idx, displayRow: idx + 1, rawValue: val, value: n });
        }
      });

      numCleanedMap.set(col.name, cleanedData);

      const stats = computeDescriptiveStats(cleanedData, col.missingCount);
      const outliers = detectOutliers(cleanedData);

      summary.numerical.push({
        column: col.name,
        mean: Number(stats.mean?.toFixed(2) ?? 0),
        median: Number(stats.median?.toFixed(2) ?? 0),
        stdDev: Number(stats.sampleStdDev?.toFixed(2) ?? 0),
        variance: Number(stats.sampleVariance?.toFixed(2) ?? 0),
        min: Number(stats.min?.toFixed(2) ?? 0),
        max: Number(stats.max?.toFixed(2) ?? 0),
        skewness: stats.skewness ? Number(stats.skewness.toFixed(2)) : undefined,
        outlierCount: outliers.count,
        missingCount: col.missingCount,
      });
    } else if (col.dataType === 'categorical') {
      const cleanedCategorical = rawValues.map((val, idx) => ({
        rowIndex: idx,
        displayRow: idx + 1,
        rawValue: val,
        value: val.trim(),
      }));

      const freqs = computeFrequencyDistribution(cleanedCategorical, table.totalRows);
      const top = freqs[0];

      summary.categorical.push({
        column: col.name,
        uniqueCount: col.uniqueCount,
        topCategory: top ? top.value : 'N/A',
        topCategoryPercentage: top ? top.percentage : 0,
        missingCount: col.missingCount,
      });
    }
  });

  // Calculate pairwise Pearson correlation between first 5 numerical columns
  const numNames = Array.from(numCleanedMap.keys()).slice(0, 5);
  for (let i = 0; i < numNames.length; i++) {
    for (let j = i + 1; j < numNames.length; j++) {
      const nameA = numNames[i];
      const nameB = numNames[j];
      const cleanA = numCleanedMap.get(nameA) || [];
      const cleanB = numCleanedMap.get(nameB) || [];

      // Align indices
      const mapB = new Map(cleanB.map((item) => [item.rowIndex, item.value]));
      const pairedA: number[] = [];
      const pairedB: number[] = [];

      cleanA.forEach((item) => {
        if (mapB.has(item.rowIndex)) {
          pairedA.push(item.value);
          pairedB.push(mapB.get(item.rowIndex)!);
        }
      });

      if (pairedA.length >= 3) {
        const r = computePearsonCorrelation(pairedA, pairedB);
        let strength = 'negligible';
        const absR = Math.abs(r);
        if (absR >= 0.7) strength = 'strong';
        else if (absR >= 0.4) strength = 'moderate';
        else if (absR >= 0.2) strength = 'weak';

        summary.correlations.push({
          colA: nameA,
          colB: nameB,
          r: Number(r.toFixed(3)),
          strength,
        });
      }
    }
  }

  return summary;
}

/**
 * Generates rule-based deterministic insights based strictly on computed statistics.
 */
function generateDeterministicInsights(summary: StatisticalSummary): InsightItem[] {
  const insights: InsightItem[] = [];

  // 1. Data Quality & Missing Values
  const missingCols = [...summary.numerical, ...summary.categorical].filter((c) => c.missingCount > 0);
  if (missingCols.length > 0) {
    const totalMissing = missingCols.reduce((acc, c) => acc + c.missingCount, 0);
    insights.push({
      id: 'insight-quality',
      category: 'quality',
      headline: `Data Quality Alert: ${totalMissing} Missing Values Detected`,
      observation: `Missing observations exist across ${missingCols.length} column(s): ${missingCols.map((c) => `"${c.column}" (${c.missingCount})`).join(', ')}.`,
      explanation: `Missing data can introduce bias in mean calculations and reduce statistical power. Consider using the Data Cleaning Assistant to impute or drop empty rows.`,
      supportingColumns: missingCols.map((c) => c.column),
      confidence: 0.95,
      suggestedAction: {
        label: `Inspect "${missingCols[0].column}" Quality`,
        functionId: 'MISSING_VALUES',
        primaryColumn: missingCols[0].column,
      },
    });
  }

  // 2. Correlation & Relationships
  const strongCorr = summary.correlations.find((c) => Math.abs(c.r) >= 0.5);
  if (strongCorr) {
    const direction = strongCorr.r > 0 ? 'positive' : 'negative';
    insights.push({
      id: `insight-corr-${strongCorr.colA}-${strongCorr.colB}`,
      category: 'relationship',
      headline: `${strongCorr.strength.toUpperCase()} ${direction} correlation between "${strongCorr.colA}" and "${strongCorr.colB}" (r = ${strongCorr.r})`,
      observation: `As "${strongCorr.colA}" ${direction === 'positive' ? 'increases' : 'increases'}, "${strongCorr.colB}" tends to ${direction === 'positive' ? 'increase' : 'decrease'}.`,
      explanation: `Observed linear association (Pearson r = ${strongCorr.r}). Note: Statistical correlation documents co-movement, but does NOT prove a causal relationship.`,
      supportingColumns: [strongCorr.colA, strongCorr.colB],
      confidence: 0.9,
      suggestedAction: {
        label: `Plot Scatter: ${strongCorr.colA} vs ${strongCorr.colB}`,
        functionId: 'SCATTER_PLOT',
        primaryColumn: strongCorr.colA,
        secondaryColumn: strongCorr.colB,
      },
    });
  }

  // 3. Outlier Anomalies
  const outlierCols = summary.numerical.filter((c) => c.outlierCount > 0);
  if (outlierCols.length > 0) {
    const col = outlierCols[0];
    insights.push({
      id: `insight-outlier-${col.column}`,
      category: 'anomaly',
      headline: `${col.outlierCount} Extreme Outlier(s) in "${col.column}"`,
      observation: `Observations exceed Tukey's interquartile threshold (values range from ${col.min} to ${col.max}, while median is ${col.median}).`,
      explanation: `Outliers significantly stretch the mean away from the median. They may represent genuine high-value events or data entry anomalies.`,
      supportingColumns: [col.column],
      confidence: 0.88,
      suggestedAction: {
        label: `View Outliers in "${col.column}" Box Plot`,
        functionId: 'BOX_PLOT',
        primaryColumn: col.column,
      },
    });
  }

  // 4. Variability & Spread
  if (summary.numerical.length > 0) {
    const col = summary.numerical[0];
    const cv = col.mean !== 0 ? Math.abs(col.stdDev / col.mean) : 0;
    const variDescription = cv > 0.5 ? 'high relative variability' : 'moderate clustering around the mean';
    insights.push({
      id: `insight-spread-${col.column}`,
      category: 'distribution',
      headline: `Distribution characteristics of "${col.column}"`,
      observation: `Mean is ${col.mean} (Standard Deviation: ${col.stdDev}, Range: ${col.min} – ${col.max}), displaying ${variDescription}.`,
      explanation: `The dispersion informs whether observations are predictable or subject to wide variance.`,
      supportingColumns: [col.column],
      confidence: 0.85,
      suggestedAction: {
        label: `Explore "${col.column}" Histogram`,
        functionId: 'HISTOGRAM',
        primaryColumn: col.column,
      },
    });
  }

  // 5. Categorical Dominance
  if (summary.categorical.length > 0) {
    const cat = summary.categorical[0];
    if (cat.topCategoryPercentage >= 40) {
      insights.push({
        id: `insight-cat-${cat.column}`,
        category: 'statistical',
        headline: `Concentration: "${cat.topCategory}" represents ${cat.topCategoryPercentage.toFixed(1)}% of "${cat.column}"`,
        observation: `Out of ${cat.uniqueCount} distinct categories, "${cat.topCategory}" constitutes the dominant category.`,
        explanation: `High class concentration indicates an imbalanced categorical distribution, common in regional or product tier data.`,
        supportingColumns: [cat.column],
        confidence: 0.92,
        suggestedAction: {
          label: `View "${cat.column}" Category Breakdown`,
          functionId: 'BAR_CHART',
          primaryColumn: cat.column,
        },
      });
    }
  }

  return insights;
}

/**
 * Generates intelligent AI-powered automated insights for a dataset.
 */
export async function generateDatasetInsights(
  table: ExtractedTable,
  columns: ColumnInfo[]
): Promise<InsightItem[]> {
  const summary = extractTableStatisticalSummary(table, columns);
  const baseInsights = generateDeterministicInsights(summary);

  try {
    const prompt = `You are DataLens AI, an expert statistical exploratory data analysis assistant.
Analyze the following strictly calculated mathematical summary of the dataset "${table.name}":

DATASET SUMMARY:
Total Rows: ${summary.totalRows}
Total Columns: ${summary.totalColumns}

NUMERICAL STATISTICS:
${JSON.stringify(summary.numerical, null, 2)}

CATEGORICAL STATISTICS:
${JSON.stringify(summary.categorical, null, 2)}

CORRELATION MATRIX (Pearson r):
${JSON.stringify(summary.correlations, null, 2)}

REQUIREMENTS:
1. Provide 4 to 5 concise, actionable exploratory data analysis insights.
2. STRICT REQUIREMENT: Base every numerical finding solely on the numbers provided in the summary above. NEVER hallucinate or alter numerical values.
3. Distinguish clearly between observed findings (what the numbers show) and possible explanations (hypotheses).
4. Avoid claiming causation from correlation (state that correlation indicates linear co-movement).
5. Output valid JSON array matching this TypeScript structure:
Array<{
  category: "statistical" | "anomaly" | "distribution" | "quality" | "relationship";
  headline: string;
  observation: string;
  explanation: string;
  supportingColumns: string[];
  confidence: number;
}>

Return ONLY valid JSON with no markdown backticks or preamble.`;

    const responseText = await callGemini(prompt, 'You are an objective mathematical data analysis engine. Always output pure valid JSON.');

    // Parse JSON response
    const cleanedJson = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanedJson) as Array<{
      category: 'statistical' | 'anomaly' | 'distribution' | 'quality' | 'relationship';
      headline: string;
      observation: string;
      explanation: string;
      supportingColumns: string[];
      confidence: number;
    }>;

    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.map((item, idx) => ({
        id: `ai-insight-${idx + 1}-${Date.now()}`,
        category: item.category || 'statistical',
        headline: item.headline,
        observation: item.observation,
        explanation: item.explanation,
        supportingColumns: item.supportingColumns || [],
        confidence: item.confidence || 0.9,
      }));
    }
  } catch {
    // If Gemini API is not configured or fails, fallback to verified deterministic insights
  }

  return baseInsights;
}
