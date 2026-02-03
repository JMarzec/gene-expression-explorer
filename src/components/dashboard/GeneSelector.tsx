import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, Search } from "lucide-react";
import { useState } from "react";

interface GeneSelectorProps {
  genes: string[];
  selectedGenes: string[];
  onSelectionChange: (genes: string[]) => void;
  maxSelection?: number;
}

export function GeneSelector({
  genes,
  selectedGenes,
  onSelectionChange,
  maxSelection = 20,
}: GeneSelectorProps) {
  const [search, setSearch] = useState("");
  
  const filteredGenes = genes.filter(gene =>
    gene.toLowerCase().includes(search.toLowerCase())
  );
  
  const toggleGene = (gene: string) => {
    if (selectedGenes.includes(gene)) {
      onSelectionChange(selectedGenes.filter(g => g !== gene));
    } else if (selectedGenes.length < maxSelection) {
      onSelectionChange([...selectedGenes, gene]);
    }
  };
  
  const clearAll = () => onSelectionChange([]);
  
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="data-label">Select Genes</label>
        {selectedGenes.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAll}
            className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
          >
            Clear all
          </Button>
        )}
      </div>
      
      {selectedGenes.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pb-2">
          {selectedGenes.map(gene => (
            <Badge
              key={gene}
              variant="secondary"
              className="gene-tag cursor-pointer pr-1"
              onClick={() => toggleGene(gene)}
            >
              {gene}
              <X className="ml-1 h-3 w-3" />
            </Badge>
          ))}
        </div>
      )}
      
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search genes..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9 h-9"
        />
      </div>
      
      <ScrollArea className="h-[180px] rounded-md border bg-muted/30 p-2">
        <div className="grid grid-cols-2 gap-1">
          {filteredGenes.map(gene => {
            const isSelected = selectedGenes.includes(gene);
            const isDisabled = !isSelected && selectedGenes.length >= maxSelection;
            
            return (
              <button
                key={gene}
                onClick={() => !isDisabled && toggleGene(gene)}
                disabled={isDisabled}
                className={`
                  px-2.5 py-1.5 text-left text-sm font-mono rounded-md transition-colors
                  ${isSelected 
                    ? "bg-primary text-primary-foreground" 
                    : isDisabled
                      ? "text-muted-foreground/50 cursor-not-allowed"
                      : "hover:bg-muted text-foreground"
                  }
                `}
              >
                {gene}
              </button>
            );
          })}
        </div>
      </ScrollArea>
      
      <p className="text-xs text-muted-foreground">
        {selectedGenes.length} / {maxSelection} genes selected
      </p>
    </div>
  );
}
