import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GeneExpression } from "@/types/expression";
import { calculateCorrelation } from "@/utils/statistics";
import { useMemo } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface CorrelationMatrixProps {
  expressions: GeneExpression[];
  selectedGenes: string[];
  selectedGroups: string[];
}

function getCorrelationColor(r: number): string {
  // Blue (negative) -> White (0) -> Red (positive)
  const clampedR = Math.max(-1, Math.min(1, r));
  const normalized = (clampedR + 1) / 2; // 0 to 1
  
  if (normalized < 0.5) {
    // Blue to White
    const t = normalized * 2;
    const red = Math.round(59 + (245 - 59) * t);
    const green = Math.round(130 + (245 - 130) * t);
    const blue = Math.round(246 + (245 - 246) * t);
    return `rgb(${red}, ${green}, ${blue})`;
  } else {
    // White to Red
    const t = (normalized - 0.5) * 2;
    const red = Math.round(245 + (220 - 245) * t);
    const green = Math.round(245 + (53 - 245) * t);
    const blue = Math.round(245 + (69 - 245) * t);
    return `rgb(${red}, ${green}, ${blue})`;
  }
}

export function CorrelationMatrix({
  expressions,
  selectedGenes,
  selectedGroups,
}: CorrelationMatrixProps) {
  const correlationData = useMemo(() => {
    if (selectedGenes.length < 2) return { matrix: [], genes: [] };
    
    const genes = selectedGenes;
    const matrix: number[][] = [];
    
    // Build expression maps for each gene
    const exprMaps = new Map<string, Map<string, number>>();
    
    genes.forEach(gene => {
      const expr = expressions.find(e => e.gene === gene);
      if (expr) {
        const sampleMap = new Map<string, number>();
        expr.samples
          .filter(s => selectedGroups.includes(s.group))
          .forEach(s => sampleMap.set(s.sampleId, s.value));
        exprMaps.set(gene, sampleMap);
      }
    });
    
    // Calculate correlation matrix
    for (let i = 0; i < genes.length; i++) {
      const row: number[] = [];
      const mapI = exprMaps.get(genes[i]);
      
      for (let j = 0; j < genes.length; j++) {
        if (i === j) {
          row.push(1);
          continue;
        }
        
        const mapJ = exprMaps.get(genes[j]);
        
        if (!mapI || !mapJ) {
          row.push(0);
          continue;
        }
        
        // Get common samples
        const xValues: number[] = [];
        const yValues: number[] = [];
        
        mapI.forEach((value, sampleId) => {
          const yValue = mapJ.get(sampleId);
          if (yValue !== undefined) {
            xValues.push(value);
            yValues.push(yValue);
          }
        });
        
        const r = calculateCorrelation(xValues, yValues);
        row.push(r);
      }
      
      matrix.push(row);
    }
    
    return { matrix, genes };
  }, [expressions, selectedGenes, selectedGroups]);

  if (selectedGenes.length < 2) {
    return (
      <Card className="glass-panel">
        <CardContent className="flex items-center justify-center h-[200px] text-muted-foreground">
          Select at least 2 genes to view correlation matrix
        </CardContent>
      </Card>
    );
  }

  const { matrix, genes } = correlationData;
  const cellSize = Math.min(40, Math.max(24, 400 / genes.length));

  return (
    <Card className="glass-panel animate-fade-in">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold">
          Gene Correlation Matrix
          <span className="text-sm font-normal text-muted-foreground ml-2">
            (Pearson correlation)
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4">
          {/* Matrix */}
          <div className="overflow-x-auto">
            <div className="min-w-fit">
              {/* Column headers */}
              <div className="flex" style={{ marginLeft: `${cellSize + 4}px` }}>
                {genes.map((gene, i) => (
                  <div
                    key={`col-${gene}`}
                    className="text-xs font-mono text-muted-foreground overflow-hidden"
                    style={{
                      width: `${cellSize}px`,
                      height: `${cellSize}px`,
                      writingMode: "vertical-rl",
                      textOrientation: "mixed",
                      transform: "rotate(180deg)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "flex-end",
                      paddingBottom: "4px",
                    }}
                  >
                    {gene}
                  </div>
                ))}
              </div>
              
              {/* Matrix rows */}
              {matrix.map((row, i) => (
                <div key={`row-${genes[i]}`} className="flex items-center">
                  {/* Row label */}
                  <div
                    className="text-xs font-mono text-muted-foreground text-right pr-1 truncate"
                    style={{ width: `${cellSize}px` }}
                  >
                    {genes[i]}
                  </div>
                  
                  {/* Row cells */}
                  {row.map((r, j) => (
                    <Tooltip key={`cell-${i}-${j}`}>
                      <TooltipTrigger asChild>
                        <div
                          className="flex items-center justify-center cursor-pointer transition-transform hover:scale-110 hover:z-10 border border-background/50"
                          style={{
                            width: `${cellSize}px`,
                            height: `${cellSize}px`,
                            backgroundColor: getCorrelationColor(r),
                          }}
                        >
                          {cellSize >= 32 && (
                            <span
                              className="text-xs font-mono font-medium"
                              style={{
                                color: Math.abs(r) > 0.5 ? "white" : "hsl(var(--foreground))",
                                textShadow: Math.abs(r) > 0.5 ? "0 1px 2px rgba(0,0,0,0.3)" : "none",
                              }}
                            >
                              {r.toFixed(2)}
                            </span>
                          )}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">
                        <p className="font-semibold">{genes[i]} vs {genes[j]}</p>
                        <p>r = {r.toFixed(4)}</p>
                        <p className="text-muted-foreground">
                          {Math.abs(r) > 0.7 ? "Strong" : Math.abs(r) > 0.4 ? "Moderate" : "Weak"}{" "}
                          {r > 0 ? "positive" : r < 0 ? "negative" : "no"} correlation
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </div>
              ))}
            </div>
          </div>
          
          {/* Legend */}
          <div className="flex flex-col items-center justify-center gap-2">
            <span className="text-xs text-muted-foreground">+1</span>
            <div className="flex flex-col w-4 h-32 rounded overflow-hidden">
              {Array.from({ length: 20 }).map((_, i) => (
                <div
                  key={i}
                  className="flex-1"
                  style={{ backgroundColor: getCorrelationColor(1 - (i * 2 / 19)) }}
                />
              ))}
            </div>
            <span className="text-xs text-muted-foreground">-1</span>
          </div>
        </div>
        
        {/* Summary stats */}
        <div className="mt-4 grid grid-cols-3 gap-4 text-center">
          <div className="p-3 rounded-lg bg-muted/30">
            <div className="text-2xl font-bold text-foreground">
              {matrix.flat().filter(r => r > 0.7 && r < 1).length}
            </div>
            <div className="text-xs text-muted-foreground">Strong positive (r &gt; 0.7)</div>
          </div>
          <div className="p-3 rounded-lg bg-muted/30">
            <div className="text-2xl font-bold text-foreground">
              {matrix.flat().filter(r => r < -0.7).length}
            </div>
            <div className="text-xs text-muted-foreground">Strong negative (r &lt; -0.7)</div>
          </div>
          <div className="p-3 rounded-lg bg-muted/30">
            <div className="text-2xl font-bold text-foreground">
              {(matrix.flat().reduce((a, b) => a + Math.abs(b), 0) / matrix.flat().length).toFixed(2)}
            </div>
            <div className="text-xs text-muted-foreground">Mean |r|</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
