import type { ColumnInfo, FunctionId } from './types.js';
import type { ExtractedTable } from '../extraction/types.js';

export interface AnalysisRecommendation {
  id: string;
  title: string;
  reason: string;
  badge: string;
  primaryColumn: string;
  secondaryColumn?: string;
  multiColumns?: string[];
  functionId: FunctionId;
  iconType: 'chart' | 'stats' | 'quality' | 'compare';
}

/**
 * Generates intelligent, data-driven statistical recommendations based on column types and dataset structure.
 */
export function generateRecommendations(
  _table: ExtractedTable,
  columns: ColumnInfo[]
): AnalysisRecommendation[] {
  const recommendations: AnalysisRecommendation[] = [];

  const numCols = columns.filter((c) => c.dataType === 'numerical');
  const catCols = columns.filter((c) => c.dataType === 'categorical');
  const dateCols = columns.filter((c) => c.dataType === 'date');

  // 1. Cross-Column Numerical Analysis (Heatmap & Scatter)
  if (numCols.length >= 2) {
    const colA = numCols[0];
    const colB = numCols[1];

    recommendations.push({
      id: `rec-corr-${colA.name}-${colB.name}`,
      title: `Scatter Correlation: ${colA.name} vs ${colB.name}`,
      reason: `Detect co-movement and Pearson correlation strength between two quantitative variables.`,
      badge: 'Bivariate Analysis',
      primaryColumn: colA.name,
      secondaryColumn: colB.name,
      functionId: 'SCATTER_PLOT',
      iconType: 'chart',
    });

    if (numCols.length >= 3) {
      recommendations.push({
        id: `rec-heatmap`,
        title: `Correlation Heatmap (${numCols.length} Numerical Columns)`,
        reason: `Examine full pairwise correlation matrix across all numeric metrics.`,
        badge: 'Multivariate',
        primaryColumn: colA.name,
        multiColumns: numCols.map((c) => c.name),
        functionId: 'HEATMAP',
        iconType: 'chart',
      });
    }
  }

  // 2. Numerical Column Recommendations
  numCols.slice(0, 2).forEach((col) => {
    // Box plot for distribution & outliers
    recommendations.push({
      id: `rec-box-${col.name}`,
      title: `Distribution & Outlier Box Plot for "${col.name}"`,
      reason: `Assess median, interquartile spread (IQR), and flag abnormal outlier records.`,
      badge: 'Distribution',
      primaryColumn: col.name,
      functionId: 'BOX_PLOT',
      iconType: 'chart',
    });

    // Histogram
    recommendations.push({
      id: `rec-hist-${col.name}`,
      title: `Frequency Histogram of "${col.name}"`,
      reason: `Inspect shape of data: skewness, normality, and central clustering.`,
      badge: 'Histogram',
      primaryColumn: col.name,
      functionId: 'HISTOGRAM',
      iconType: 'chart',
    });

    // Descriptive Stats
    recommendations.push({
      id: `rec-stats-${col.name}`,
      title: `Standard Deviation & Variance for "${col.name}"`,
      reason: `Quantify variability and statistical dispersion around the sample mean.`,
      badge: 'Dispersion',
      primaryColumn: col.name,
      functionId: 'STD_DEV',
      iconType: 'stats',
    });
  });

  // 3. Categorical Column Recommendations
  catCols.slice(0, 2).forEach((col) => {
    // If unique items <= 8, suggest Pie/Donut
    if (col.uniqueCount <= 8 && col.uniqueCount >= 2) {
      recommendations.push({
        id: `rec-pie-${col.name}`,
        title: `Share Breakdown (Donut Chart) for "${col.name}"`,
        reason: `Visualize percentage proportion across ${col.uniqueCount} distinct categorical segments.`,
        badge: 'Composition',
        primaryColumn: col.name,
        functionId: 'DONUT_CHART',
        iconType: 'chart',
      });
    } else {
      recommendations.push({
        id: `rec-bar-${col.name}`,
        title: `Category Frequency Bar Chart for "${col.name}"`,
        reason: `Compare observation counts and rank top classes among ${col.uniqueCount} unique categories.`,
        badge: 'Categorical',
        primaryColumn: col.name,
        functionId: 'BAR_CHART',
        iconType: 'chart',
      });
    }
  });

  // 4. Date Column Recommendations
  dateCols.forEach((col) => {
    recommendations.push({
      id: `rec-date-${col.name}`,
      title: `Timeline Trend (Line Chart) for "${col.name}"`,
      reason: `Plot chronological observation trajectories and temporal sequence patterns.`,
      badge: 'Time Series',
      primaryColumn: col.name,
      functionId: 'LINE_CHART',
      iconType: 'chart',
    });
  });

  return recommendations;
}
