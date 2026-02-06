import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExpressionDataset } from "@/types/expression";
import { calculateMean, calculateMedian, calculateStdDev, calculateMin, calculateMax } from "@/utils/statistics";
import { useMemo, useState } from "react";
import { Database, TrendingUp, TrendingDown, BarChart3, ArrowUpDown, ArrowUp, ArrowDown, Download } from "lucide-react";
import { Switch } from "@/components/ui/switch";

type SortColumn = "gene" | "delta" | number;
type SortDirection = "asc" | "desc";

interface ComparisonSummaryStatsProps {
  datasets: ExpressionDataset[];
  selectedGenes: string[];
  selectedGroups: string[];
}

interface DatasetSummary {
  name: string;
  totalGenes: number;
  totalSamples: number;
  selectedGenes: number;
  selectedSamples: number;
  groupCounts: Record<string, number>;
  geneStats: {
    gene: string;
    mean: number;
    median: number;
    stdDev: number;
    min: number;
    max: number;
  }[];
  overallMean: number;
  overallStdDev: number;
}

export function ComparisonSummaryStats({
  datasets,
  selectedGenes,
  selectedGroups,
}: ComparisonSummaryStatsProps) {
  const summaries = useMemo(() => {
    return datasets.map(dataset => {
      const availableGenes = selectedGenes.filter(g => dataset.genes.includes(g));
      const availableGroups = selectedGroups.filter(g => dataset.groups.includes(g));
      
      const filteredExpressions = dataset.expressions.filter(e => 
        availableGenes.includes(e.gene)
      );
      
      const groupCounts: Record<string, number> = {};
      availableGroups.forEach(group => {
        groupCounts[group] = dataset.samples.filter(s => s.group === group).length;
      });
      
      const allValues: number[] = [];
      const geneStats = filteredExpressions.map(expr => {
        const values = expr.samples
          .filter(s => availableGroups.includes(s.group))
          .map(s => s.value);
        
        allValues.push(...values);
        
        return {
          gene: expr.gene,
          mean: values.length > 0 ? calculateMean(values) : 0,
          median: values.length > 0 ? calculateMedian(values) : 0,
          stdDev: values.length > 0 ? calculateStdDev(values) : 0,
          min: values.length > 0 ? calculateMin(values) : 0,
          max: values.length > 0 ? calculateMax(values) : 0,
        };
      });
      
      return {
        name: dataset.name,
        totalGenes: dataset.genes.length,
        totalSamples: dataset.samples.length,
        selectedGenes: availableGenes.length,
        selectedSamples: Object.values(groupCounts).reduce((a, b) => a + b, 0),
        groupCounts,
        geneStats,
        overallMean: allValues.length > 0 ? calculateMean(allValues) : 0,
        overallStdDev: allValues.length > 0 ? calculateStdDev(allValues) : 0,
      } as DatasetSummary;
    });
  }, [datasets, selectedGenes, selectedGroups]);

  // Find the highest and lowest expressed genes across datasets
  const topGenes = useMemo(() => {
    const geneAverages: Record<string, { sum: number; count: number }> = {};
    
    summaries.forEach(summary => {
      summary.geneStats.forEach(stat => {
        if (!geneAverages[stat.gene]) {
          geneAverages[stat.gene] = { sum: 0, count: 0 };
        }
        geneAverages[stat.gene].sum += stat.mean;
        geneAverages[stat.gene].count += 1;
      });
    });
    
    const avgList = Object.entries(geneAverages).map(([gene, { sum, count }]) => ({
      gene,
      avgMean: sum / count,
    }));
    
    avgList.sort((a, b) => b.avgMean - a.avgMean);
    
    return {
      highest: avgList.slice(0, 3),
      lowest: avgList.slice(-3).reverse(),
    };
  }, [summaries]);

  const [sortColumn, setSortColumn] = useState<SortColumn>("gene");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [showAllGenes, setShowAllGenes] = useState(false);

  // Build sorted gene data for the comparison table
  const sortedGeneData = useMemo(() => {
    const geneData = selectedGenes.map(gene => {
      const means = summaries.map(s => {
        const stat = s.geneStats.find(gs => gs.gene === gene);
        return stat ? stat.mean : null;
      });
      const stdDevs = summaries.map(s => {
        const stat = s.geneStats.find(gs => gs.gene === gene);
        return stat ? stat.stdDev : null;
      });
      const validMeans = means.filter((m): m is number => m !== null);
      const maxDiff = validMeans.length > 1 
        ? Math.max(...validMeans) - Math.min(...validMeans) 
        : 0;
      return { gene, means, stdDevs, maxDiff };
    });

    return [...geneData].sort((a, b) => {
      let aVal: number | string;
      let bVal: number | string;

      if (sortColumn === "gene") {
        aVal = a.gene;
        bVal = b.gene;
      } else if (sortColumn === "delta") {
        aVal = a.maxDiff;
        bVal = b.maxDiff;
      } else {
        aVal = a.means[sortColumn] ?? -Infinity;
        bVal = b.means[sortColumn] ?? -Infinity;
      }

      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortDirection === "asc" 
          ? aVal.localeCompare(bVal) 
          : bVal.localeCompare(aVal);
      }
      return sortDirection === "asc" 
        ? (aVal as number) - (bVal as number) 
        : (bVal as number) - (aVal as number);
    });
  }, [selectedGenes, summaries, sortColumn, sortDirection]);

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection(column === "gene" ? "asc" : "desc");
    }
  };

  const getSortIcon = (column: SortColumn) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="h-3 w-3 ml-1 opacity-50" />;
    }
    return sortDirection === "asc" 
      ? <ArrowUp className="h-3 w-3 ml-1" />
      : <ArrowDown className="h-3 w-3 ml-1" />;
  };

  const exportCsv = () => {
    const headers = ["Gene", ...summaries.map(s => `${s.name} (Mean)`), ...summaries.map(s => `${s.name} (StdDev)`), "Delta Max"];
    const rows = sortedGeneData.map(({ gene, means, stdDevs, maxDiff }) => [
      gene,
      ...means.map(m => m !== null ? m.toFixed(4) : ""),
      ...stdDevs.map(s => s !== null ? s.toFixed(4) : ""),
      maxDiff.toFixed(4)
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `gene_comparison_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (datasets.length === 0) {
    return null;
  }

  return (
    <Card className="glass-panel animate-fade-in">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          Comparison Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Dataset Overview Grid */}
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-4">
          {summaries.map((summary, idx) => (
            <div
              key={`${summary.name}-${idx}`}
              className="bg-muted/30 rounded-lg p-4 space-y-3"
            >
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-primary" />
                <h4 className="font-medium text-sm truncate" title={summary.name}>
                  {summary.name}
                </h4>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-muted-foreground">Genes</p>
                  <p className="font-mono font-semibold">{summary.selectedGenes}/{summary.totalGenes}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Samples</p>
                  <p className="font-mono font-semibold">{summary.selectedSamples}/{summary.totalSamples}</p>
                </div>
              </div>
              
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Groups</p>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(summary.groupCounts).map(([group, count]) => (
                    <span key={group} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                      {group}: {count}
                    </span>
                  ))}
                </div>
              </div>
              
              <div className="pt-2 border-t border-border/50">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-muted-foreground">Mean Expr.</p>
                    <p className="font-mono font-semibold">{summary.overallMean.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Std Dev</p>
                    <p className="font-mono font-semibold">{summary.overallStdDev.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Cross-Dataset Gene Rankings */}
        {selectedGenes.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="bg-primary/10 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="h-4 w-4 text-primary" />
                <h4 className="font-medium text-sm">Highest Expressed (Avg.)</h4>
              </div>
              <div className="space-y-2">
                {topGenes.highest.map((item, idx) => (
                  <div key={item.gene} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <span className="text-muted-foreground">{idx + 1}.</span>
                      <span className="gene-tag text-xs">{item.gene}</span>
                    </span>
                    <span className="font-mono text-primary">{item.avgMean.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="bg-destructive/10 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <TrendingDown className="h-4 w-4 text-destructive" />
                <h4 className="font-medium text-sm">Lowest Expressed (Avg.)</h4>
              </div>
              <div className="space-y-2">
                {topGenes.lowest.map((item, idx) => (
                  <div key={item.gene} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <span className="text-muted-foreground">{idx + 1}.</span>
                      <span className="gene-tag text-xs">{item.gene}</span>
                    </span>
                    <span className="font-mono text-destructive">{item.avgMean.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        
        {/* Per-Dataset Gene Rankings */}
        {selectedGenes.length > 0 && summaries.length > 1 && (
          <div>
            <h4 className="font-medium text-sm mb-3">Top Genes by Dataset</h4>
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-4">
              {summaries.map((summary, idx) => {
                const sortedByMean = [...summary.geneStats].sort((a, b) => b.mean - a.mean);
                const topThree = sortedByMean.slice(0, 3);
                const bottomThree = sortedByMean.slice(-3).reverse();
                
                return (
                  <div key={`${summary.name}-genes-${idx}`} className="bg-muted/30 rounded-lg p-4">
                    <h5 className="font-medium text-xs truncate mb-3" title={summary.name}>
                      {summary.name}
                    </h5>
                    
                    <div className="space-y-3">
                      <div>
                        <div className="flex items-center gap-1 mb-1.5">
                          <TrendingUp className="h-3 w-3 text-primary" />
                          <span className="text-xs text-muted-foreground">Highest</span>
                        </div>
                        <div className="space-y-1">
                          {topThree.map((stat, i) => (
                            <div key={stat.gene} className="flex items-center justify-between text-xs">
                              <span className="flex items-center gap-1">
                                <span className="text-muted-foreground w-3">{i + 1}.</span>
                                <span className="gene-tag text-xs">{stat.gene}</span>
                              </span>
                              <span className="font-mono text-primary">{stat.mean.toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <div>
                        <div className="flex items-center gap-1 mb-1.5">
                          <TrendingDown className="h-3 w-3 text-destructive" />
                          <span className="text-xs text-muted-foreground">Lowest</span>
                        </div>
                        <div className="space-y-1">
                          {bottomThree.map((stat, i) => (
                            <div key={stat.gene} className="flex items-center justify-between text-xs">
                              <span className="flex items-center gap-1">
                                <span className="text-muted-foreground w-3">{i + 1}.</span>
                                <span className="gene-tag text-xs">{stat.gene}</span>
                              </span>
                              <span className="font-mono text-destructive">{stat.mean.toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        
        {/* Per-Gene Comparison Table */}
        {selectedGenes.length > 0 && summaries.length > 1 && (
          <div>
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <h4 className="font-medium text-sm">Per-Gene Mean Expression Across Datasets</h4>
              <div className="flex items-center gap-4">
                {selectedGenes.length > 10 && (
                  <div className="flex items-center gap-2">
                    <Switch
                      id="show-all-genes"
                      checked={showAllGenes}
                      onCheckedChange={setShowAllGenes}
                    />
                    <label htmlFor="show-all-genes" className="text-xs text-muted-foreground cursor-pointer">
                      Show all ({selectedGenes.length})
                    </label>
                  </div>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportCsv}
                  className="h-7 text-xs gap-1"
                >
                  <Download className="h-3 w-3" />
                  Export CSV
                </Button>
              </div>
            </div>
            <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-card">
                  <tr className="border-b border-border">
                    <th 
                      className="text-left py-2 px-3 font-semibold text-muted-foreground cursor-pointer hover:text-foreground transition-colors bg-card"
                      onClick={() => handleSort("gene")}
                    >
                      <span className="flex items-center">
                        Gene
                        {getSortIcon("gene")}
                      </span>
                    </th>
                    {summaries.map((summary, idx) => (
                      <th 
                        key={idx} 
                        className="text-right py-2 px-3 font-semibold text-muted-foreground truncate max-w-[120px] cursor-pointer hover:text-foreground transition-colors bg-card" 
                        title={summary.name}
                        onClick={() => handleSort(idx)}
                      >
                        <span className="flex items-center justify-end">
                          {summary.name.length > 12 ? `${summary.name.slice(0, 12)}...` : summary.name}
                          {getSortIcon(idx)}
                        </span>
                      </th>
                    ))}
                    <th 
                      className="text-right py-2 px-3 font-semibold text-muted-foreground cursor-pointer hover:text-foreground transition-colors bg-card"
                      onClick={() => handleSort("delta")}
                    >
                      <span className="flex items-center justify-end">
                        Δ Max
                        {getSortIcon("delta")}
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(showAllGenes ? sortedGeneData : sortedGeneData.slice(0, 10)).map(({ gene, means, maxDiff }) => (
                    <tr key={gene} className="border-b border-border/50">
                      <td className="py-2 px-3">
                        <span className="gene-tag text-xs">{gene}</span>
                      </td>
                      {means.map((mean, idx) => (
                        <td key={idx} className="py-2 px-3 text-right font-mono">
                          {mean !== null ? mean.toFixed(2) : "—"}
                        </td>
                      ))}
                      <td className={`py-2 px-3 text-right font-mono ${maxDiff > 1 ? "text-primary font-semibold" : ""}`}>
                        {maxDiff.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {selectedGenes.length > 10 && !showAllGenes && (
                <p className="text-xs text-muted-foreground mt-2">
                  Showing top 10 of {selectedGenes.length} selected genes
                </p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
