import { ExpressionDataset } from "@/types/expression";
import { ExpressionBoxPlot } from "@/components/charts/ExpressionBoxPlot";
import { ExpressionHeatmap } from "@/components/charts/ExpressionHeatmap";
import { ExpressionHistogram } from "@/components/charts/ExpressionHistogram";
import { ExpressionViolinPlot } from "@/components/charts/ExpressionViolinPlot";
import { SampleBoxPlot } from "@/components/charts/SampleBoxPlot";
import { GeneCorrelationPlot } from "@/components/charts/GeneCorrelationPlot";
import { CorrelationMatrix } from "@/components/charts/CorrelationMatrix";
import { DifferentialExpression } from "@/components/charts/DifferentialExpression";
import { VolcanoPlot } from "@/components/charts/VolcanoPlot";
import { GeneBoxPlot } from "@/components/charts/GeneBoxPlot";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Database } from "lucide-react";

interface ComparisonPanelProps {
  dataset: ExpressionDataset;
  selectedGenes: string[];
  selectedGroups: string[];
  activeTab: string;
  panelIndex: number;
}

export function ComparisonPanel({
  dataset,
  selectedGenes,
  selectedGroups,
  activeTab,
  panelIndex,
}: ComparisonPanelProps) {
  // Filter genes that exist in this dataset
  const availableGenes = selectedGenes.filter(gene => dataset.genes.includes(gene));
  
  // Filter groups that exist in this dataset  
  const availableGroups = selectedGroups.filter(group => dataset.groups.includes(group));
  
  const selectedExpressions = dataset.expressions.filter(e => 
    availableGenes.includes(e.gene)
  );

  if (availableGenes.length === 0) {
    return (
      <Card className="glass-panel h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Database className="h-4 w-4" />
            {dataset.name}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[200px] text-muted-foreground">
          No matching genes in this dataset
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 px-1">
        <Database className="h-4 w-4 text-primary" />
        <h3 className="font-semibold text-foreground">{dataset.name}</h3>
        <span className="text-xs text-muted-foreground">
          ({availableGenes.length} genes • {availableGroups.length} groups)
        </span>
      </div>

      <div id={`chart-container-${panelIndex}`}>
        {activeTab === "boxplot" && (
          <div className="grid gap-4 grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
            {selectedExpressions.map(expr => (
              <ExpressionBoxPlot
                key={expr.gene}
                geneExpression={expr}
                groups={dataset.groups}
                selectedGroups={availableGroups}
              />
            ))}
          </div>
        )}
        
        {activeTab === "heatmap" && (
          <ExpressionHeatmap
            expressions={dataset.expressions}
            samples={dataset.samples}
            selectedGenes={availableGenes}
            selectedGroups={availableGroups}
            groups={dataset.groups}
          />
        )}
        
        {activeTab === "histogram" && (
          <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
            {selectedExpressions.map(expr => (
              <ExpressionHistogram
                key={expr.gene}
                geneExpression={expr}
                groups={dataset.groups}
                selectedGroups={availableGroups}
              />
            ))}
          </div>
        )}
        
        {activeTab === "strip" && (
          <div className="grid gap-4 grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
            {selectedExpressions.map(expr => (
              <ExpressionViolinPlot
                key={expr.gene}
                geneExpression={expr}
                groups={dataset.groups}
                selectedGroups={availableGroups}
              />
            ))}
          </div>
        )}
        
        {activeTab === "sample" && (
          <SampleBoxPlot
            expressions={dataset.expressions}
            selectedGenes={availableGenes}
            selectedGroups={availableGroups}
            groups={dataset.groups}
          />
        )}

        {activeTab === "correlation" && (
          <div className="space-y-4">
            <CorrelationMatrix
              expressions={dataset.expressions}
              selectedGenes={availableGenes}
              selectedGroups={availableGroups}
            />
            <GeneCorrelationPlot
              expressions={dataset.expressions}
              selectedGenes={availableGenes}
              selectedGroups={availableGroups}
              groups={dataset.groups}
            />
          </div>
        )}

        {activeTab === "diffexp" && (
          <DifferentialExpression
            expressions={dataset.expressions}
            selectedGenes={availableGenes}
            selectedGroups={availableGroups}
            groups={dataset.groups}
          />
        )}

        {activeTab === "volcano" && (
          <VolcanoPlot
            expressions={dataset.expressions}
            selectedGenes={availableGenes}
            selectedGroups={availableGroups}
            groups={dataset.groups}
          />
        )}
      </div>
    </div>
  );
}
