# DataLens 🔍
> **An AI-Powered Browser Extension for Automated Exploratory Data Analysis (EDA)**

DataLens is a Chrome extension built with React, TypeScript, Tailwind CSS, Plotly.js, and Manifest V3 that inspects datasets available on webpages and performs complete mathematical statistical analysis and interactive visualisations directly inside Chrome's side panel.

---

## 🌟 Core Features

### 1. Dataset Selection
- Automatic detection of all HTML `<table>` elements on active webpages.
- If only one table is detected, its name is displayed directly without redundant dropdowns.
- If multiple tables are detected, a clean selector dropdown lets users switch between tables.
- Switching tables dynamically re-infers column data types and refreshes analysis options.
- Displays total rows and total column counts.

### 2. Dual Side-by-Side Selectors & Data Type Invalidation
- **Select Column Dropdown**: Dynamically detects column data types (`[123] numerical`, `[Abc] categorical`, `[Date] date`, `[Bool] boolean`). Cleans currency symbols (`$`, `€`, `£`), commas, percentages, and accounting brackets.
- **Select Function Dropdown**: Grouped by category with strict compatibility filtering (incompatible functions are hidden):
  - **A. Descriptive Statistics**: Mean, Median, Mode, Minimum, Maximum, Range, Sum, Count, Variance (Sample & Population), Standard Deviation (Sample & Population), Quartiles (Q1, Q2, Q3), Interquartile Range (IQR), Percentiles (P10–P99), Skewness, Kurtosis.
  - **B. Data Distribution**: Histogram (with adjustable bins), Box Plot (with clickable outliers), Frequency Distribution, Cumulative Frequency.
  - **C. Data Quality**: Missing Values, Duplicate Detection, Unique Values, Outlier Detection (Tukey's fences), Data Type Detection, Invalid Values.
  - **D. Visualisations**: Bar Chart (with sort), Horizontal Bar Chart, Pie Chart, Donut Chart, Line Chart, Scatter Plot (bivariate 2nd column selector), Correlation Heatmap (multi-column matrix), Area Chart.

### 3. Multiple Analysis Support & "Compare & Analyse"
- Results are saved into independent, compact analysis cards.
- Users can run multiple analyses on the same dataset without losing previous results.
- **Compare & Analyse**: Select multiple numerical columns to generate a side-by-side statistical comparison matrix (Mean, Median, SD, Variance, Min, Max, IQR, Skewness) and grouped comparison chart.

### 4. Interactive Plotly.js Visualizations
- True interactivity: hover tooltips, zoom in/out, panning, reset view, and high-res PNG export.
- Dynamic adjustments: bin adjustment buttons on Histograms, ascending/descending sorting on Bar Charts, color scale selector (Blues, Viridis, RdBu, Magma) on Heatmaps.

### 5. Graph-to-Data Record Inspection
- Clicking any bar in a bar chart, outlier in a box plot, point in a scatter plot, or slice in a pie chart directly highlights and displays the corresponding source records in the embedded **Record Inspector**.
- Preserves original row indices (`rowIndex`) throughout data processing.

### 6. Multi-Format Exports
- **CSV Export**: Download individual or all analysis results as CSV.
- **Excel (.xlsx) Export**: Export formatted workbooks with an EDA Summary sheet and raw source data sheet using `xlsx`.
- **PDF Report Export**: Professional A4 statistical reports generated via `jspdf` and `jspdf-autotable`.
- **PNG Graph Export**: High-resolution chart snapshots via Plotly.

---

## 🏛️ Project Architecture

```
DataLens/
├── src/
│   ├── analysis/
│   │   ├── types.ts             # FunctionId, ColumnInfo, AnalysisResult, QualityStats
│   │   ├── typeInference.ts     # Automatic data type inference & numerical parser
│   │   ├── statistics.ts        # Mathematically rigorous stats & Tukey outlier engine
│   │   ├── interpretations.ts   # Human-readable educational interpretations
│   │   ├── operations.ts        # Registry of 33 operations & Plotly data generator
│   │   └── exportUtils.ts       # CSV, Excel (.xlsx), and PDF export utilities
│   ├── sidepanel/
│   │   ├── components/
│   │   │   ├── EDAPanel.tsx             # Core EDA workspace (selectors, cards, exports)
│   │   │   ├── PlotlyChart.tsx          # Plotly.js interactive graph component
│   │   │   ├── AnalysisResultCard.tsx   # Result card with metric, chart, and interpretation
│   │   │   ├── RecordInspector.tsx      # Graph-to-data mapped record preview
│   │   │   ├── CompareColumnsModal.tsx  # Cross-column numerical comparison matrix
│   │   │   ├── TablePreview.tsx         # Raw data grid view with search & pagination
│   │   │   ├── Header.tsx               # Top bar with tab status indicator
│   │   │   └── PageContextCard.tsx      # Active webpage URL & title
│   │   ├── hooks/
│   │   │   ├── useActiveTab.ts          # Active tab change listener
│   │   │   └── useTableScanner.ts       # Extraction messaging & dynamic script injection
│   │   ├── App.tsx                      # Root side panel view switcher (EDA vs Grid)
│   │   └── main.tsx                     # React 19 entry point
│   ├── extraction/
│   │   ├── types.ts                     # ExtractedTable, rowIndices tracking
│   │   └── tableExtractor.ts            # DOM table parser (captions, colspans, thead)
│   ├── content/
│   │   └── index.ts                     # Self-contained IIFE content script
│   └── background/
│       └── service-worker.ts            # Side Panel behavior & lifecycle listener
├── sample-page.html                     # Rich test playground with benchmark tables
├── scripts/
│   ├── test-extractor.ts                # Extraction unit test suite
│   └── test-statistics.ts               # Mathematical accuracy validation suite
├── vite.config.ts                       # Side panel & service worker bundler
└── vite.content.config.ts               # Standalone IIFE bundler for content script
```

---

## 🧪 Verification & Testing

Run tests and verify build:
```bash
npm test        # Runs both DOM extractor and mathematical statistics verification suites
npm run typecheck # Strict TypeScript check (0 errors)
npm run build   # Compiles full Manifest V3 extension to dist/
```

---

## 🚀 Loading into Google Chrome

1. Open Chrome and navigate to `chrome://extensions`.
2. Toggle on **Developer mode** in the top right.
3. Click **Load unpacked** and select:
   ```
   D:\Projects\DataLens\dist
   ```
4. Pin the **DataLens** extension to your toolbar.
5. Open `file:///D:/Projects/DataLens/sample-page.html` (or any webpage with tables).
6. Click the DataLens toolbar icon: the side panel will open on the right.
7. Click **"Scan This Page"** and explore the complete interactive EDA Workspace!
