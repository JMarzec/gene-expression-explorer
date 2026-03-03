# GeneViz — Gene Expression Explorer

An interactive, browser-based dashboard for visualizing and comparing gene expression datasets. Upload your data as JSON files, explore expression patterns across samples and groups, and export publication-ready figures and statistics.

## Purpose & Objectives

- **Explore** gene expression profiles across experimental conditions, tissues, or treatments
- **Compare** multiple datasets side-by-side with cross-dataset statistics
- **Visualize** data through box plots, heatmaps, volcano plots, violin plots, histograms, correlation matrices, and more
- **Export** high-quality figures (PNG/PDF) and statistical summaries (CSV)
- **No backend required** — runs entirely in the browser with no data leaving your machine

## Dashboard Features

| Feature | Description |
|---------|-------------|
| **Box Plot** | Per-gene expression distribution by group with outlier detection |
| **Heatmap** | Z-score normalized expression heatmap across genes and samples |
| **Histogram** | Expression value distribution for selected genes |
| **Violin Plot** | Density-based expression distribution by group |
| **Strip/Dot Plot** | Individual sample values overlaid on group statistics |
| **Per-Sample Box Plot** | Sample-level expression spread across all selected genes |
| **Correlation Matrix** | Pairwise gene–gene Pearson correlation heatmap |
| **Gene Correlation** | Scatter plot of expression between two selected genes |
| **Differential Expression** | Fold change and p-value table between groups |
| **Volcano Plot** | −log₁₀(p-value) vs. log₂(fold change) with gene labels for significant hits |
| **Comparison Mode** | Load up to 4 datasets and compare per-gene statistics, rankings, and Δ values |
| **Export** | Download charts as PNG/PDF, export statistics as CSV, generate comparison reports |

## Installation

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later) and npm
- (Optional) [R](https://www.r-project.org/) ≥ 3.6 for the data conversion script

### Setup

```bash
# Clone the repository
git clone https://github.com/your-org/geneviz.git
cd geneviz

# Install dependencies
npm install

# Start the development server
npm run dev
```

The app will be available at `http://localhost:5173`.

### Build for Production

```bash
npm run build
npm run preview   # preview the production build locally
```

## Input Data Format

The dashboard expects a **JSON file** with the following structure:

```json
{
  "name": "My Experiment",
  "description": "RNA-seq expression data",
  "genes": ["TP53", "BRCA1", "EGFR"],
  "samples": [
    { "sampleId": "S1", "group": "Control", "age": 45 },
    { "sampleId": "S2", "group": "Treatment", "age": 52 }
  ],
  "expressions": [
    {
      "gene": "TP53",
      "samples": [
        { "sampleId": "S1", "value": 8.5, "group": "Control" },
        { "sampleId": "S2", "value": 9.1, "group": "Treatment" }
      ]
    }
  ],
  "groupColumn": "group",
  "groups": ["Control", "Treatment"]
}
```

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Dataset display name |
| `description` | string | Optional description |
| `genes` | string[] | List of gene identifiers |
| `samples` | object[] | Sample annotations (must include `sampleId` and `group`) |
| `expressions` | object[] | Per-gene expression values for each sample |
| `groupColumn` | string | Name of the annotation column used for grouping |
| `groups` | string[] | Unique group labels |

> **Tip:** Expression values should be log₂-transformed (e.g., log₂ TPM or log₂ FPKM) for best results.

## Converting Expression Data with R

An R script is provided in `scripts/` to convert standard expression matrices and sample annotation tables into the required JSON format.

### Requirements

- R ≥ 3.6
- Packages: `jsonlite`, `optparse` (installed automatically if missing)

### Usage

```bash
Rscript scripts/expression_to_json.R \
  --expression expression_matrix.csv \
  --annotation sample_annotation.csv \
  --genes "TP53,BRCA1,EGFR,MYC" \
  --group_column "treatment" \
  --output output.json \
  --name "My Study" \
  --description "RNA-seq experiment"
```

| Argument | Required | Description |
|----------|----------|-------------|
| `--expression` / `-e` | Yes | Expression matrix CSV (genes × samples) |
| `--annotation` / `-a` | Yes | Sample annotation CSV |
| `--genes` / `-g` | No | Comma-separated gene list (default: all) |
| `--group_column` / `-c` | No | Grouping column name (default: `"group"`) |
| `--output` / `-o` | No | Output path (default: `expression_data.json`) |
| `--name` / `-n` | No | Dataset name |
| `--description` / `-d` | No | Dataset description |

### Input File Formats

**Expression Matrix (CSV/TSV):**

```csv
,Sample1,Sample2,Sample3
TP53,8.5,7.2,9.1
BRCA1,6.3,6.8,5.9
```

- First column: gene names (used as row names)
- Remaining columns: numeric expression values per sample

**Sample Annotation (CSV/TSV):**

```csv
sample,group,age,tissue
Sample1,Control,45,Normal
Sample2,Control,52,Normal
Sample3,Treatment,48,Tumor
```

- Must contain a sample ID column (`sample`, `sampleId`, or first column)
- Must contain the grouping column specified by `--group_column`

## Project Structure

```
geneviz/
├── public/                     # Static assets
├── scripts/
│   ├── expression_to_json.R    # R script for data conversion
│   └── README.md               # R script documentation
├── src/
│   ├── components/
│   │   ├── charts/             # Visualization components
│   │   │   ├── ComparisonSummaryStats.tsx
│   │   │   ├── CorrelationMatrix.tsx
│   │   │   ├── DifferentialExpression.tsx
│   │   │   ├── ExpressionBoxPlot.tsx
│   │   │   ├── ExpressionHeatmap.tsx
│   │   │   ├── ExpressionHistogram.tsx
│   │   │   ├── ExpressionViolinPlot.tsx
│   │   │   ├── GeneCorrelationPlot.tsx
│   │   │   ├── SampleBoxPlot.tsx
│   │   │   ├── SummaryStats.tsx
│   │   │   └── VolcanoPlot.tsx
│   │   ├── dashboard/          # Dashboard layout & controls
│   │   │   ├── ComparisonPanel.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   ├── DashboardSidebar.tsx
│   │   │   ├── DatasetManager.tsx
│   │   │   ├── ExportMenu.tsx
│   │   │   ├── GeneSelector.tsx
│   │   │   └── GroupFilter.tsx
│   │   └── ui/                 # Reusable UI primitives (shadcn/ui)
│   ├── data/
│   │   └── demoData.ts         # Built-in demo dataset
│   ├── hooks/                  # Custom React hooks
│   ├── pages/                  # Route pages
│   ├── types/
│   │   └── expression.ts       # TypeScript type definitions
│   └── utils/
│       └── statistics.ts       # Statistical helper functions
├── LICENSE                     # MIT License
├── package.json
├── tailwind.config.ts
├── vite.config.ts
└── README.md
```

## Tech Stack

- **React 18** + **TypeScript** — UI framework
- **Vite** — Build tool and dev server
- **Tailwind CSS** — Utility-first styling
- **shadcn/ui** — Accessible component primitives
- **Recharts** — Charting library
- **jsPDF** + **html-to-image** — PDF/PNG export

## License

This project is licensed under the [MIT License](LICENSE).

---

<p align="center">
  Powered by <a href="https://accelbio.pt/" target="_blank"><strong>AccelBio</strong></a>
</p>
