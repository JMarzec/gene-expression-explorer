import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExpressionDataset } from "@/types/expression";
import { calculateMean, calculateMedian, calculateStdDev, calculateMin, calculateMax } from "@/utils/statistics";
import { useMemo } from "react";
import { Database, TrendingUp, TrendingDown, BarChart3 } from "lucide-react";

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
        
        {/* Per-Gene Comparison Table */}
        {selectedGenes.length > 0 && summaries.length > 1 && (
          <div>
            <h4 className="font-medium text-sm mb-3">Per-Gene Mean Expression Across Datasets</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-3 font-semibold text-muted-foreground">Gene</th>
                    {summaries.map((summary, idx) => (
                      <th key={idx} className="text-right py-2 px-3 font-semibold text-muted-foreground truncate max-w-[120px]" title={summary.name}>
                        {summary.name.length > 12 ? `${summary.name.slice(0, 12)}...` : summary.name}
                      </th>
                    ))}
                    <th className="text-right py-2 px-3 font-semibold text-muted-foreground">Δ Max</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedGenes.slice(0, 10).map(gene => {
                    const means = summaries.map(s => {
                      const stat = s.geneStats.find(gs => gs.gene === gene);
                      return stat ? stat.mean : null;
                    });
                    
                    const validMeans = means.filter((m): m is number => m !== null);
                    const maxDiff = validMeans.length > 1 
                      ? Math.max(...validMeans) - Math.min(...validMeans) 
                      : 0;
                    
                    return (
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
                    );
                  })}
                </tbody>
              </table>
              {selectedGenes.length > 10 && (
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
