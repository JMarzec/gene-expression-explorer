import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, Image, FileText, FileCode, Layers } from "lucide-react";
import { toPng, toSvg } from "html-to-image";
import { jsPDF } from "jspdf";
import { ExpressionDataset } from "@/types/expression";
import { calculateMean, calculateStdDev, calculateBoxPlotStats } from "@/utils/statistics";
import { toast } from "sonner";

interface ExportMenuProps {
  chartContainerId: string;
  dataset: ExpressionDataset;
  datasets?: ExpressionDataset[];
  selectedGenes: string[];
  selectedGroups: string[];
}

export function ExportMenu({
  chartContainerId,
  dataset,
  datasets = [],
  selectedGenes,
  selectedGroups,
}: ExportMenuProps) {
  const isComparisonMode = datasets.length > 1;

  const getChartElement = () => {
    return document.getElementById(chartContainerId);
  };

  const exportAsPng = async () => {
    const element = getChartElement();
    if (!element) {
      toast.error("No chart to export");
      return;
    }

    try {
      const dataUrl = await toPng(element, {
        backgroundColor: "hsl(222, 47%, 11%)",
        quality: 1,
        pixelRatio: 2,
      });
      
      const link = document.createElement("a");
      link.download = `${dataset.name}-expression-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
      toast.success("PNG exported successfully");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export as PNG");
    }
  };

  const exportAsSvg = async () => {
    const element = getChartElement();
    if (!element) {
      toast.error("No chart to export");
      return;
    }

    try {
      const dataUrl = await toSvg(element, {
        backgroundColor: "hsl(222, 47%, 11%)",
      });
      
      const link = document.createElement("a");
      link.download = `${dataset.name}-expression-${Date.now()}.svg`;
      link.href = dataUrl;
      link.click();
      toast.success("SVG exported successfully");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export as SVG");
    }
  };

  const generateSummaryData = (ds: ExpressionDataset) => {
    const availableGenes = selectedGenes.filter(g => ds.genes.includes(g));
    const availableGroups = selectedGroups.filter(g => ds.groups.includes(g));
    const selectedExpressions = ds.expressions.filter(e => 
      availableGenes.includes(e.gene)
    );

    const summaryRows: { gene: string; group: string; mean: number; std: number; n: number }[] = [];

    selectedExpressions.forEach(expr => {
      availableGroups.forEach(group => {
        const values = expr.samples
          .filter(s => s.group === group)
          .map(s => s.value);
        
        if (values.length > 0) {
          summaryRows.push({
            gene: expr.gene,
            group,
            mean: calculateMean(values),
            std: calculateStdDev(values),
            n: values.length,
          });
        }
      });
    });

    return summaryRows;
  };

  const generateGeneBoxPlotData = (ds: ExpressionDataset) => {
    const availableGenes = selectedGenes.filter(g => ds.genes.includes(g));
    const availableGroups = selectedGroups.filter(g => ds.groups.includes(g));

    return availableGenes.map(gene => {
      const expr = ds.expressions.find(e => e.gene === gene);
      if (!expr) return null;
      const values = expr.samples
        .filter(s => availableGroups.includes(s.group))
        .map(s => s.value);
      if (values.length === 0) return null;
      const stats = calculateBoxPlotStats(values);
      return { gene, ...stats, n: values.length };
    }).filter(Boolean) as { gene: string; min: number; q1: number; median: number; q3: number; max: number; n: number }[];
  };

  const exportAsHtml = () => {
    const summaryData = generateSummaryData(dataset);
    
    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${dataset.name} - Expression Summary Report</title>
  <style>
    :root {
      --bg: #0f172a;
      --card-bg: #1e293b;
      --text: #f1f5f9;
      --muted: #94a3b8;
      --border: #334155;
      --primary: #38bdf8;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: var(--bg);
      color: var(--text);
      padding: 2rem;
      line-height: 1.6;
    }
    h1 { color: var(--primary); margin-bottom: 0.5rem; }
    .meta { color: var(--muted); margin-bottom: 2rem; }
    .section { 
      background: var(--card-bg); 
      border-radius: 8px; 
      padding: 1.5rem; 
      margin-bottom: 1.5rem;
      border: 1px solid var(--border);
    }
    h2 { margin-bottom: 1rem; font-size: 1.25rem; }
    table { 
      width: 100%; 
      border-collapse: collapse; 
      font-size: 0.875rem;
    }
    th, td { 
      padding: 0.75rem; 
      text-align: left; 
      border-bottom: 1px solid var(--border);
    }
    th { 
      background: rgba(56, 189, 248, 0.1); 
      color: var(--primary);
      font-weight: 600;
    }
    tr:hover { background: rgba(255,255,255,0.02); }
    .gene-tag {
      background: rgba(56, 189, 248, 0.2);
      color: var(--primary);
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-family: monospace;
      font-weight: 600;
    }
    .stats-grid { 
      display: grid; 
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); 
      gap: 1rem; 
    }
    .stat-card { 
      background: rgba(56, 189, 248, 0.05); 
      padding: 1rem; 
      border-radius: 6px;
      text-align: center;
    }
    .stat-value { font-size: 1.5rem; font-weight: 700; color: var(--primary); }
    .stat-label { color: var(--muted); font-size: 0.75rem; text-transform: uppercase; }
  </style>
</head>
<body>
  <h1>Gene Expression Summary Report</h1>
  <p class="meta">Dataset: ${dataset.name} | Generated: ${new Date().toLocaleString()}</p>
  
  <div class="section">
    <h2>Overview</h2>
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-value">${dataset.samples.length}</div>
        <div class="stat-label">Total Samples</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${dataset.genes.length}</div>
        <div class="stat-label">Total Genes</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${selectedGenes.length}</div>
        <div class="stat-label">Selected Genes</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${selectedGroups.length}</div>
        <div class="stat-label">Selected Groups</div>
      </div>
    </div>
  </div>
  
  <div class="section">
    <h2>Selected Genes</h2>
    <p style="margin-bottom: 1rem;">
      ${selectedGenes.map(g => `<span class="gene-tag">${g}</span>`).join(' ')}
    </p>
  </div>
  
  <div class="section">
    <h2>Expression Statistics by Gene and Group</h2>
    <table>
      <thead>
        <tr>
          <th>Gene</th>
          <th>Group</th>
          <th>Mean</th>
          <th>Std Dev</th>
          <th>N Samples</th>
        </tr>
      </thead>
      <tbody>
        ${summaryData.map(row => `
          <tr>
            <td><span class="gene-tag">${row.gene}</span></td>
            <td>${row.group}</td>
            <td>${row.mean.toFixed(3)}</td>
            <td>${row.std.toFixed(3)}</td>
            <td>${row.n}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
  
  <div class="section">
    <h2>Sample Groups</h2>
    <table>
      <thead>
        <tr>
          <th>Group</th>
          <th>Sample Count</th>
        </tr>
      </thead>
      <tbody>
        ${selectedGroups.map(group => {
          const count = dataset.samples.filter(s => s.group === group).length;
          return `
            <tr>
              <td>${group}</td>
              <td>${count}</td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  </div>
</body>
</html>
    `.trim();

    const blob = new Blob([htmlContent], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.download = `${dataset.name}-summary-${Date.now()}.html`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("HTML report exported successfully");
  };

  const exportAsPdf = async () => {
    const summaryData = generateSummaryData(dataset);
    
    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();
    let y = 20;
    
    // Title
    pdf.setFontSize(20);
    pdf.setTextColor(56, 189, 248);
    pdf.text("Gene Expression Summary Report", 14, y);
    y += 10;
    
    // Metadata
    pdf.setFontSize(10);
    pdf.setTextColor(148, 163, 184);
    pdf.text(`Dataset: ${dataset.name} | Generated: ${new Date().toLocaleString()}`, 14, y);
    y += 15;
    
    // Overview section
    pdf.setFontSize(14);
    pdf.setTextColor(0, 0, 0);
    pdf.text("Overview", 14, y);
    y += 8;
    
    pdf.setFontSize(10);
    pdf.text(`Total Samples: ${dataset.samples.length}`, 14, y);
    y += 6;
    pdf.text(`Total Genes: ${dataset.genes.length}`, 14, y);
    y += 6;
    pdf.text(`Selected Genes: ${selectedGenes.length}`, 14, y);
    y += 6;
    pdf.text(`Selected Groups: ${selectedGroups.length}`, 14, y);
    y += 12;
    
    // Selected genes
    pdf.setFontSize(14);
    pdf.text("Selected Genes", 14, y);
    y += 8;
    
    pdf.setFontSize(10);
    const genesText = selectedGenes.join(", ");
    const splitGenes = pdf.splitTextToSize(genesText, pageWidth - 28);
    pdf.text(splitGenes, 14, y);
    y += splitGenes.length * 5 + 10;
    
    // Statistics table header
    pdf.setFontSize(14);
    pdf.text("Expression Statistics", 14, y);
    y += 10;
    
    // Table
    pdf.setFontSize(9);
    const headers = ["Gene", "Group", "Mean", "Std Dev", "N"];
    const colWidths = [35, 40, 35, 35, 25];
    let x = 14;
    
    // Header row
    pdf.setFillColor(56, 189, 248);
    pdf.setTextColor(255, 255, 255);
    pdf.rect(14, y - 4, pageWidth - 28, 8, "F");
    headers.forEach((header, i) => {
      pdf.text(header, x, y);
      x += colWidths[i];
    });
    y += 8;
    
    // Data rows
    pdf.setTextColor(0, 0, 0);
    summaryData.forEach((row, index) => {
      if (y > 270) {
        pdf.addPage();
        y = 20;
      }
      
      if (index % 2 === 0) {
        pdf.setFillColor(240, 240, 240);
        pdf.rect(14, y - 4, pageWidth - 28, 6, "F");
      }
      
      x = 14;
      pdf.text(row.gene, x, y);
      x += colWidths[0];
      pdf.text(row.group, x, y);
      x += colWidths[1];
      pdf.text(row.mean.toFixed(3), x, y);
      x += colWidths[2];
      pdf.text(row.std.toFixed(3), x, y);
      x += colWidths[3];
      pdf.text(row.n.toString(), x, y);
      y += 6;
    });
    
    pdf.save(`${dataset.name}-summary-${Date.now()}.pdf`);
    toast.success("PDF report exported successfully");
  };

  // Comparison report generators
  const generateComparisonHtml = () => {
    const allDatasetStats = datasets.map(ds => ({
      name: ds.name,
      samples: ds.samples.length,
      genes: ds.genes.length,
      groups: ds.groups.length,
      summaryData: generateSummaryData(ds),
    }));

    // Cross-dataset comparison table
    const geneComparisonData = selectedGenes.map(gene => {
      const datasetMeans: { dataset: string; mean: number; std: number }[] = [];
      datasets.forEach(ds => {
        const expr = ds.expressions.find(e => e.gene === gene);
        if (expr) {
          const availableGroups = selectedGroups.filter(g => ds.groups.includes(g));
          const values = expr.samples
            .filter(s => availableGroups.includes(s.group))
            .map(s => s.value);
          if (values.length > 0) {
            datasetMeans.push({
              dataset: ds.name,
              mean: calculateMean(values),
              std: calculateStdDev(values),
            });
          }
        }
      });
      return { gene, datasetMeans };
    });

    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Comparison Report - ${datasets.length} Datasets</title>
  <style>
    :root {
      --bg: #0f172a;
      --card-bg: #1e293b;
      --text: #f1f5f9;
      --muted: #94a3b8;
      --border: #334155;
      --primary: #38bdf8;
      --success: #22c55e;
      --warning: #f59e0b;
      --purple: #a855f7;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: var(--bg);
      color: var(--text);
      padding: 2rem;
      line-height: 1.6;
    }
    h1 { color: var(--primary); margin-bottom: 0.5rem; }
    h2 { margin-bottom: 1rem; font-size: 1.25rem; color: var(--primary); }
    h3 { margin-bottom: 0.75rem; font-size: 1.1rem; }
    .meta { color: var(--muted); margin-bottom: 2rem; }
    .section { 
      background: var(--card-bg); 
      border-radius: 8px; 
      padding: 1.5rem; 
      margin-bottom: 1.5rem;
      border: 1px solid var(--border);
    }
    .dataset-section {
      border-left: 3px solid var(--primary);
      margin-bottom: 1rem;
      padding-left: 1rem;
    }
    .dataset-section:nth-child(2) { border-color: var(--success); }
    .dataset-section:nth-child(3) { border-color: var(--warning); }
    .dataset-section:nth-child(4) { border-color: var(--purple); }
    table { 
      width: 100%; 
      border-collapse: collapse; 
      font-size: 0.875rem;
      margin-top: 1rem;
    }
    th, td { 
      padding: 0.75rem; 
      text-align: left; 
      border-bottom: 1px solid var(--border);
    }
    th { 
      background: rgba(56, 189, 248, 0.1); 
      color: var(--primary);
      font-weight: 600;
    }
    tr:hover { background: rgba(255,255,255,0.02); }
    .gene-tag {
      background: rgba(56, 189, 248, 0.2);
      color: var(--primary);
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-family: monospace;
      font-weight: 600;
    }
    .dataset-tag {
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 600;
    }
    .dataset-tag-0 { background: rgba(56, 189, 248, 0.2); color: var(--primary); }
    .dataset-tag-1 { background: rgba(34, 197, 94, 0.2); color: var(--success); }
    .dataset-tag-2 { background: rgba(245, 158, 11, 0.2); color: var(--warning); }
    .dataset-tag-3 { background: rgba(168, 85, 247, 0.2); color: var(--purple); }
    .stats-grid { 
      display: grid; 
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); 
      gap: 1rem; 
    }
    .stat-card { 
      background: rgba(56, 189, 248, 0.05); 
      padding: 1rem; 
      border-radius: 6px;
      text-align: center;
    }
    .stat-value { font-size: 1.5rem; font-weight: 700; color: var(--primary); }
    .stat-label { color: var(--muted); font-size: 0.75rem; text-transform: uppercase; }
    .comparison-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 1rem;
    }
  </style>
</head>
<body>
  <h1>Multi-Dataset Comparison Report</h1>
  <p class="meta">${datasets.length} datasets compared | Generated: ${new Date().toLocaleString()}</p>
  
  <div class="section">
    <h2>Datasets Overview</h2>
    <div class="stats-grid">
      ${allDatasetStats.map((ds, i) => `
        <div class="stat-card" style="border-left: 3px solid ${['#38bdf8', '#22c55e', '#f59e0b', '#a855f7'][i]}">
          <div class="stat-label">${ds.name}</div>
          <div class="stat-value">${ds.samples}</div>
          <div class="stat-label">samples</div>
          <div style="margin-top: 0.5rem; font-size: 0.875rem; color: var(--muted);">
            ${ds.genes} genes • ${ds.groups} groups
          </div>
        </div>
      `).join('')}
    </div>
  </div>
  
  <div class="section">
    <h2>Cross-Dataset Gene Comparison</h2>
    <p style="color: var(--muted); margin-bottom: 1rem;">Mean expression (± std) for each gene across all datasets</p>
    <table>
      <thead>
        <tr>
          <th>Gene</th>
          ${datasets.map((ds, i) => `<th><span class="dataset-tag dataset-tag-${i}">${ds.name}</span></th>`).join('')}
        </tr>
      </thead>
      <tbody>
        ${geneComparisonData.map(item => `
          <tr>
            <td><span class="gene-tag">${item.gene}</span></td>
            ${datasets.map(ds => {
              const match = item.datasetMeans.find(d => d.dataset === ds.name);
              return match 
                ? `<td>${match.mean.toFixed(2)} ± ${match.std.toFixed(2)}</td>`
                : `<td style="color: var(--muted)">—</td>`;
            }).join('')}
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
  
  ${allDatasetStats.map((ds, i) => `
    <div class="section">
      <div class="dataset-section" style="border-color: ${['#38bdf8', '#22c55e', '#f59e0b', '#a855f7'][i]}">
        <h3>${ds.name}</h3>
        <table>
          <thead>
            <tr>
              <th>Gene</th>
              <th>Group</th>
              <th>Mean</th>
              <th>Std Dev</th>
              <th>N</th>
            </tr>
          </thead>
          <tbody>
            ${ds.summaryData.map(row => `
              <tr>
                <td><span class="gene-tag">${row.gene}</span></td>
                <td>${row.group}</td>
                <td>${row.mean.toFixed(3)}</td>
                <td>${row.std.toFixed(3)}</td>
                <td>${row.n}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `).join('')}
</body>
</html>
    `.trim();

    const blob = new Blob([htmlContent], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.download = `comparison-report-${datasets.length}-datasets-${Date.now()}.html`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Comparison HTML report exported successfully");
  };

  const generateComparisonPdf = async () => {
    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();
    let y = 20;

    const datasetColors = [
      [56, 189, 248],  // primary blue
      [34, 197, 94],   // green
      [245, 158, 11],  // amber
      [168, 85, 247],  // purple
    ];

    // Title
    pdf.setFontSize(20);
    pdf.setTextColor(56, 189, 248);
    pdf.text("Multi-Dataset Comparison Report", 14, y);
    y += 10;

    // Metadata
    pdf.setFontSize(10);
    pdf.setTextColor(148, 163, 184);
    pdf.text(`${datasets.length} datasets compared | Generated: ${new Date().toLocaleString()}`, 14, y);
    y += 15;

    // Datasets Overview
    pdf.setFontSize(14);
    pdf.setTextColor(0, 0, 0);
    pdf.text("Datasets Overview", 14, y);
    y += 10;

    datasets.forEach((ds, i) => {
      const [r, g, b] = datasetColors[i];
      pdf.setFillColor(r, g, b);
      pdf.rect(14, y - 4, 3, 6, "F");
      pdf.setFontSize(10);
      pdf.setTextColor(0, 0, 0);
      pdf.text(`${ds.name}: ${ds.samples.length} samples, ${ds.genes.length} genes, ${ds.groups.length} groups`, 20, y);
      y += 7;
    });
    y += 8;

    // Cross-dataset comparison
    pdf.setFontSize(14);
    pdf.text("Cross-Dataset Gene Comparison", 14, y);
    y += 10;

    // Table header
    pdf.setFontSize(8);
    const colWidth = (pageWidth - 28) / (datasets.length + 1);
    let x = 14;

    pdf.setFillColor(56, 189, 248);
    pdf.setTextColor(255, 255, 255);
    pdf.rect(14, y - 4, pageWidth - 28, 8, "F");
    pdf.text("Gene", x, y);
    x += colWidth;
    datasets.forEach((ds) => {
      const truncatedName = ds.name.length > 15 ? ds.name.substring(0, 12) + "..." : ds.name;
      pdf.text(truncatedName, x, y);
      x += colWidth;
    });
    y += 8;

    // Gene comparison rows
    pdf.setTextColor(0, 0, 0);
    selectedGenes.forEach((gene, geneIndex) => {
      if (y > 270) {
        pdf.addPage();
        y = 20;
      }

      if (geneIndex % 2 === 0) {
        pdf.setFillColor(240, 240, 240);
        pdf.rect(14, y - 4, pageWidth - 28, 6, "F");
      }

      x = 14;
      pdf.text(gene, x, y);
      x += colWidth;

      datasets.forEach(ds => {
        const expr = ds.expressions.find(e => e.gene === gene);
        if (expr) {
          const availableGroups = selectedGroups.filter(g => ds.groups.includes(g));
          const values = expr.samples
            .filter(s => availableGroups.includes(s.group))
            .map(s => s.value);
          if (values.length > 0) {
            const mean = calculateMean(values);
            const std = calculateStdDev(values);
            pdf.text(`${mean.toFixed(2)} ± ${std.toFixed(2)}`, x, y);
          } else {
            pdf.text("—", x, y);
          }
        } else {
          pdf.text("—", x, y);
        }
        x += colWidth;
      });
      y += 6;
    });
    y += 10;

    // Individual dataset sections
    datasets.forEach((ds, dsIndex) => {
      if (y > 220) {
        pdf.addPage();
        y = 20;
      }

      const [r, g, b] = datasetColors[dsIndex];
      pdf.setFillColor(r, g, b);
      pdf.rect(14, y - 4, 3, 10, "F");
      
      pdf.setFontSize(12);
      pdf.setTextColor(0, 0, 0);
      pdf.text(ds.name, 20, y);
      y += 10;

      const summaryData = generateSummaryData(ds);

      // Table header
      pdf.setFontSize(8);
      const headers = ["Gene", "Group", "Mean", "Std Dev", "N"];
      const colWidths = [30, 35, 30, 30, 20];
      x = 14;

      pdf.setFillColor(r, g, b);
      pdf.setTextColor(255, 255, 255);
      pdf.rect(14, y - 4, pageWidth - 28, 7, "F");
      headers.forEach((header, i) => {
        pdf.text(header, x, y);
        x += colWidths[i];
      });
      y += 7;

      // Data rows
      pdf.setTextColor(0, 0, 0);
      summaryData.slice(0, 15).forEach((row, index) => {
        if (y > 270) {
          pdf.addPage();
          y = 20;
        }

        if (index % 2 === 0) {
          pdf.setFillColor(245, 245, 245);
          pdf.rect(14, y - 4, pageWidth - 28, 5, "F");
        }

        x = 14;
        pdf.text(row.gene, x, y);
        x += colWidths[0];
        pdf.text(row.group, x, y);
        x += colWidths[1];
        pdf.text(row.mean.toFixed(3), x, y);
        x += colWidths[2];
        pdf.text(row.std.toFixed(3), x, y);
        x += colWidths[3];
        pdf.text(row.n.toString(), x, y);
        y += 5;
      });

      if (summaryData.length > 15) {
        pdf.setTextColor(148, 163, 184);
        pdf.text(`... and ${summaryData.length - 15} more rows`, 14, y);
        y += 5;
      }

      y += 10;
    });

    pdf.save(`comparison-report-${datasets.length}-datasets-${Date.now()}.pdf`);
    toast.success("Comparison PDF report exported successfully");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Download className="h-4 w-4" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Export Visualization</DropdownMenuLabel>
        <DropdownMenuItem onClick={exportAsPng} className="gap-2 cursor-pointer">
          <Image className="h-4 w-4" />
          Export as PNG
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportAsSvg} className="gap-2 cursor-pointer">
          <Image className="h-4 w-4" />
          Export as SVG
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuLabel>Single Dataset Report</DropdownMenuLabel>
        <DropdownMenuItem onClick={exportAsHtml} className="gap-2 cursor-pointer">
          <FileCode className="h-4 w-4" />
          HTML Summary
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportAsPdf} className="gap-2 cursor-pointer">
          <FileText className="h-4 w-4" />
          PDF Summary
        </DropdownMenuItem>

        {isComparisonMode && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="flex items-center gap-2">
              <Layers className="h-3 w-3" />
              Comparison Report ({datasets.length} datasets)
            </DropdownMenuLabel>
            <DropdownMenuItem onClick={generateComparisonHtml} className="gap-2 cursor-pointer">
              <FileCode className="h-4 w-4" />
              Comparison HTML
            </DropdownMenuItem>
            <DropdownMenuItem onClick={generateComparisonPdf} className="gap-2 cursor-pointer">
              <FileText className="h-4 w-4" />
              Comparison PDF
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
