import type {
  DescriptiveStats,
  FrequencyItem,
  QualityStats,
  OutlierItem,
} from './types.js';
import type { CleanedRowData } from './typeInference.js';

/**
 * Calculates a specific percentile using linear interpolation
 */
export function calculatePercentile(sortedValues: number[], p: number): number {
  if (sortedValues.length === 0) return 0;
  if (sortedValues.length === 1) return sortedValues[0];
  if (p <= 0) return sortedValues[0];
  if (p >= 100) return sortedValues[sortedValues.length - 1];

  const index = (p / 100) * (sortedValues.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;

  if (lower === upper) return sortedValues[lower];
  return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
}

/**
 * Computes all descriptive statistics for an array of numerical values
 */
export function computeDescriptiveStats(
  data: CleanedRowData<number>[],
  missingCount: number
): DescriptiveStats {
  const n = data.length;
  if (n === 0) {
    return { count: 0, missingCount };
  }

  const values = data.map((d) => d.value);
  const sorted = [...values].sort((a, b) => a - b);

  // Sum and Mean
  const sum = values.reduce((acc, v) => acc + v, 0);
  const mean = sum / n;

  // Min, Max, Range
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const range = max - min;

  // Median and Quartiles
  const q1 = calculatePercentile(sorted, 25);
  const median = calculatePercentile(sorted, 50);
  const q3 = calculatePercentile(sorted, 75);
  const iqr = q3 - q1;

  // Percentiles
  const percentiles: Record<number, number> = {
    10: calculatePercentile(sorted, 10),
    25: q1,
    50: median,
    75: q3,
    90: calculatePercentile(sorted, 90),
    95: calculatePercentile(sorted, 95),
    99: calculatePercentile(sorted, 99),
  };

  // Variance & Standard Deviation
  let sampleVariance: number | undefined;
  let populationVariance: number | undefined;
  let sampleStdDev: number | undefined;
  let populationStdDev: number | undefined;

  const squaredDiffSum = values.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0);
  populationVariance = squaredDiffSum / n;
  populationStdDev = Math.sqrt(populationVariance);

  if (n > 1) {
    sampleVariance = squaredDiffSum / (n - 1);
    sampleStdDev = Math.sqrt(sampleVariance);
  }

  // Skewness (Sample Fisher-Pearson coefficient)
  let skewness: number | undefined;
  if (n >= 3 && sampleStdDev && sampleStdDev > 0) {
    const cubedSum = values.reduce((acc, v) => acc + Math.pow((v - mean) / sampleStdDev!, 3), 0);
    skewness = (n / ((n - 1) * (n - 2))) * cubedSum;
  }

  // Excess Kurtosis (Sample unbiased kurtosis)
  let kurtosis: number | undefined;
  if (n >= 4 && sampleStdDev && sampleStdDev > 0) {
    const quadSum = values.reduce((acc, v) => acc + Math.pow((v - mean) / sampleStdDev!, 4), 0);
    const term1 = (n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3));
    const term2 = (3 * Math.pow(n - 1, 2)) / ((n - 2) * (n - 3));
    kurtosis = term1 * quadSum - term2;
  }

  // Mode
  const counts = new Map<number, number>();
  for (const v of values) {
    counts.set(v, (counts.get(v) || 0) + 1);
  }

  let maxFreq = 0;
  for (const count of counts.values()) {
    if (count > maxFreq) maxFreq = count;
  }

  let mode: Array<{ value: number; count: number }> | undefined;
  if (maxFreq > 1) {
    const modes: Array<{ value: number; count: number }> = [];
    for (const [v, count] of counts.entries()) {
      if (count === maxFreq) {
        modes.push({ value: v, count });
      }
    }
    // Limit to top 5 modes if multimodal
    mode = modes.slice(0, 5);
  }

  return {
    count: n,
    missingCount,
    mean: Number(mean.toFixed(4)),
    median: Number(median.toFixed(4)),
    mode,
    min,
    max,
    range: Number(range.toFixed(4)),
    sum: Number(sum.toFixed(4)),
    sampleVariance: sampleVariance !== undefined ? Number(sampleVariance.toFixed(4)) : undefined,
    populationVariance: Number(populationVariance.toFixed(4)),
    sampleStdDev: sampleStdDev !== undefined ? Number(sampleStdDev.toFixed(4)) : undefined,
    populationStdDev: Number(populationStdDev.toFixed(4)),
    q1: Number(q1.toFixed(4)),
    q2: Number(median.toFixed(4)),
    q3: Number(q3.toFixed(4)),
    iqr: Number(iqr.toFixed(4)),
    percentiles,
    skewness: skewness !== undefined ? Number(skewness.toFixed(4)) : undefined,
    kurtosis: kurtosis !== undefined ? Number(kurtosis.toFixed(4)) : undefined,
  };
}

/**
 * Calculates frequency and cumulative frequency distribution
 */
