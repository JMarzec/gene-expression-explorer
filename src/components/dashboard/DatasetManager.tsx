import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Upload, FileJson, X, Plus, Database } from "lucide-react";
import { useCallback, useState } from "react";
import { ExpressionDataset } from "@/types/expression";
import { ScrollArea } from "@/components/ui/scroll-area";

interface DatasetManagerProps {
  datasets: ExpressionDataset[];
  onAddDataset: (data: ExpressionDataset) => void;
  onRemoveDataset: (index: number) => void;
  maxDatasets?: number;
}

export function DatasetManager({
  datasets,
  onAddDataset,
  onRemoveDataset,
  maxDatasets = 4,
}: DatasetManagerProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const handleFile = useCallback(async (file: File) => {
    setError(null);
    
    if (!file.name.endsWith(".json")) {
      setError("Please upload a JSON file");
      return;
    }
    
    if (datasets.length >= maxDatasets) {
      setError(`Maximum ${maxDatasets} datasets allowed`);
      return;
    }
    
    try {
      const text = await file.text();
      const data = JSON.parse(text) as ExpressionDataset;
      
      // Basic validation
      if (!data.genes || !data.samples || !data.expressions) {
        throw new Error("Invalid data structure");
      }
      
      // Check for duplicate dataset names
      if (datasets.some(d => d.name === data.name)) {
        setError(`Dataset "${data.name}" is already loaded`);
        return;
      }
      
      onAddDataset(data);
    } catch {
      setError("Failed to parse JSON file. Please check the format.");
    }
  }, [onAddDataset, datasets, maxDatasets]);
  
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    files.forEach(file => handleFile(file));
  }, [handleFile]);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => handleFile(file));
    e.target.value = ""; // Reset to allow same file upload again
  };

  const canAddMore = datasets.length < maxDatasets;
  
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="data-label">Datasets ({datasets.length}/{maxDatasets})</label>
      </div>
      
      {/* Loaded datasets */}
      {datasets.length > 0 && (
        <ScrollArea className="max-h-48">
          <div className="space-y-2">
            {datasets.map((dataset, index) => (
              <div
                key={`${dataset.name}-${index}`}
                className="flex items-center gap-2 p-2 bg-accent/50 rounded-md group"
              >
                <Database className="h-4 w-4 text-accent-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-accent-foreground truncate block">
                    {dataset.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {dataset.samples.length} samples • {dataset.genes.length} genes
                  </span>
                </div>
                {datasets.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => onRemoveDataset(index)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
      
      {/* Upload area */}
      {canAddMore && (
        <Card
          className={`
            border-2 border-dashed p-3 text-center transition-colors cursor-pointer
            ${isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}
          `}
          onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => document.getElementById("dataset-input")?.click()}
        >
          <input
            id="dataset-input"
            type="file"
            accept=".json"
            multiple
            className="hidden"
            onChange={handleChange}
          />
          
          <div className="flex items-center justify-center gap-2 py-1">
            {isDragging ? (
              <FileJson className="h-5 w-5 text-primary animate-pulse" />
            ) : (
              <Plus className="h-5 w-5 text-muted-foreground" />
            )}
            <div className="text-sm">
              <span className="text-primary font-medium">Add dataset</span>
              <span className="text-muted-foreground"> (JSON)</span>
            </div>
          </div>
        </Card>
      )}
      
      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}
    </div>
  );
}
