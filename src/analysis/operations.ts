import type {
  DataType,
  FunctionId,
  FunctionDefinition,
  AnalysisResult,
  ColumnInfo,
  DescriptiveStats,
  QualityStats,
} from './types.js';
import type { ExtractedTable } from '../extraction/types.js';
import {
  getCleanedNumericalColumn,
  getCleanedCategoricalColumn,
} from './typeInference.js';
import {
  computeDescriptiveStats,
  computeFrequencyDistribution,
  computeQualityStats,
  detectOutliers,
  computePearsonCorrelation,
} from './statistics.js';
import { generateInterpretation } from './interpretations.js';

export const FUNCTION_DEFINITIONS: FunctionDefinition[] = [
  // A. DESCRIPTIVE STATISTICS
  {
    id: 'MEAN',
    label: 'Mean',
    category: 'DESCRIPTIVE',
    description: 'Calculates the arithmetic average of all non-empty values.',
    supportedTypes: ['numerical'],
  },
  {
    id: 'MEDIAN',
    label: 'Median',
    category: 'DESCRIPTIVE',
    description: 'Computes the 50th percentile middle value.',
    supportedTypes: ['numerical'],
  },
  {
    id: 'MODE',
    label: 'Mode',
    category: 'DESCRIPTIVE',
    description: 'Finds the most frequent value(s) and their count.',
    supportedTypes: ['numerical', 'categorical', 'date', 'boolean'],
  },
  {
    id: 'MINIMUM',
    label: 'Minimum',
    category: 'DESCRIPTIVE',
    description: 'Identifies the smallest observed value.',
    supportedTypes: ['numerical', 'date'],
  },
  {
    id: 'MAXIMUM',
    label: 'Maximum',
    category: 'DESCRIPTIVE',
    description: 'Identifies the largest observed value.',
    supportedTypes: ['numerical', 'date'],
  },
  {
    id: 'RANGE',
    label: 'Range',
    category: 'DESCRIPTIVE',
    description: 'Difference between maximum and minimum values.',
    supportedTypes: ['numerical'],
  },
  {
    id: 'SUM',
    label: 'Sum',
    category: 'DESCRIPTIVE',
    description: 'Calculates total sum of all numerical values.',
    supportedTypes: ['numerical'],
  },
  {
    id: 'COUNT',
    label: 'Count',
    category: 'DESCRIPTIVE',
    description: 'Calculates total number of valid non-missing values.',
    supportedTypes: ['numerical', 'categorical', 'date', 'boolean'],
  },
  {
    id: 'VARIANCE',
    label: 'Variance',
    category: 'DESCRIPTIVE',
    description: 'Calculates sample (N-1) and population (N) variance.',
    supportedTypes: ['numerical'],
  },
  {
    id: 'STD_DEV',
    label: 'Standard Deviation',
    category: 'DESCRIPTIVE',
    description: 'Computes sample (s) and population (σ) standard deviation.',
    supportedTypes: ['numerical'],
  },
  {
    id: 'QUARTILES',
    label: 'Quartiles (Q1, Q2, Q3)',
    category: 'DESCRIPTIVE',
    description: 'Computes 25th, 50th, and 75th percentiles.',
    supportedTypes: ['numerical'],
  },
  {
    id: 'IQR',
    label: 'Interquartile Range (IQR)',
    category: 'DESCRIPTIVE',
    description: 'Calculates spread between Q3 and Q1 (Q3 - Q1).',
    supportedTypes: ['numerical'],
  },
  {
    id: 'PERCENTILES',
    label: 'Percentiles',
    category: 'DESCRIPTIVE',
    description: 'Calculates 10th, 25th, 50th, 75th, 90th, 95th, 99th percentiles.',
    supportedTypes: ['numerical'],
  },
  {
    id: 'SKEWNESS',
    label: 'Skewness',
    category: 'DESCRIPTIVE',
    description: 'Measures distribution asymmetry (Fisher-Pearson coefficient).',
    supportedTypes: ['numerical'],
  },
  {
    id: 'KURTOSIS',
    label: 'Kurtosis',
    category: 'DESCRIPTIVE',
    description: 'Measures tail heaviness and peakedness (excess kurtosis).',
    supportedTypes: ['numerical'],
  },

  // B. DATA DISTRIBUTION
  {
    id: 'HISTOGRAM',
    label: 'Histogram',
    category: 'DISTRIBUTION',
    description: 'Interactive frequency distribution of numerical values with adjustable bins.',
    supportedTypes: ['numerical'],
  },
  {
    id: 'BOX_PLOT',
    label: 'Box Plot',
    category: 'DISTRIBUTION',
    description: 'Visualizes median, quartiles, whiskers, and clickable outliers.',
    supportedTypes: ['numerical'],
  },
  {
    id: 'FREQUENCY_DIST',
    label: 'Frequency Distribution',
    category: 'DISTRIBUTION',
    description: 'Tabulates counts and percentages of unique categories.',
    supportedTypes: ['categorical', 'boolean', 'date', 'numerical'],
  },
  {
    id: 'CUMULATIVE_FREQ',
    label: 'Cumulative Frequency',
    category: 'DISTRIBUTION',
    description: 'Computes running totals and cumulative percentages.',
    supportedTypes: ['categorical', 'boolean', 'date', 'numerical'],
  },

  // C. DATA QUALITY
  {
    id: 'MISSING_VALUES',
    label: 'Missing Values',
    category: 'QUALITY',
    description: 'Quantifies empty, blank, null, or NA cells.',
    supportedTypes: ['numerical', 'categorical', 'date', 'boolean'],
  },
  {
    id: 'DUPLICATE_DETECTION',
    label: 'Duplicate Detection',
    category: 'QUALITY',
    description: 'Detects repeated entries and isolates affected rows.',
    supportedTypes: ['numerical', 'categorical', 'date', 'boolean'],
  },
  {
    id: 'UNIQUE_VALUES',
    label: 'Unique Values',
    category: 'QUALITY',
    description: 'Calculates distinct value count and uniqueness ratio.',
    supportedTypes: ['numerical', 'categorical', 'date', 'boolean'],
  },
  {
    id: 'OUTLIER_DETECTION',
    label: 'Outlier Detection',
    category: 'QUALITY',
    description: 'Detects mild and extreme statistical outliers via Tukey fences.',
    supportedTypes: ['numerical'],
  },
  {
    id: 'DATA_TYPE_DETECTION',
    label: 'Data Type Detection',
    category: 'QUALITY',
    description: 'Evaluates column content against inferred data type.',
    supportedTypes: ['numerical', 'categorical', 'date', 'boolean'],
  },
  {
    id: 'INVALID_VALUES',
    label: 'Invalid Values',
    category: 'QUALITY',
    description: 'Identifies cells that fail type parsing or format constraints.',
    supportedTypes: ['numerical', 'date', 'boolean', 'categorical'],
  },

  // D. VISUALISATIONS
  {
    id: 'BAR_CHART',
    label: 'Bar Chart',
    category: 'VISUALIZATION',
    description: 'Interactive vertical bar chart with category click inspection.',
    supportedTypes: ['categorical', 'boolean', 'date', 'numerical'],
  },
  {
    id: 'HORIZONTAL_BAR_CHART',
    label: 'Horizontal Bar Chart',
    category: 'VISUALIZATION',
    description: 'Horizontal bar chart suited for long category labels.',
    supportedTypes: ['categorical', 'boolean', 'date', 'numerical'],
  },
  {
    id: 'PIE_CHART',
    label: 'Pie Chart',
    category: 'VISUALIZATION',
    description: 'Proportional pie chart displaying category percentages.',
    supportedTypes: ['categorical', 'boolean'],
  },
  {
    id: 'DONUT_CHART',
    label: 'Donut Chart',
    category: 'VISUALIZATION',
    description: 'Clean donut chart with interactive slice selection.',
    supportedTypes: ['categorical', 'boolean'],
  },
  {
    id: 'LINE_CHART',
    label: 'Line Chart',
    category: 'VISUALIZATION',
    description: 'Observation trend line with zoom and hover tooltips.',
    supportedTypes: ['numerical', 'date'],
  },
  {
    id: 'SCATTER_PLOT',
    label: 'Scatter Plot',
    category: 'VISUALIZATION',
    description: 'Bivariate relationship plot requiring two numerical columns.',
    supportedTypes: ['numerical', 'date'],
    requiresSecondColumn: true,
    secondColumnSupportedTypes: ['numerical'],
  },
  {
    id: 'HEATMAP',
    label: 'Correlation Heatmap',
    category: 'VISUALIZATION',
    description: 'Pairwise Pearson correlation matrix across multiple numerical columns.',
    supportedTypes: ['numerical'],
    requiresMultiColumn: true,
  },
  {
    id: 'AREA_CHART',
    label: 'Area Chart',
    category: 'VISUALIZATION',
    description: 'Filled area trend chart showing volume and changes.',
    supportedTypes: ['numerical', 'date'],
  },
];

