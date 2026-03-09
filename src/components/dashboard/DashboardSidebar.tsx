import { Separator } from "@/components/ui/separator";
import { DatasetManager } from "./DatasetManager";
import { GeneSelector } from "./GeneSelector";
import { GroupFilter } from "./GroupFilter";
import { ExpressionDataset } from "@/types/expression";
import { Dna, Database } from "lucide-react";
import { useMemo } from "react";

interface DashboardSidebarProps {
  datasets: ExpressionDataset[];
  selectedGenes: string[];
  onGenesChange: (genes: string[]) => void;
  selectedGroups: string[];
  onGroupsChange: (groups: string[]) => void;
  onAddDataset: (data: ExpressionDataset) => void;
  onRemoveDataset: (index: number) => void;
}

export function DashboardSidebar({
  datasets,
  selectedGenes,
  onGenesChange,
  selectedGroups,
  onGroupsChange,
  onAddDataset,
  onRemoveDataset,
}: DashboardSidebarProps) {
  // Merge all unique genes and groups across datasets
  const allGenes = useMemo(() => {
    const geneSet = new Set<string>();
    datasets.forEach(d => d.genes.forEach(g => geneSet.add(g)));
    return Array.from(geneSet).sort();
  }, [datasets]);

  const allGroups = useMemo(() => {
    const groupSet = new Set<string>();
    datasets.forEach(d => d.groups.forEach(g => groupSet.add(g)));
    return Array.from(groupSet).sort();
  }, [datasets]);

  const totalSamples = useMemo(() => 
    datasets.reduce((sum, d) => sum + d.samples.length, 0), 
    [datasets]
  );

  return (
    <aside className="w-72 bg-sidebar border-r border-sidebar-border h-screen overflow-y-auto flex flex-col">
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-sidebar-primary/20 rounded-lg">
            <Dna className="h-5 w-5 text-sidebar-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-sidebar-foreground">Gene Expression</h1>
            <p className="text-xs text-sidebar-foreground/60">Explorer</p>
          </div>
        </div>
      </div>
      
      <div className="flex-1 p-4 space-y-6">
        <DatasetManager
          datasets={datasets}
          onAddDataset={onAddDataset}
          onRemoveDataset={onRemoveDataset}
          maxDatasets={4}
        />
        
        <Separator className="bg-sidebar-border" />
        
        <GeneSelector
          genes={allGenes}
          selectedGenes={selectedGenes}
          onSelectionChange={onGenesChange}
        />
        
        <Separator className="bg-sidebar-border" />
        
        <GroupFilter
          groups={allGroups}
          selectedGroups={selectedGroups}
          onSelectionChange={onGroupsChange}
        />
      </div>
      
      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-2 text-xs text-sidebar-foreground/60">
          <Database className="h-4 w-4" />
          <span>{datasets.length} dataset{datasets.length !== 1 ? 's' : ''} • {totalSamples} samples • {allGenes.length} genes</span>
        </div>
      </div>
    </aside>
  );
}
