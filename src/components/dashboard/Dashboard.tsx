import { useState, useMemo, useCallback } from "react";
import { ExpressionDataset } from "@/types/expression";
import { demoDataset } from "@/data/demoData";
import { DashboardSidebar } from "./DashboardSidebar";
import { ExportMenu } from "./ExportMenu";
import { ComparisonPanel } from "./ComparisonPanel";
import { SummaryStats } from "@/components/charts/SummaryStats";
import { ComparisonSummaryStats } from "@/components/charts/ComparisonSummaryStats";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, Grid3X3, Activity, CircleDot, Users, TrendingUp, FlaskConical, Layers, Flame } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function Dashboard() {
  const [datasets, setDatasets] = useState<ExpressionDataset[]>([demoDataset]);
  const [selectedGenes, setSelectedGenes] = useState<string[]>(["TP53", "EGFR", "MYC"]);
  const [selectedGroups, setSelectedGroups] = useState<string[]>(demoDataset.groups);
  const [activeTab, setActiveTab] = useState("boxplot");

  const handleAddDataset = useCallback((data: ExpressionDataset) => {
    setDatasets(prev => {
      // Remove demo dataset if it exists and this is the first user upload
      const isFirstUserUpload = prev.length === 1 && prev[0].name === "Cancer Gene Expression Study";
      const baseDatastes = isFirstUserUpload ? [] : prev;
      return [...baseDatastes, data];
    });
    // Add new groups to selection (or replace if removing demo)
    setSelectedGroups(prev => {
      const isFirstUserUpload = datasets.length === 1 && datasets[0].name === "Cancer Gene Expression Study";
      if (isFirstUserUpload) {
        return data.groups;
      }
      const newGroups = data.groups.filter(g => !prev.includes(g));
      return [...prev, ...newGroups];
    });
  }, [datasets]);

  const handleRemoveDataset = useCallback((index: number) => {
    setDatasets(prev => prev.filter((_, i) => i !== index));
  }, []);

  // Merge genes/groups for export menu (uses first dataset for now)
  const primaryDataset = datasets[0];
  
  const isComparisonMode = datasets.length > 1;

  return (
    <div className="flex h-screen bg-background">
      <DashboardSidebar
        datasets={datasets}
        selectedGenes={selectedGenes}
        onGenesChange={setSelectedGenes}
        selectedGroups={selectedGroups}
        onGroupsChange={setSelectedGroups}
        onAddDataset={handleAddDataset}
        onRemoveDataset={handleRemoveDataset}
      />
      
      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-full mx-auto space-y-6">
          <header className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isComparisonMode ? (
                <div className="flex items-center gap-2">
                  <Layers className="h-5 w-5 text-primary" />
                  <h2 className="text-2xl font-bold text-foreground">Comparison Mode</h2>
                  <Badge variant="secondary">{datasets.length} datasets</Badge>
                </div>
              ) : (
                <div>
                  <h2 className="text-2xl font-bold text-foreground">{primaryDataset.name}</h2>
                  {primaryDataset.description && (
                    <p className="text-muted-foreground mt-1">{primaryDataset.description}</p>
                  )}
                </div>
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
                chartContainerId="chart-container-0"
                dataset={primaryDataset}
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
              <TabsTrigger value="correlation" className="gap-2">
                <TrendingUp className="h-4 w-4" />
                Correlation
              </TabsTrigger>
              <TabsTrigger value="diffexp" className="gap-2">
                <FlaskConical className="h-4 w-4" />
                Diff. Expr.
              </TabsTrigger>
              <TabsTrigger value="volcano" className="gap-2">
                <Flame className="h-4 w-4" />
                Volcano
              </TabsTrigger>
            </TabsList>
            
            {/* Comparison panels or single view */}
            <div className={`grid gap-6 ${isComparisonMode ? 'grid-cols-1 xl:grid-cols-2' : ''}`}>
              {datasets.map((dataset, index) => (
                <ComparisonPanel
                  key={`${dataset.name}-${index}`}
                  dataset={dataset}
                  selectedGenes={selectedGenes}
                  selectedGroups={selectedGroups}
                  activeTab={activeTab}
                  panelIndex={index}
                />
              ))}
            </div>
          </Tabs>
          
          {/* Summary stats - comparison mode gets aggregated view */}
          {isComparisonMode ? (
            <ComparisonSummaryStats
              datasets={datasets}
              selectedGenes={selectedGenes}
              selectedGroups={selectedGroups}
            />
          ) : (
            <div className="grid gap-4 lg:grid-cols-3">
              <div className="lg:col-span-3">
                <h3 className="text-lg font-semibold mb-3">Summary Statistics</h3>
                <SummaryStats
                  expressions={primaryDataset.expressions}
                  selectedGenes={selectedGenes}
                  selectedGroups={selectedGroups}
                  groups={primaryDataset.groups}
                />
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
