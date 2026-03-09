# Gene Expression Data Processing Scripts

This folder contains R scripts for converting expression data into JSON format for the Gene Expression Explorer dashboard.

## expression_to_json.R

Converts expression matrices and sample annotations to the JSON format expected by the dashboard.

### Requirements

- R (>= 3.6)
- Packages: `jsonlite`, `optparse` (installed automatically if missing)

### Usage

```bash
Rscript expression_to_json.R \
  --expression expression_matrix.csv \
  --annotation sample_annotation.csv \
  --genes "TP53,BRCA1,EGFR,MYC" \
  --group_column "treatment" \
  --output output.json \
  --name "My Study" \
  --description "Gene expression from RNA-seq experiment"
```

### Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `--expression` | Yes | Path to expression matrix CSV (genes as rows, samples as columns) |
| `--annotation` | Yes | Path to sample annotation CSV |
| `--genes` | No | Comma-separated list of genes to include (default: all genes) |
| `--group_column` | No | Column in annotations for grouping samples (default: "group") |
| `--output` | No | Output JSON file path (default: "expression_data.json") |
| `--name` | No | Dataset name shown in dashboard |
| `--description` | No | Dataset description |

### Input File Formats

#### Expression Matrix (CSV)

- First column: Gene names/IDs (used as row names)
- Remaining columns: Sample expression values
- Values should be log2-transformed (recommended)

```csv
,Sample1,Sample2,Sample3,Sample4
TP53,8.5,7.2,9.1,8.8
BRCA1,6.3,6.8,5.9,6.5
EGFR,10.2,11.5,9.8,10.1
```

#### Sample Annotation (CSV)

- Must have a sample ID column (named "sample", "sampleId", "Sample", or first column)
- Must have a grouping column (specified by `--group_column`)
- Can include additional annotation columns

```csv
sample,group,age,tissue
Sample1,Control,45,Normal
Sample2,Control,52,Normal
Sample3,Treatment,48,Tumor
Sample4,Treatment,55,Tumor
```

### Output Format

The output JSON has the following structure:

```json
{
  "name": "Dataset Name",
  "description": "Description",
  "genes": ["TP53", "BRCA1", "EGFR"],
  "samples": [
    { "sampleId": "Sample1", "group": "Control", "age": 45, "tissue": "Normal" }
  ],
  "expressions": [
    {
      "gene": "TP53",
      "samples": [
        { "sampleId": "Sample1", "value": 8.5, "group": "Control" }
      ]
    }
  ],
  "groupColumn": "group",
  "groups": ["Control", "Treatment"]
}
```

### Example Workflow

1. Prepare your expression matrix (log2 TPM/FPKM recommended)
2. Prepare sample annotations with grouping information
3. Run the script to generate JSON
4. Upload the JSON file to the GeneViz dashboard

```bash
# Process all genes
Rscript expression_to_json.R \
  -e my_expression.csv \
  -a my_samples.csv \
  -c treatment_group \
  -o my_data.json

# Process specific genes only
Rscript expression_to_json.R \
  -e my_expression.csv \
  -a my_samples.csv \
  -g "TP53,BRCA1,EGFR,MYC,KRAS" \
  -c treatment_group \
  -o my_data.json \
  -n "Cancer Gene Panel"
```
