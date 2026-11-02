export type DataType = 'numerical' | 'categorical' | 'date' | 'boolean';

export interface ColumnInfo {
  index: number;
  name: string;
  dataType: DataType;
  totalCount: number;
  missingCount: number;
  validCount: number;
  uniqueCount: number;
}

export type FunctionCategory =
  | 'DESCRIPTIVE'
  | 'DISTRIBUTION'
  | 'QUALITY'
  | 'VISUALIZATION';

export type FunctionId =
  // A. Descriptive Statistics
  | 'MEAN'
  | 'MEDIAN'
  | 'MODE'
  | 'MINIMUM'
  | 'MAXIMUM'
  | 'RANGE'
  | 'SUM'
  | 'COUNT'
  | 'VARIANCE'
  | 'STD_DEV'
  | 'QUARTILES'
  | 'IQR'
  | 'PERCENTILES'
  | 'SKEWNESS'
  | 'KURTOSIS'
  // B. Data Distribution
  | 'HISTOGRAM'
  | 'BOX_PLOT'
  | 'FREQUENCY_DIST'
  | 'CUMULATIVE_FREQ'
  // C. Data Quality
  | 'MISSING_VALUES'
  | 'DUPLICATE_DETECTION'
  | 'UNIQUE_VALUES'
  | 'OUTLIER_DETECTION'
  | 'DATA_TYPE_DETECTION'
  | 'INVALID_VALUES'
  // D. Visualisations
  | 'BAR_CHART'
  | 'HORIZONTAL_BAR_CHART'
  | 'PIE_CHART'
  | 'DONUT_CHART'
  | 'LINE_CHART'
  | 'SCATTER_PLOT'
  | 'HEATMAP'
  | 'AREA_CHART';

export interface FunctionDefinition {
  id: FunctionId;
  label: string;
  category: FunctionCategory;
  description: string;
  supportedTypes: DataType[];
  requiresSecondColumn?: boolean;
  requiresMultiColumn?: boolean;
  secondColumnSupportedTypes?: DataType[];
}

export interface DescriptiveStats {
  count: number;
  missingCount: number;
  mean?: number;
  median?: number;
  mode?: Array<{ value: string | number; count: number }>;
  min?: number;
  max?: number;
  range?: number;
  sum?: number;
  sampleVariance?: number;
  populationVariance?: number;
  sampleStdDev?: number;
  populationStdDev?: number;
  q1?: number;
  q2?: number;
  q3?: number;
  iqr?: number;
  percentiles?: Record<number, number>;
  skewness?: number;
  kurtosis?: number;
}

export interface FrequencyItem {
  value: string;
  count: number;
  percentage: number;
  cumulativeCount: number;
  cumulativePercentage: number;
  rowIndices: number[];
}

export interface OutlierItem {
  rowIndex: number;
  displayRow: number;
  value: number;
  severity: 'mild' | 'extreme';
}

export interface QualityStats {
  totalRows: number;
  validCount: number;
  missingCount: number;
  missingPercentage: number;
  uniqueCount: number;
  uniquenessRatio: number;
  duplicateCount: number;
  duplicateValues?: Array<{ value: string; count: number; rowIndices: number[] }>;
  outliers?: {
    count: number;
    lowerBound: number;
    upperBound: number;
    items: OutlierItem[];
  };
  invalids?: {
    count: number;
    items: Array<{ rowIndex: number; rawValue: string; reason: string }>;
  };
  detectedType?: DataType;
  typeConfidence?: number;
}

export interface ChartDataSeries {
  type: string;
  x?: Array<string | number>;
  y?: Array<string | number>;
  values?: number[];
  labels?: string[];
  z?: number[][];
  text?: string[];
  customdata?: number[] | Array<{ rowIndex: number }>;
  mode?: string;
  name?: string;
  marker?: Record<string, unknown>;
  line?: Record<string, unknown>;
  boxpoints?: string | boolean;
  jitter?: number;
  pointpos?: number;
  hole?: number;
  colorscale?: string;
  fill?: string;
  orientation?: 'h' | 'v';
  nbinsx?: number;
  textposition?: string;
  textinfo?: string;
  colorbar?: Record<string, unknown>;
}

export interface AnalysisResult {
  id: string;
  timestamp: number;
  datasetName: string;
  datasetId: string;
  functionId: FunctionId;
  functionLabel: string;
  category: FunctionCategory;
  primaryColumn: string;
  primaryColumnType: DataType;
  secondaryColumn?: string;
  secondaryColumnType?: DataType;
  selectedColumns?: string[];
  // Mathematical output
  primaryMetric?: {
    label: string;
    value: string | number;
    secondaryLabel?: string;
    secondaryValue?: string | number;
  };
  stats?: DescriptiveStats;
  frequencies?: FrequencyItem[];
  quality?: QualityStats;
  comparison?: {
    columns: string[];
    metrics: Array<{
      name: string;
      [colName: string]: string | number;
    }>;
  };
  // Visualization configuration
  chart?: {
    data: ChartDataSeries[];
    layout: Record<string, unknown>;
    config?: Record<string, unknown>;
    chartType: string;
  };
  // Interpretations
  interpretation: string;
  notes?: string[];
}
