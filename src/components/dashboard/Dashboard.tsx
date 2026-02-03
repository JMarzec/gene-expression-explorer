import { useState } from "react";
import { ExpressionDataset } from "@/types/expression";
import { demoDataset } from "@/data/demoData";
import { DashboardSidebar } from "./DashboardSidebar";
import { ExportMenu } from "./ExportMenu";
import { ExpressionBoxPlot } from "@/components/charts/ExpressionBoxPlot";
import { SampleBoxPlot } from "@/components/charts/SampleBoxPlot";
import { ExpressionHeatmap } from "@/components/charts/ExpressionHeatmap";
import { ExpressionHistogram } from "@/components/charts/ExpressionHistogram";
import { ExpressionViolinPlot } from "@/components/charts/ExpressionViolinPlot";
import { SummaryStats } from "@/components/charts/SummaryStats";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, Grid3X3, Activity, CircleDot, Users } from "lucide-react";

export function Dashboard() {
  const [dataset, setDataset] = useState<ExpressionDataset>(demoDataset);
  const [selectedGenes, setSelectedGenes] = useState<string[]>(["TP53", "EGFR", "MYC"]);
  const [selectedGroups, setSelectedGroups] = useState<string[]>(dataset.groups);
  const [activeTab, setActiveTab] = useState("boxplot");

  const handleDataLoad = (data: ExpressionDataset) => {
    setDataset(data);
    setSelectedGenes(data.genes.slice(0, 3));
    setSelectedGroups(data.groups);
  };

  const selectedExpressions = dataset.expressions.filter(e => 
    selectedGenes.includes(e.gene)
  );

  return (
    <div className="flex h-screen bg-background">
      <DashboardSidebar
        dataset={dataset}
        selectedGenes={selectedGenes}
        onGenesChange={setSelectedGenes}
        selectedGroups={selectedGroups}
        onGroupsChange={setSelectedGroups}
        onDataLoad={handleDataLoad}
      />
      
      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <header className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-foreground">{dataset.name}</h2>
              {dataset.description && (
                <p className="text-muted-foreground mt-1">{dataset.description}</p>
              )}
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                {selectedGenes.slice(0, 5).map(gene => (
                  <span key={gene} className="gene-tag">{gene}</span>
                ))}
                {selectedGenes.length > 5 && (
                  <span className="text-muted-foreground text-sm">+{selectedGenes.length - 5} more</span>
                )}
              </div>
              <ExportMenu
                chartContainerId="chart-container"
                dataset={dataset}
                selectedGenes={selectedGenes}
                selectedGroups={selectedGroups}
              />
            </div>
          </header>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="bg-muted">
              <TabsTrigger value="boxplot" className="gap-2">
                <BarChart3 className="h-4 w-4" />
                Box Plot
              </TabsTrigger>
              <TabsTrigger value="heatmap" className="gap-2">
                <Grid3X3 className="h-4 w-4" />
                Heatmap
              </TabsTrigger>
              <TabsTrigger value="histogram" className="gap-2">
                <Activity className="h-4 w-4" />
                Histogram
              </TabsTrigger>
              <TabsTrigger value="strip" className="gap-2">
                <CircleDot className="h-4 w-4" />
                Strip Plot
              </TabsTrigger>
              <TabsTrigger value="sample" className="gap-2">
                <Users className="h-4 w-4" />
                Per-Sample
              </TabsTrigger>
            </TabsList>
            
            <div id="chart-container">
              <TabsContent value="boxplot" className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {selectedExpressions.map(expr => (
                    <ExpressionBoxPlot
                      key={expr.gene}
                      geneExpression={expr}
                      groups={dataset.groups}
                      selectedGroups={selectedGroups}
                    />
                  ))}
                </div>
              </TabsContent>
              
              <TabsContent value="heatmap">
                <ExpressionHeatmap
                  expressions={dataset.expressions}
                  samples={dataset.samples}
                  selectedGenes={selectedGenes}
                  selectedGroups={selectedGroups}
                  groups={dataset.groups}
                />
              </TabsContent>
              
              <TabsContent value="histogram" className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  {selectedExpressions.map(expr => (
                    <ExpressionHistogram
                      key={expr.gene}
                      geneExpression={expr}
                      groups={dataset.groups}
                      selectedGroups={selectedGroups}
                    />
                  ))}
                </div>
              </TabsContent>
              
              <TabsContent value="strip" className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {selectedExpressions.map(expr => (
                    <ExpressionViolinPlot
                      key={expr.gene}
                      geneExpression={expr}
                      groups={dataset.groups}
                      selectedGroups={selectedGroups}
                    />
                  ))}
                </div>
              </TabsContent>
              
              <TabsContent value="sample">
                <SampleBoxPlot
                  expressions={dataset.expressions}
                  selectedGenes={selectedGenes}
                  selectedGroups={selectedGroups}
                  groups={dataset.groups}
                />
              </TabsContent>
            </div>
          </Tabs>
          
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-3">
              <h3 className="text-lg font-semibold mb-3">Summary Statistics</h3>
              <SummaryStats
                expressions={dataset.expressions}
                selectedGenes={selectedGenes}
                selectedGroups={selectedGroups}
                groups={dataset.groups}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