/**
 * In-memory cache for computed statistical operations to optimize performance on large datasets.
 */
const calculationCache = new Map<string, AnalysisResult>();

export function clearCalculationCache(): void {
  calculationCache.clear();
}

/**
 * Returns functions compatible with a specific column data type
 */
export function getCompatibleFunctions(dataType: DataType): FunctionDefinition[] {
  return FUNCTION_DEFINITIONS.filter((fn) => fn.supportedTypes.includes(dataType));
}

/**
 * Executes a statistical or visualization operation on an ExtractedTable with caching.
 */
export function executeAnalysis(
  table: ExtractedTable,
  columnInfo: ColumnInfo,
  functionId: FunctionId,
  secondaryColumnInfo?: ColumnInfo,
  selectedColumns?: string[]
): AnalysisResult {
  const cacheKey = `${table.id}_${table.totalRows}_${columnInfo.name}_${functionId}_${secondaryColumnInfo?.name || ''}_${(selectedColumns || []).join(',')}`;
  const cached = calculationCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const result = computeAnalysisInternal(table, columnInfo, functionId, secondaryColumnInfo, selectedColumns);
  calculationCache.set(cacheKey, result);
  return result;
}

function computeAnalysisInternal(
  table: ExtractedTable,
  columnInfo: ColumnInfo,
  functionId: FunctionId,
  secondaryColumnInfo?: ColumnInfo,
  selectedColumns?: string[]
): AnalysisResult {
  const funcDef = FUNCTION_DEFINITIONS.find((f) => f.id === functionId);
  if (!funcDef) {
    throw new Error(`Unsupported function "${functionId}"`);
  }

  const resultId = `res-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const timestamp = Date.now();
  const datasetName = table.name || `Table ${table.index + 1}`;
  const primaryColumn = columnInfo.name;
  const primaryColumnType = columnInfo.dataType;

  // 1. DESCRIPTIVE STATISTICS
  if (funcDef.category === 'DESCRIPTIVE') {
    if (primaryColumnType === 'numerical') {
      const { valid, missing } = getCleanedNumericalColumn(table, columnInfo.index);
      const stats = computeDescriptiveStats(valid, missing.length);
      const { text, notes } = generateInterpretation(functionId, primaryColumn, stats);

      let primaryVal: string | number = '';
      let secLabel: string | undefined;
      let secVal: string | number | undefined;

      switch (functionId) {
        case 'MEAN':
          primaryVal = stats.mean ?? 'N/A';
          secLabel = 'Sample Size';
          secVal = stats.count;
          break;
        case 'MEDIAN':
          primaryVal = stats.median ?? 'N/A';
          secLabel = 'IQR';
          secVal = stats.iqr;
          break;
        case 'MODE':
          primaryVal = stats.mode && stats.mode.length > 0 ? stats.mode[0].value : 'None (All Unique)';
          secLabel = stats.mode && stats.mode.length > 0 ? 'Occurrences' : undefined;
          secVal = stats.mode && stats.mode.length > 0 ? stats.mode[0].count : undefined;
          break;
        case 'MINIMUM':
          primaryVal = stats.min ?? 'N/A';
          secLabel = 'Maximum';
          secVal = stats.max;
          break;
        case 'MAXIMUM':
          primaryVal = stats.max ?? 'N/A';
          secLabel = 'Minimum';
          secVal = stats.min;
          break;
        case 'RANGE':
          primaryVal = stats.range ?? 'N/A';
          secLabel = 'Span';
          secVal = `${stats.min} to ${stats.max}`;
          break;
        case 'SUM':
          primaryVal = stats.sum ?? 'N/A';
          secLabel = 'Valid Records';
          secVal = stats.count;
          break;
        case 'COUNT':
          primaryVal = stats.count;
          secLabel = 'Excluded Missing';
          secVal = stats.missingCount;
          break;
        case 'VARIANCE':
          primaryVal = stats.sampleVariance ?? stats.populationVariance ?? 'N/A';
          secLabel = 'Population Variance (σ²)';
          secVal = stats.populationVariance;
          break;
        case 'STD_DEV':
          primaryVal = stats.sampleStdDev ?? stats.populationStdDev ?? 'N/A';
          secLabel = 'Mean ± SD';
          secVal = `${stats.mean} ± ${stats.sampleStdDev ?? stats.populationStdDev}`;
          break;
        case 'QUARTILES':
          primaryVal = `Q1: ${stats.q1} | Q2: ${stats.q2} | Q3: ${stats.q3}`;
          secLabel = 'IQR';
          secVal = stats.iqr;
          break;
        case 'IQR':
          primaryVal = stats.iqr ?? 'N/A';
          secLabel = 'Middle 50% Interval';
          secVal = `[${stats.q1}, ${stats.q3}]`;
          break;
        case 'PERCENTILES':
          primaryVal = `P50: ${stats.median}`;
          secLabel = 'P10 - P90';
          secVal = `${stats.percentiles?.[10]} - ${stats.percentiles?.[90]}`;
          break;
        case 'SKEWNESS':
          primaryVal = stats.skewness ?? 'N/A';
          secLabel = 'Coefficient';
          secVal = (stats.skewness ?? 0) > 0 ? 'Right Skewed' : 'Left Skewed';
          break;
        case 'KURTOSIS':
          primaryVal = stats.kurtosis ?? 'N/A';
          secLabel = 'Tail Thickness';
          secVal = (stats.kurtosis ?? 0) > 0 ? 'Leptokurtic (Heavy)' : 'Platykurtic (Light)';
          break;
      }

      return {
        id: resultId,
        timestamp,
        datasetName,
        datasetId: table.id,
        functionId,
        functionLabel: funcDef.label,
        category: funcDef.category,
        primaryColumn,
        primaryColumnType,
        primaryMetric: {
          label: funcDef.label,
          value: primaryVal,
          secondaryLabel: secLabel,
          secondaryValue: secVal,
        },
        stats,
        interpretation: text,
        notes,
      };
    } else {
      // Categorical / Boolean / Date Mode or Count
      const { valid, missing } = getCleanedCategoricalColumn(table, columnInfo.index);
      const frequencies = computeFrequencyDistribution(
        valid.map((v) => ({ value: v.value, rowIndex: v.rowIndex })),
        table.totalRows
      );

      const topMode = frequencies[0];
      const stats: DescriptiveStats = {
        count: valid.length,
        missingCount: missing.length,
        mode: topMode ? [{ value: topMode.value, count: topMode.count }] : [],
      };

      const { text, notes } = generateInterpretation(functionId, primaryColumn, stats, undefined, frequencies);

      return {
        id: resultId,
        timestamp,
        datasetName,
        datasetId: table.id,
        functionId,
        functionLabel: funcDef.label,
        category: funcDef.category,
        primaryColumn,
        primaryColumnType,
        primaryMetric: {
          label: funcDef.label,
          value: functionId === 'COUNT' ? valid.length : (topMode ? topMode.value : 'None'),
          secondaryLabel: functionId === 'COUNT' ? 'Missing Cells' : 'Occurrences',
          secondaryValue: functionId === 'COUNT' ? missing.length : (topMode ? topMode.count : 0),
        },
        stats,
        frequencies,
        interpretation: text,
        notes,
      };
    }
  }

  // 2. DATA DISTRIBUTION
  if (funcDef.category === 'DISTRIBUTION') {
    if (functionId === 'HISTOGRAM') {
      const { valid, missing } = getCleanedNumericalColumn(table, columnInfo.index);
      const stats = computeDescriptiveStats(valid, missing.length);
      const { text, notes } = generateInterpretation(functionId, primaryColumn, stats);

      return {
        id: resultId,
        timestamp,
        datasetName,
        datasetId: table.id,
        functionId,
        functionLabel: funcDef.label,
        category: funcDef.category,
        primaryColumn,
        primaryColumnType,
        stats,
        chart: {
          chartType: 'histogram',
          data: [
            {
              type: 'histogram',
              x: valid.map((v) => v.value),
              customdata: valid.map((v) => v.rowIndex),
              name: primaryColumn,
              marker: {
                color: '#6366f1',
                line: { color: '#4338ca', width: 1 },
              },
            },
          ],
          layout: {
            title: {
              text: `<b>Histogram of ${primaryColumn}</b>`,
              font: { size: 12, color: '#0f172a' },
              x: 0.02,
            },
            xaxis: {
              title: { text: `${primaryColumn} (Value Intervals)`, font: { size: 11, color: '#334155' }, standoff: 12 },
              automargin: true,
              showgrid: true,
              gridcolor: '#f1f5f9',
            },
            yaxis: {
              title: { text: 'Frequency (Count Scale)', font: { size: 11, color: '#334155' }, standoff: 12 },
              automargin: true,
              showgrid: true,
              gridcolor: '#f1f5f9',
            },
            bargap: 0.05,
          },
        },
        interpretation: text,
        notes,
      };
    }

    if (functionId === 'BOX_PLOT') {
      const { valid, missing } = getCleanedNumericalColumn(table, columnInfo.index);
      const stats = computeDescriptiveStats(valid, missing.length);
      const outliers = detectOutliers(valid);
      const quality: QualityStats = {
        totalRows: table.totalRows,
        validCount: valid.length,
        missingCount: missing.length,
        missingPercentage: (missing.length / table.totalRows) * 100,
        uniqueCount: new Set(valid.map((v) => v.value)).size,
        uniquenessRatio: valid.length > 0 ? new Set(valid.map((v) => v.value)).size / valid.length : 0,
        duplicateCount: 0,
        outliers,
      };

      const { text, notes } = generateInterpretation(functionId, primaryColumn, stats, quality);

      return {
        id: resultId,
        timestamp,
        datasetName,
        datasetId: table.id,
        functionId,
        functionLabel: funcDef.label,
        category: funcDef.category,
        primaryColumn,
        primaryColumnType,
        stats,
        quality,
        chart: {
          chartType: 'box',
          data: [
            {
              type: 'box',
              y: valid.map((v) => v.value),
              customdata: valid.map((v) => v.rowIndex),
              name: primaryColumn,
              boxpoints: 'outliers',
              jitter: 0.3,
              pointpos: -1.8,
              marker: {
                color: '#6366f1',
                outliercolor: '#ef4444',
                size: 6,
              },
            },
          ],
          layout: {
            title: {
              text: `<b>Box Plot of ${primaryColumn}</b>`,
              font: { size: 12, color: '#0f172a' },
              x: 0.02,
            },
            xaxis: {
              title: { text: 'Distribution Sample', font: { size: 11, color: '#334155' }, standoff: 12 },
              automargin: true,
            },
            yaxis: {
              title: { text: `${primaryColumn} (Values / Scale)`, font: { size: 11, color: '#334155' }, standoff: 12 },
              automargin: true,
              showgrid: true,
              gridcolor: '#f1f5f9',
            },
          },
        },
        interpretation: text,
        notes,
      };
    }

    // FREQUENCY_DIST or CUMULATIVE_FREQ
    const { valid } = getCleanedCategoricalColumn(table, columnInfo.index);
    const frequencies = computeFrequencyDistribution(
      valid.map((v) => ({ value: v.value, rowIndex: v.rowIndex })),
      table.totalRows
    );
    const { text, notes } = generateInterpretation(functionId, primaryColumn, undefined, undefined, frequencies);

    const topFrequencies = frequencies.slice(0, 20);

    return {
      id: resultId,
      timestamp,
      datasetName,
      datasetId: table.id,
      functionId,
      functionLabel: funcDef.label,
      category: funcDef.category,
      primaryColumn,
      primaryColumnType,
      frequencies,
      primaryMetric: {
        label: 'Total Categories',
        value: frequencies.length,
        secondaryLabel: 'Valid Observations',
        secondaryValue: valid.length,
      },
      chart: {
        chartType: 'bar',
        data: [
          {
            type: 'bar',
            name: functionId === 'CUMULATIVE_FREQ' ? 'Cumulative Count' : 'Category Count',
            x: topFrequencies.map((f) => f.value),
            y: topFrequencies.map((f) => (functionId === 'CUMULATIVE_FREQ' ? f.cumulativeCount : f.count)),
            text: topFrequencies.map((f) => `${functionId === 'CUMULATIVE_FREQ' ? f.cumulativeCount : f.count} (${functionId === 'CUMULATIVE_FREQ' ? f.cumulativePercentage : f.percentage}%)`),
            textposition: 'auto',
            customdata: topFrequencies.map((f) => f.rowIndices[0] ?? 0),
            marker: {
              color: functionId === 'CUMULATIVE_FREQ' ? '#8b5cf6' : '#6366f1',
            },
          },
        ],
        layout: {
          title: {
            text: `<b>${functionId === 'CUMULATIVE_FREQ' ? 'Cumulative Frequency' : 'Frequency Distribution'} of ${primaryColumn}</b>`,
            font: { size: 12, color: '#0f172a' },
            x: 0.02,
          },
          xaxis: {
            title: { text: `${primaryColumn} (Categories)`, font: { size: 11, color: '#334155' }, standoff: 12 },
            automargin: true,
          },
          yaxis: {
            title: { text: functionId === 'CUMULATIVE_FREQ' ? 'Cumulative Count' : 'Count (Frequency Scale)', font: { size: 11, color: '#334155' }, standoff: 12 },
            automargin: true,
            showgrid: true,
            gridcolor: '#f1f5f9',
          },
        },
      },
      interpretation: text,
      notes,
    };
  }

  // 3. DATA QUALITY
  if (funcDef.category === 'QUALITY') {
    const rawColValues = table.rows.map((row, i) => ({
      value: row[columnInfo.index] || '',
      rowIndex: table.rowIndices?.[i] ?? i,
    }));

    let numData: ReturnType<typeof getCleanedNumericalColumn> | undefined;
    if (primaryColumnType === 'numerical') {
      numData = getCleanedNumericalColumn(table, columnInfo.index);
    }

    const { valid } = getCleanedCategoricalColumn(table, columnInfo.index);
    const quality = computeQualityStats(
      primaryColumn,
      table.totalRows,
      valid.length,
      columnInfo.missingCount,
      columnInfo.uniqueCount,
      rawColValues,
      numData?.valid,
      numData?.invalid
    );

    quality.detectedType = primaryColumnType;
    const { text, notes } = generateInterpretation(functionId, primaryColumn, undefined, quality);

    let pVal: string | number = '';
    let sLab: string | undefined;
    let sVal: string | number | undefined;

    switch (functionId) {
      case 'MISSING_VALUES':
        pVal = `${quality.missingCount} (${quality.missingPercentage}%)`;
        sLab = 'Valid Complete';
        sVal = quality.validCount;
        break;
      case 'DUPLICATE_DETECTION':
        pVal = quality.duplicateCount;
        sLab = 'Duplicate Groups';
        sVal = quality.duplicateValues?.length || 0;
        break;
      case 'UNIQUE_VALUES':
        pVal = quality.uniqueCount;
        sLab = 'Uniqueness Ratio';
        sVal = `${(quality.uniquenessRatio * 100).toFixed(1)}%`;
        break;
      case 'OUTLIER_DETECTION':
        pVal = quality.outliers?.count || 0;
        sLab = 'Tukey Fences';
        sVal = `[${quality.outliers?.lowerBound}, ${quality.outliers?.upperBound}]`;
        break;
      case 'DATA_TYPE_DETECTION':
        pVal = primaryColumnType.toUpperCase();
        sLab = 'Total Rows Verified';
        sVal = table.totalRows;
        break;
      case 'INVALID_VALUES':
        pVal = quality.invalids?.count || 0;
        sLab = 'Valid Values';
        sVal = quality.validCount;
        break;
    }

    return {
      id: resultId,
      timestamp,
      datasetName,
      datasetId: table.id,
      functionId,
      functionLabel: funcDef.label,
      category: funcDef.category,
      primaryColumn,
      primaryColumnType,
      quality,
      primaryMetric: {
        label: funcDef.label,
        value: pVal,
        secondaryLabel: sLab,
        secondaryValue: sVal,
      },
      interpretation: text,
      notes,
    };
  }

  // 4. VISUALISATIONS
  if (funcDef.category === 'VISUALIZATION') {
    // SCATTER PLOT (2 Columns)
    if (functionId === 'SCATTER_PLOT') {
      if (!secondaryColumnInfo) {
        throw new Error('Scatter plot requires selecting a second numerical column.');
      }

      const xData = getCleanedNumericalColumn(table, columnInfo.index);
      const yData = getCleanedNumericalColumn(table, secondaryColumnInfo.index);

      // Pair rows that are valid in both X and Y
      const pairs: Array<{ x: number; y: number; rowIndex: number }> = [];
      const yMap = new Map<number, number>();
      yData.valid.forEach((item) => yMap.set(item.rowIndex, item.value));

      xData.valid.forEach((item) => {
        if (yMap.has(item.rowIndex)) {
          pairs.push({
            x: item.value,
            y: yMap.get(item.rowIndex)!,
            rowIndex: item.rowIndex,
          });
        }
      });

      if (pairs.length === 0) {
        throw new Error('No paired numerical records found between selected columns.');
      }

      const correlation = computePearsonCorrelation(
        pairs.map((p) => p.x),
        pairs.map((p) => p.y)
      );

      const { text, notes } = generateInterpretation(
        functionId,
        primaryColumn,
        undefined,
        undefined,
        undefined,
        secondaryColumnInfo.name,
        { correlation }
      );

      const finalNotes: string[] = notes ? [...notes] : [];
      let displayPairs = pairs;
      if (pairs.length > 5000) {
        const step = Math.ceil(pairs.length / 5000);
        displayPairs = pairs.filter((_, i) => i % step === 0);
        finalNotes.push(`Plot displays a representative sample of ${displayPairs.length} points for high performance. Full dataset of ${pairs.length} records was used for correlation calculation.`);
      }

      return {
        id: resultId,
        timestamp,
        datasetName,
        datasetId: table.id,
        functionId,
        functionLabel: funcDef.label,
        category: funcDef.category,
        primaryColumn,
        primaryColumnType,
        secondaryColumn: secondaryColumnInfo.name,
        secondaryColumnType: secondaryColumnInfo.dataType,
        primaryMetric: {
          label: 'Pearson Correlation (r)',
          value: correlation > 0 ? `+${correlation}` : correlation,
          secondaryLabel: 'Paired Points',
          secondaryValue: pairs.length,
        },
        chart: {
          chartType: 'scatter',
          data: [
            {
              type: 'scatter',
              mode: 'markers',
              x: displayPairs.map((p) => p.x),
              y: displayPairs.map((p) => p.y),
              customdata: displayPairs.map((p) => p.rowIndex),
              name: `${primaryColumn} vs ${secondaryColumnInfo.name}`,
              marker: {
                color: '#6366f1',
                size: 7,
                opacity: 0.85,
              },
            },
          ],
          layout: {
            title: {
              text: `<b>${primaryColumn} vs ${secondaryColumnInfo.name}</b>`,
              font: { size: 12, color: '#0f172a' },
              x: 0.02,
            },
            xaxis: {
              title: { text: `${primaryColumn} (X-Axis Scale)`, font: { size: 11, color: '#334155' }, standoff: 12 },
              automargin: true,
              showgrid: true,
              gridcolor: '#f1f5f9',
            },
            yaxis: {
              title: { text: `${secondaryColumnInfo.name} (Y-Axis Scale)`, font: { size: 11, color: '#334155' }, standoff: 12 },
              automargin: true,
              showgrid: true,
              gridcolor: '#f1f5f9',
            },
          },
        },
        interpretation: text,
        notes: finalNotes,
      };
    }

    // HEATMAP (Multiple numerical columns)
    if (functionId === 'HEATMAP') {
      const selectedColNames = selectedColumns && selectedColumns.length >= 2
        ? selectedColumns
        : table.headers.slice(0, 6);

      // Find indices of selected columns
      const cols = selectedColNames
        .map((name) => {
          const idx = table.headers.indexOf(name);
          return { name, index: idx };
        })
        .filter((c) => c.index !== -1);

      if (cols.length < 2) {
        throw new Error('Correlation heatmap requires at least 2 numerical columns.');
      }

      // Compute pairwise Pearson correlation matrix
      const matrix: number[][] = [];
      const colData = cols.map((col) => getCleanedNumericalColumn(table, col.index));

      for (let i = 0; i < cols.length; i++) {
        const row: number[] = [];
        for (let j = 0; j < cols.length; j++) {
          if (i === j) {
            row.push(1.0);
          } else {
            // Find common rows
            const mapJ = new Map<number, number>();
            colData[j].valid.forEach((d) => mapJ.set(d.rowIndex, d.value));

            const pairsX: number[] = [];
            const pairsY: number[] = [];
            colData[i].valid.forEach((d) => {
              if (mapJ.has(d.rowIndex)) {
                pairsX.push(d.value);
                pairsY.push(mapJ.get(d.rowIndex)!);
              }
            });

            const r = computePearsonCorrelation(pairsX, pairsY);
            row.push(r);
          }
        }
        matrix.push(row);
      }

      const { text, notes } = generateInterpretation(functionId, primaryColumn);

      return {
        id: resultId,
        timestamp,
        datasetName,
        datasetId: table.id,
        functionId,
        functionLabel: funcDef.label,
        category: funcDef.category,
        primaryColumn,
        primaryColumnType,
        selectedColumns: cols.map((c) => c.name),
        chart: {
          chartType: 'heatmap',
          data: [
            {
              type: 'heatmap',
              name: 'Pearson r',
              z: matrix,
              x: cols.map((c) => c.name),
              y: cols.map((c) => c.name),
              colorscale: 'Blues',
              colorbar: {
                title: { text: 'r scale', font: { size: 10, color: '#334155' } },
                len: 0.85,
                thickness: 14,
              },
            },
          ],
          layout: {
            title: { text: '<b>Correlation Heatmap (Pearson r)</b>', font: { size: 12, color: '#0f172a' }, x: 0.02 },
            xaxis: {
              title: { text: 'Selected Columns', font: { size: 11, color: '#334155' }, standoff: 12 },
              automargin: true,
            },
            yaxis: {
              title: { text: 'Selected Columns', font: { size: 11, color: '#334155' }, standoff: 12 },
              automargin: true,
            },
          },
        },
        interpretation: text,
        notes,
      };
    }

    // PIE / DONUT CHART
    if (functionId === 'PIE_CHART' || functionId === 'DONUT_CHART') {
      const { valid } = getCleanedCategoricalColumn(table, columnInfo.index);
      const frequencies = computeFrequencyDistribution(
        valid.map((v) => ({ value: v.value, rowIndex: v.rowIndex })),
        table.totalRows
      ).slice(0, 10); // top 10 slices

      const { text, notes } = generateInterpretation(functionId, primaryColumn);

      return {
        id: resultId,
        timestamp,
        datasetName,
        datasetId: table.id,
        functionId,
        functionLabel: funcDef.label,
        category: funcDef.category,
        primaryColumn,
        primaryColumnType,
        frequencies,
        chart: {
          chartType: 'pie',
          data: [
            {
              type: 'pie',
              name: primaryColumn,
              labels: frequencies.map((f) => f.value),
              values: frequencies.map((f) => f.count),
              hole: functionId === 'DONUT_CHART' ? 0.45 : 0,
              textinfo: 'label+percent+value',
              customdata: frequencies.map((f) => f.rowIndices[0] ?? 0),
              marker: {
                colors: [
                  '#6366f1',
                  '#8b5cf6',
                  '#ec4899',
                  '#f59e0b',
                  '#10b981',
                  '#06b6d4',
                  '#3b82f6',
                  '#a855f7',
                ],
              },
            },
          ],
          layout: {
            title: {
              text: `<b>${functionId === 'DONUT_CHART' ? 'Donut Chart' : 'Pie Chart'} of ${primaryColumn}</b>`,
              font: { size: 12, color: '#0f172a' },
              x: 0.02,
            },
          },
        },
        interpretation: text,
        notes,
      };
    }

    // LINE CHART or AREA CHART
    if (functionId === 'LINE_CHART' || functionId === 'AREA_CHART') {
      const { valid } = getCleanedNumericalColumn(table, columnInfo.index);
      if (valid.length === 0) {
        throw new Error('No valid observations found to plot continuous chart.');
      }

      const { text, notes } = generateInterpretation(functionId, primaryColumn);

      return {
        id: resultId,
        timestamp,
        datasetName,
        datasetId: table.id,
        functionId,
        functionLabel: funcDef.label,
        category: funcDef.category,
        primaryColumn,
        primaryColumnType,
        chart: {
          chartType: functionId === 'AREA_CHART' ? 'area' : 'line',
          data: [
            {
              type: 'scatter',
              mode: 'lines+markers',
              x: valid.map((v) => v.displayRow),
              y: valid.map((v) => v.value),
              customdata: valid.map((v) => v.rowIndex),
              name: primaryColumn,
              fill: functionId === 'AREA_CHART' ? 'tozeroy' : undefined,
              marker: { color: '#6366f1', size: 5 },
              line: { color: '#6366f1', width: 2 },
            },
          ],
          layout: {
            title: {
              text: `<b>${functionId === 'AREA_CHART' ? 'Area Chart' : 'Trend Line Chart'} of ${primaryColumn}</b>`,
              font: { size: 12, color: '#0f172a' },
              x: 0.02,
            },
            xaxis: {
              title: { text: 'Row Index / Observation #', font: { size: 11, color: '#334155' }, standoff: 12 },
              automargin: true,
              showgrid: true,
              gridcolor: '#f1f5f9',
            },
            yaxis: {
              title: { text: `${primaryColumn} (Values / Scale)`, font: { size: 11, color: '#334155' }, standoff: 12 },
              automargin: true,
              showgrid: true,
              gridcolor: '#f1f5f9',
            },
          },
        },
        interpretation: text,
        notes,
      };
    }

    // BAR CHART or HORIZONTAL BAR CHART
    const { valid } = getCleanedCategoricalColumn(table, columnInfo.index);
    const frequencies = computeFrequencyDistribution(
      valid.map((v) => ({ value: v.value, rowIndex: v.rowIndex })),
      table.totalRows
    ).slice(0, 15);

    const isHorizontal = functionId === 'HORIZONTAL_BAR_CHART';
    const { text, notes } = generateInterpretation(functionId, primaryColumn);

    return {
      id: resultId,
      timestamp,
      datasetName,
      datasetId: table.id,
      functionId,
      functionLabel: funcDef.label,
      category: funcDef.category,
      primaryColumn,
      primaryColumnType,
      frequencies,
      chart: {
        chartType: 'bar',
        data: [
          {
            type: 'bar',
            name: primaryColumn,
            orientation: isHorizontal ? 'h' : 'v',
            x: isHorizontal ? frequencies.map((f) => f.count) : frequencies.map((f) => f.value),
            y: isHorizontal ? frequencies.map((f) => f.value) : frequencies.map((f) => f.count),
            text: frequencies.map((f) => `${f.count} (${f.percentage}%)`),
            textposition: 'auto',
            customdata: frequencies.map((f) => f.rowIndices[0] ?? 0),
            marker: { color: '#6366f1' },
          },
        ],
        layout: {
          title: {
            text: `<b>${isHorizontal ? 'Horizontal Bar Chart' : 'Bar Chart'} of ${primaryColumn}</b>`,
            font: { size: 12, color: '#0f172a' },
            x: 0.02,
          },
          xaxis: {
            title: { text: isHorizontal ? 'Count (Frequency Scale)' : `${primaryColumn} (Categories)`, font: { size: 11, color: '#334155' }, standoff: 12 },
            automargin: true,
            showgrid: true,
            gridcolor: '#f1f5f9',
          },
          yaxis: {
            title: { text: isHorizontal ? `${primaryColumn} (Categories)` : 'Count (Frequency Scale)', font: { size: 11, color: '#334155' }, standoff: 12 },
            automargin: true,
            showgrid: true,
            gridcolor: '#f1f5f9',
          },
        },
      },
      interpretation: text,
      notes,
    };
  }

  throw new Error(`Unhandled function category "${funcDef.category}"`);
}