export function computeFrequencyDistribution(
  data: Array<{ value: string; rowIndex: number }>,
  _totalDatasetRows?: number
): FrequencyItem[] {
  const map = new Map<string, { count: number; rowIndices: number[] }>();

  for (const item of data) {
    const key = item.value;
    const existing = map.get(key);
    if (existing) {
      existing.count++;
      existing.rowIndices.push(item.rowIndex);
    } else {
      map.set(key, { count: 1, rowIndices: [item.rowIndex] });
    }
  }

  // Sort by count descending
  const sortedEntries = Array.from(map.entries()).sort((a, b) => b[1].count - a[1].count);

  let cumulativeCount = 0;
  const total = data.length || 1;

  return sortedEntries.map(([value, info]) => {
    cumulativeCount += info.count;
    return {
      value,
      count: info.count,
      percentage: Number(((info.count / total) * 100).toFixed(2)),
      cumulativeCount,
      cumulativePercentage: Number(((cumulativeCount / total) * 100).toFixed(2)),
      rowIndices: info.rowIndices,
    };
  });
}

/**
 * Detects outliers using Tukey's fences (1.5 * IQR)
 */
export function detectOutliers(data: CleanedRowData<number>[]): {
  count: number;
  lowerBound: number;
  upperBound: number;
  items: OutlierItem[];
} {
  if (data.length < 4) {
    return { count: 0, lowerBound: 0, upperBound: 0, items: [] };
  }

  const values = data.map((d) => d.value).sort((a, b) => a - b);
  const q1 = calculatePercentile(values, 25);
  const q3 = calculatePercentile(values, 75);
  const iqr = q3 - q1;

  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 1.5 * iqr;
  const extremeLower = q1 - 3 * iqr;
  const extremeUpper = q3 + 3 * iqr;

  const items: OutlierItem[] = [];

  for (const item of data) {
    if (item.value < lowerBound || item.value > upperBound) {
      const isExtreme = item.value < extremeLower || item.value > extremeUpper;
      items.push({
        rowIndex: item.rowIndex,
        displayRow: item.displayRow,
        value: item.value,
        severity: isExtreme ? 'extreme' : 'mild',
      });
    }
  }

  return {
    count: items.length,
    lowerBound: Number(lowerBound.toFixed(4)),
    upperBound: Number(upperBound.toFixed(4)),
    items,
  };
}

/**
 * Computes comprehensive data quality statistics for a column
 */
export function computeQualityStats(
  _columnName: string,
  totalRows: number,
  validCount: number,
  missingCount: number,
  uniqueCount: number,
  rawRows: Array<{ value: string; rowIndex: number }>,
  numericalData?: CleanedRowData<number>[],
  invalidItems?: Array<{ rowIndex: number; rawValue: string }>
): QualityStats {
  const missingPercentage = totalRows > 0 ? (missingCount / totalRows) * 100 : 0;
  const uniquenessRatio = validCount > 0 ? uniqueCount / validCount : 0;

  // Duplicates detection
  const valueCounts = new Map<string, { count: number; rowIndices: number[] }>();
  for (const r of rawRows) {
    const val = r.value.trim();
    if (!val) continue;
    const existing = valueCounts.get(val);
    if (existing) {
      existing.count++;
      existing.rowIndices.push(r.rowIndex);
    } else {
      valueCounts.set(val, { count: 1, rowIndices: [r.rowIndex] });
    }
  }

  const duplicateValues: Array<{ value: string; count: number; rowIndices: number[] }> = [];
  let duplicateCount = 0;

  for (const [value, entry] of valueCounts.entries()) {
    if (entry.count > 1) {
      duplicateCount += entry.count - 1;
      duplicateValues.push({ value, count: entry.count, rowIndices: entry.rowIndices });
    }
  }

  // Outliers (if numerical)
  let outliers: { count: number; lowerBound: number; upperBound: number; items: OutlierItem[] } | undefined;
  if (numericalData && numericalData.length >= 4) {
    outliers = detectOutliers(numericalData);
  }

  // Invalids
  const invalids = invalidItems
    ? {
        count: invalidItems.length,
        items: invalidItems.map((inv) => ({
          rowIndex: inv.rowIndex,
          rawValue: inv.rawValue,
          reason: `Value "${inv.rawValue}" cannot be converted to expected format`,
        })),
      }
    : undefined;

  return {
    totalRows,
    validCount,
    missingCount,
    missingPercentage: Number(missingPercentage.toFixed(2)),
    uniqueCount,
    uniquenessRatio: Number(uniquenessRatio.toFixed(4)),
    duplicateCount,
    duplicateValues: duplicateValues.sort((a, b) => b.count - a.count).slice(0, 10),
    outliers,
    invalids,
  };
}

/**
 * Computes Pearson correlation coefficient between two numerical series
 */
export function computePearsonCorrelation(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length);
  if (n < 2) return 0;

  let sumX = 0;
  let sumY = 0;
  for (let i = 0; i < n; i++) {
    sumX += x[i];
    sumY += y[i];
  }

  const meanX = sumX / n;
  const meanY = sumY / n;

  let numerator = 0;
  let sumDiffX2 = 0;
  let sumDiffY2 = 0;

  for (let i = 0; i < n; i++) {
    const diffX = x[i] - meanX;
    const diffY = y[i] - meanY;
    numerator += diffX * diffY;
    sumDiffX2 += diffX * diffX;
    sumDiffY2 += diffY * diffY;
  }

  const denominator = Math.sqrt(sumDiffX2 * sumDiffY2);
  if (denominator === 0) return 0;

  const r = numerator / denominator;
  return Number(r.toFixed(4));
}
