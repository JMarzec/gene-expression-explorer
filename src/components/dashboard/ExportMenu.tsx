import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, Image, FileText, FileCode } from "lucide-react";
import { toPng, toSvg } from "html-to-image";
import { jsPDF } from "jspdf";
import { ExpressionDataset, GeneExpression } from "@/types/expression";
import { calculateMean, calculateStdDev } from "@/utils/statistics";
import { toast } from "sonner";

interface ExportMenuProps {
  chartContainerId: string;
  dataset: ExpressionDataset;
  selectedGenes: string[];
  selectedGroups: string[];
}

export function ExportMenu({
  chartContainerId,
  dataset,
  selectedGenes,
  selectedGroups,
}: ExportMenuProps) {
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

  const generateSummaryData = () => {
    const selectedExpressions = dataset.expressions.filter(e => 
      selectedGenes.includes(e.gene)
    );

    const summaryRows: { gene: string; group: string; mean: number; std: number; n: number }[] = [];

    selectedExpressions.forEach(expr => {
      selectedGroups.forEach(group => {
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

  const exportAsHtml = () => {
    const summaryData = generateSummaryData();
    
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
    const summaryData = generateSummaryData();
    
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

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Download className="h-4 w-4" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
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
        
        <DropdownMenuLabel>Export Report</DropdownMenuLabel>
        <DropdownMenuItem onClick={exportAsHtml} className="gap-2 cursor-pointer">
          <FileCode className="h-4 w-4" />
          HTML Summary
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportAsPdf} className="gap-2 cursor-pointer">
          <FileText className="h-4 w-4" />
          PDF Summary
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
