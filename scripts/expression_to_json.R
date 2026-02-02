#!/usr/bin/env Rscript

# Gene Expression to JSON Converter
# This script takes an expression matrix and sample annotations and outputs
# a JSON file formatted for the GeneViz dashboard.
#
# Usage:
#   Rscript expression_to_json.R \
#     --expression expression_matrix.csv \
#     --annotation sample_annotation.csv \
#     --genes "TP53,BRCA1,EGFR,MYC" \
#     --group_column "treatment" \
#     --output output.json \
#     --name "My Study"
#
# Arguments:
#   --expression   : Path to expression matrix CSV (genes as rows, samples as columns)
#   --annotation   : Path to sample annotation CSV (must have a 'sample' or 'sampleId' column)
#   --genes        : Comma-separated list of genes to include (optional, default: all)
#   --group_column : Column name in annotation to use for sample grouping
#   --output       : Output JSON file path
#   --name         : Dataset name for the dashboard
#   --description  : Optional dataset description

# Required packages
suppressPackageStartupMessages({
  if (!require("jsonlite")) install.packages("jsonlite", repos = "https://cran.r-project.org")
  if (!require("optparse")) install.packages("optparse", repos = "https://cran.r-project.org")
  library(jsonlite)
  library(optparse)
})

# Define command line options
option_list <- list(
  make_option(c("-e", "--expression"), type = "character", default = NULL,
              help = "Path to expression matrix CSV", metavar = "FILE"),
  make_option(c("-a", "--annotation"), type = "character", default = NULL,
              help = "Path to sample annotation CSV", metavar = "FILE"),
  make_option(c("-g", "--genes"), type = "character", default = NULL,
              help = "Comma-separated list of genes to include (default: all)", metavar = "GENES"),
  make_option(c("-c", "--group_column"), type = "character", default = "group",
              help = "Column name for sample grouping [default: %default]", metavar = "COLUMN"),
  make_option(c("-o", "--output"), type = "character", default = "expression_data.json",
              help = "Output JSON file path [default: %default]", metavar = "FILE"),
  make_option(c("-n", "--name"), type = "character", default = "Expression Dataset",
              help = "Dataset name [default: %default]", metavar = "NAME"),
  make_option(c("-d", "--description"), type = "character", default = NULL,
              help = "Dataset description", metavar = "DESC")
)

opt_parser <- OptionParser(option_list = option_list)
opt <- parse_args(opt_parser)

# Validate required arguments
if (is.null(opt$expression)) {
  stop("Expression matrix file is required. Use --expression <file>")
}
if (is.null(opt$annotation)) {
  stop("Sample annotation file is required. Use --annotation <file>")
}

# Helper function to read CSV or TSV based on file extension
read_delimited <- function(file_path, ...) {
  ext <- tolower(tools::file_ext(file_path))
  if (ext %in% c("tsv", "txt", "tab")) {
    cat(paste("  Detected tab-delimited format:", basename(file_path), "\n"))
    return(read.delim(file_path, ...))
  } else {
    cat(paste("  Detected CSV format:", basename(file_path), "\n"))
    return(read.csv(file_path, ...))
  }
}

# Read input files
cat("Reading expression matrix...\n")
expr_matrix <- read_delimited(opt$expression, row.names = 1, check.names = FALSE)

cat("Reading sample annotations...\n")
annotations <- read_delimited(opt$annotation, check.names = FALSE)

# Identify sample ID column
sample_col <- NULL
for (col in c("sample", "sampleId", "Sample", "SampleID", "sample_id")) {
  if (col %in% colnames(annotations)) {
    sample_col <- col
    break
  }
}
if (is.null(sample_col)) {
  # Use first column as sample ID
  sample_col <- colnames(annotations)[1]
  cat(paste("Using first column as sample ID:", sample_col, "\n"))
}

# Rename to sampleId for consistency
annotations$sampleId <- annotations[[sample_col]]

# Validate group column
if (!(opt$group_column %in% colnames(annotations))) {
  stop(paste("Group column '", opt$group_column, "' not found in annotations. Available columns: ",
             paste(colnames(annotations), collapse = ", "), sep = ""))
}
annotations$group <- as.character(annotations[[opt$group_column]])

# Get samples present in both expression and annotation
common_samples <- intersect(colnames(expr_matrix), annotations$sampleId)
if (length(common_samples) == 0) {
  stop("No common samples between expression matrix and annotations")
}
cat(paste("Found", length(common_samples), "common samples\n"))

# Filter to common samples
expr_matrix <- expr_matrix[, common_samples, drop = FALSE]
annotations <- annotations[annotations$sampleId %in% common_samples, ]

# Select genes
all_genes <- rownames(expr_matrix)
if (!is.null(opt$genes)) {
  selected_genes <- unlist(strsplit(opt$genes, ","))
  selected_genes <- trimws(selected_genes)
  missing_genes <- setdiff(selected_genes, all_genes)
  if (length(missing_genes) > 0) {
    warning(paste("Genes not found in expression matrix:", paste(missing_genes, collapse = ", ")))
  }
  selected_genes <- intersect(selected_genes, all_genes)
  if (length(selected_genes) == 0) {
    stop("No valid genes found in expression matrix")
  }
} else {
  selected_genes <- all_genes
}
cat(paste("Processing", length(selected_genes), "genes\n"))

# Get unique groups
groups <- unique(annotations$group)
cat(paste("Sample groups:", paste(groups, collapse = ", "), "\n"))

# Build sample annotations list
samples_list <- lapply(1:nrow(annotations), function(i) {
  row <- annotations[i, ]
  sample_data <- list(
    sampleId = as.character(row$sampleId),
    group = as.character(row$group)
  )
  # Add other annotation columns
  for (col in colnames(annotations)) {
    if (!(col %in% c("sampleId", "group", sample_col, opt$group_column))) {
      sample_data[[col]] <- row[[col]]
    }
  }
  return(sample_data)
})

# Build expression data
cat("Building expression data...\n")
expressions_list <- lapply(selected_genes, function(gene) {
  gene_values <- expr_matrix[gene, ]
  
  samples <- lapply(common_samples, function(sample_id) {
    sample_group <- annotations$group[annotations$sampleId == sample_id][1]
    list(
      sampleId = sample_id,
      value = as.numeric(gene_values[sample_id]),
      group = sample_group
    )
  })
  
  list(
    gene = gene,
    samples = samples
  )
})

# Construct output object
output <- list(
  name = opt$name,
  description = if (!is.null(opt$description)) opt$description else paste("Expression data for", length(selected_genes), "genes"),
  genes = selected_genes,
  samples = samples_list,
  expressions = expressions_list,
  groupColumn = opt$group_column,
  groups = groups
)

# Write JSON
cat(paste("Writing output to", opt$output, "...\n"))
json_output <- toJSON(output, auto_unbox = TRUE, pretty = TRUE, digits = 4)
writeLines(json_output, opt$output)

cat("Done!\n")
cat(paste("Output file:", opt$output, "\n"))
cat(paste("Genes:", length(selected_genes), "\n"))
cat(paste("Samples:", length(common_samples), "\n"))
cat(paste("Groups:", paste(groups, collapse = ", "), "\n"))
