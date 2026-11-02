import type { FunctionId, DescriptiveStats, QualityStats, FrequencyItem } from './types.js';

export function generateInterpretation(
  funcId: FunctionId,
  columnName: string,
  stats?: DescriptiveStats,
  quality?: QualityStats,
  frequencies?: FrequencyItem[],
  secondaryColumnName?: string,
  extra?: { correlation?: number; binCount?: number }
): { text: string; notes?: string[] } {
  const notes: string[] = [];

  if (stats?.missingCount && stats.missingCount > 0) {
    notes.push(`${stats.missingCount} missing/blank value(s) were excluded from this calculation.`);
  }

  switch (funcId) {
    case 'MEAN': {
      const mean = stats?.mean ?? 0;
      return {
        text: `The arithmetic mean of "${columnName}" is ${mean.toLocaleString()}. This represents the central balance point of all ${stats?.count} valid observations.`,
        notes,
      };
    }

    case 'MEDIAN': {
      const med = stats?.median ?? 0;
      return {
        text: `The median value is ${med.toLocaleString()}. Exactly 50% of the observations in "${columnName}" are at or below this value, making it resilient to extreme outliers.`,
        notes,
      };
    }

    case 'MODE': {
      if (!stats?.mode || stats.mode.length === 0) {
        return {
          text: `No repeated mode was detected in "${columnName}". Every valid observation appears with unique or uniform frequency.`,
          notes,
        };
      }
      const topModes = stats.mode.map((m) => `"${m.value}" (${m.count} occurrences)`).join(', ');
      return {
        text: `The most frequently occurring value(s) in "${columnName}": ${topModes}.`,
        notes,
      };
    }

    case 'MINIMUM': {
      return {
        text: `The minimum observed value in "${columnName}" is ${stats?.min?.toLocaleString()}.`,
        notes,
      };
    }

    case 'MAXIMUM': {
      return {
        text: `The maximum observed value in "${columnName}" is ${stats?.max?.toLocaleString()}.`,
        notes,
      };
    }

    case 'RANGE': {
      return {
        text: `The total range of "${columnName}" spans ${stats?.range?.toLocaleString()} units (from ${stats?.min?.toLocaleString()} to ${stats?.max?.toLocaleString()}).`,
        notes,
      };
    }

    case 'SUM': {
      return {
        text: `The aggregate sum of all ${stats?.count} valid observations in "${columnName}" is ${stats?.sum?.toLocaleString()}.`,
        notes,
      };
    }

    case 'COUNT': {
      return {
        text: `Contains ${stats?.count} valid non-empty records out of ${((stats?.count || 0) + (stats?.missingCount || 0))} total rows in the table.`,
        notes,
      };
    }

    case 'VARIANCE': {
      const sVar = stats?.sampleVariance ?? stats?.populationVariance ?? 0;
      const pVar = stats?.populationVariance ?? 0;
      notes.push(`Sample variance: ${sVar.toLocaleString()} (degrees of freedom: N-1 = ${(stats?.count || 1) - 1}).`);
      notes.push(`Population variance: ${pVar.toLocaleString()} (N = ${stats?.count}).`);
      return {
        text: `The sample variance is ${sVar.toLocaleString()}, measuring the average squared deviation of "${columnName}" from its mean.`,
        notes,
      };
    }

    case 'STD_DEV': {
      const sSd = stats?.sampleStdDev ?? stats?.populationStdDev ?? 0;
      const pSd = stats?.populationStdDev ?? 0;
      notes.push(`Sample std dev (s): ${sSd.toLocaleString()} | Population std dev (σ): ${pSd.toLocaleString()}`);
      return {
        text: `The standard deviation indicates the spread of "${columnName}" around its mean (${stats?.mean}). On average, observations deviate by approximately ±${sSd.toLocaleString()} units.`,
        notes,
      };
    }

    case 'QUARTILES': {
      return {
        text: `Quartiles divide "${columnName}" into 4 equal segments: 25% of records are ≤ ${stats?.q1} (Q1), 50% are ≤ ${stats?.q2} (Median), and 75% are ≤ ${stats?.q3} (Q3).`,
        notes,
      };
    }

    case 'IQR': {
      return {
        text: `The Interquartile Range (IQR = Q3 - Q1) is ${stats?.iqr}. The middle 50% of all data points fall cleanly within this ${stats?.iqr} unit span.`,
        notes,
      };
    }

    case 'PERCENTILES': {
      return {
        text: `Percentiles illustrate rank distribution across "${columnName}". 10th percentile: ${stats?.percentiles?.[10]}, 90th percentile: ${stats?.percentiles?.[90]}, 99th percentile: ${stats?.percentiles?.[99]}.`,
        notes,
      };
    }

    case 'SKEWNESS': {
      const sk = stats?.skewness ?? 0;
      let shape = 'symmetrical';
      if (sk > 0.5) shape = 'moderately right-skewed (positive skew, longer tail on the right)';
      else if (sk > 1.0) shape = 'highly right-skewed (positive skew, heavy right tail)';
      else if (sk < -1.0) shape = 'highly left-skewed (negative skew, heavy left tail)';
      else if (sk < -0.5) shape = 'moderately left-skewed (negative skew, longer tail on the left)';
      else shape = 'approximately symmetric (skewness close to 0)';

      return {
        text: `Sample skewness is ${sk > 0 ? '+' : ''}${sk}. The distribution of "${columnName}" is ${shape}.`,
        notes,
      };
    }

    case 'KURTOSIS': {
      const kt = stats?.kurtosis ?? 0;
      let tailDesc = 'mesokurtic (normal-like tails)';
      if (kt > 0.5) tailDesc = 'leptokurtic (sharp peak with heavy tails / prone to outliers)';
      else if (kt < -0.5) tailDesc = 'platykurtic (flatter peak with lighter tails)';

      return {
        text: `Excess kurtosis is ${kt > 0 ? '+' : ''}${kt}. The distribution of "${columnName}" is ${tailDesc}.`,
        notes,
      };
    }

    case 'HISTOGRAM': {
      return {
        text: `Interactive histogram showing frequency grouping across "${columnName}". Hover over bars to see intervals and record counts; use the bin control to adjust granularity.`,
        notes,
      };
    }

    case 'BOX_PLOT': {
      const outlierCount = quality?.outliers?.count ?? 0;
      return {
        text: `Box plot visualizing minimum, Q1, median, Q3, maximum, and ${outlierCount} outlier(s). Click any outlier point to locate and inspect its original row record.`,
        notes,
      };
    }

    case 'FREQUENCY_DIST': {
      const topCount = frequencies?.[0]?.count ?? 0;
      const topVal = frequencies?.[0]?.value ?? 'N/A';
      return {
        text: `Frequency analysis across ${frequencies?.length || 0} unique categories. Most common: "${topVal}" with ${topCount} occurrences.`,
        notes,
      };
    }

    case 'CUMULATIVE_FREQ': {
      return {
        text: `Cumulative frequency tracks running totals and cumulative percentiles across ordered categories in "${columnName}".`,
        notes,
      };
    }

    case 'MISSING_VALUES': {
      const missing = quality?.missingCount || 0;
      const pct = quality?.missingPercentage || 0;
      return {
        text: `Found ${missing} missing or empty cell(s) (${pct}%) across ${quality?.totalRows} rows in "${columnName}". ${missing === 0 ? 'Column data completeness is 100%.' : 'Consider handling or imputing missing records.'}`,
        notes,
      };
    }

    case 'DUPLICATE_DETECTION': {
      const dup = quality?.duplicateCount || 0;
      return {
        text: `Detected ${dup} duplicate row value(s) across "${columnName}". ${dup > 0 ? 'Click duplicate categories below to inspect all affected rows.' : 'All values are completely distinct.'}`,
        notes,
      };
    }

    case 'UNIQUE_VALUES': {
      const uCount = quality?.uniqueCount || 0;
      const ratio = ((quality?.uniquenessRatio || 0) * 100).toFixed(1);
      return {
        text: `"${columnName}" contains ${uCount} unique distinct value(s) out of ${quality?.validCount} valid cells (${ratio}% uniqueness ratio).`,
        notes,
      };
    }

    case 'OUTLIER_DETECTION': {
      const count = quality?.outliers?.count || 0;
      const lower = quality?.outliers?.lowerBound;
      const upper = quality?.outliers?.upperBound;
      return {
        text: `Tukey's IQR method detected ${count} outlier(s) outside [${lower}, ${upper}]. Click any outlier below to inspect its full row data.`,
        notes,
      };
    }

    case 'DATA_TYPE_DETECTION': {
      return {
        text: `Inferred data type for "${columnName}": ${quality?.detectedType?.toUpperCase()}. ${quality?.validCount} cell(s) match this type.`,
        notes,
      };
    }

    case 'INVALID_VALUES': {
      const invCount = quality?.invalids?.count || 0;
      return {
        text: `Found ${invCount} invalid or unparseable cell value(s) that conflict with the primary data type of "${columnName}".`,
        notes,
      };
    }

    case 'BAR_CHART':
    case 'HORIZONTAL_BAR_CHART': {
      return {
        text: `Categorical bar chart showing distribution of "${columnName}". Click any bar to highlight and filter corresponding records in the data inspector.`,
        notes,
      };
    }

    case 'PIE_CHART':
    case 'DONUT_CHART': {
      return {
        text: `Proportional breakdown of categories in "${columnName}". Shows percentage contributions to the whole.`,
        notes,
      };
    }

    case 'LINE_CHART': {
      return {
        text: `Sequential line chart plotting observation trends along "${columnName}". Zoom into specific windows or pan across data points.`,
        notes,
      };
    }

    case 'AREA_CHART': {
      return {
        text: `Continuous area chart highlighting volume and magnitude of observations across "${columnName}".`,
        notes,
      };
    }

    case 'SCATTER_PLOT': {
      const r = extra?.correlation;
      const rText = r !== undefined ? ` Pearson correlation r = ${r > 0 ? '+' : ''}${r}.` : '';
      return {
        text: `Bivariate scatter plot comparing "${columnName}" (X) vs "${secondaryColumnName || 'Y'}" (Y).${rText} Click or box-select points to inspect the source table rows.`,
        notes,
      };
    }

    case 'HEATMAP': {
      return {
        text: `Correlation heatmap showing pairwise Pearson r coefficients across selected numerical columns. Click any cell to inspect relationship details.`,
        notes,
      };
    }

    default:
      return {
        text: `Analysis of "${columnName}" completed successfully.`,
        notes,
      };
  }
}
