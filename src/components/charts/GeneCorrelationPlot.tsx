import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GeneExpression } from "@/types/expression";
import { calculateCorrelation } from "@/utils/statistics";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
  Legend,
} from "recharts";
import { useMemo } from "react";

interface GeneCorrelationPlotProps {
  expressions: GeneExpression[];
  selectedGenes: string[];
  selectedGroups: string[];
  groups: string[];
}

const GROUP_COLORS: Record<string, string> = {};
const CHART_COLORS = [
  "hsl(200, 80%, 50%)",
  "hsl(340, 75%, 55%)",
  "hsl(165, 60%, 45%)",
  "hsl(280, 60%, 55%)",
  "hsl(25, 85%, 55%)",
  "hsl(45, 90%, 50%)",
];

interface CorrelationPair {
  geneX: string;
  geneY: string;
  data: { x: number; y: number; sampleId: string; group: string }[];
  correlation: number;
}

export function GeneCorrelationPlot({
  expressions,
  selectedGenes,
  selectedGroups,
  groups,
}: GeneCorrelationPlotProps) {
  // Assign colors to groups
  groups.forEach((group, index) => {
    GROUP_COLORS[group] = CHART_COLORS[index % CHART_COLORS.length];
  });

  const correlationPairs = useMemo(() => {
    if (selectedGenes.length < 2) return [];

    const pairs: CorrelationPair[] = [];

    // Generate all pairs
    for (let i = 0; i < selectedGenes.length; i++) {
      for (let j = i + 1; j < selectedGenes.length; j++) {
        const geneX = selectedGenes[i];
        const geneY = selectedGenes[j];

        const exprX = expressions.find(e => e.gene === geneX);
        const exprY = expressions.find(e => e.gene === geneY);

        if (!exprX || !exprY) continue;

        // Build sample-to-value maps
        const xMap = new Map(exprX.samples.map(s => [s.sampleId, s]));
        const yMap = new Map(exprY.samples.map(s => [s.sampleId, s]));

        // Get common samples in selected groups
        const data: { x: number; y: number; sampleId: string; group: string }[] = [];
        const xValues: number[] = [];
        const yValues: number[] = [];

        xMap.forEach((sampleX, sampleId) => {
          const sampleY = yMap.get(sampleId);
          if (sampleY && selectedGroups.includes(sampleX.group)) {
            data.push({
              x: sampleX.value,
              y: sampleY.value,
              sampleId,
              group: sampleX.group,
            });
            xValues.push(sampleX.value);
            yValues.push(sampleY.value);
          }
        });

        const correlation = calculateCorrelation(xValues, yValues);

        pairs.push({ geneX, geneY, data, correlation });
      }
    }

    return pairs;
  }, [expressions, selectedGenes, selectedGroups]);

  if (selectedGenes.length < 2) {
    return (
      <Card className="glass-panel">
        <CardContent className="flex items-center justify-center h-[300px] text-muted-foreground">
          Select at least 2 genes to view correlation plots
        </CardContent>
      </Card>
    );
  }

  // Calculate linear regression for trend line
  const calculateTrendLine = (data: { x: number; y: number }[]) => {
    const n = data.length;
    if (n < 2) return null;

    const sumX = data.reduce((sum, d) => sum + d.x, 0);
    const sumY = data.reduce((sum, d) => sum + d.y, 0);
    const sumXY = data.reduce((sum, d) => sum + d.x * d.y, 0);
    const sumX2 = data.reduce((sum, d) => sum + d.x * d.x, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    const minX = Math.min(...data.map(d => d.x));
    const maxX = Math.max(...data.map(d => d.x));

    return {
      start: { x: minX, y: slope * minX + intercept },
      end: { x: maxX, y: slope * maxX + intercept },
    };
  };

  return (
    <Card className="glass-panel animate-fade-in">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold">
          Gene Correlations
          <span className="text-muted-foreground font-normal ml-2 text-sm">
            ({correlationPairs.length} pairs)
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {correlationPairs.map(({ geneX, geneY, data, correlation }) => {
            const trendLine = calculateTrendLine(data);
            
            return (
              <div key={`${geneX}-${geneY}`} className="border border-border rounded-lg p-3 bg-muted/20">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1">
                    <span className="gene-tag text-xs">{geneX}</span>
                    <span className="text-muted-foreground">vs</span>
                    <span className="gene-tag text-xs">{geneY}</span>
                  </div>
                  <span
                    className={`text-sm font-mono font-semibold ${
                      correlation > 0.5
                        ? "text-green-400"
                        : correlation < -0.5
                        ? "text-red-400"
                        : "text-muted-foreground"
                    }`}
                  >
                    r = {correlation.toFixed(3)}
                  </span>
                </div>
                <ResponsiveContainer width="100%" height={180}>
                  <ScatterChart margin={{ top: 10, right: 10, bottom: 20, left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      type="number"
                      dataKey="x"
                      name={geneX}
                      tick={{ fill: "hsl(var(--foreground))", fontSize: 10 }}
                      axisLine={{ stroke: "hsl(var(--border))" }}
                      label={{
                        value: geneX,
                        position: "bottom",
                        fill: "hsl(var(--muted-foreground))",
                        fontSize: 10,
                        offset: -5,
                      }}
                    />
                    <YAxis
                      type="number"
                      dataKey="y"
                      name={geneY}
                      tick={{ fill: "hsl(var(--foreground))", fontSize: 10 }}
                      axisLine={{ stroke: "hsl(var(--border))" }}
                      label={{
                        value: geneY,
                        angle: -90,
                        position: "insideLeft",
                        fill: "hsl(var(--muted-foreground))",
                        fontSize: 10,
                      }}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const point = payload[0].payload;
                          return (
                            <div className="bg-popover border border-border rounded-lg p-2 shadow-lg text-xs">
                              <p className="font-semibold">{point.sampleId}</p>
                              <p className="text-muted-foreground">{point.group}</p>
                              <p>{geneX}: {point.x.toFixed(2)}</p>
                              <p>{geneY}: {point.y.toFixed(2)}</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    {trendLine && (
                      <ReferenceLine
                        segment={[
                          { x: trendLine.start.x, y: trendLine.start.y },
                          { x: trendLine.end.x, y: trendLine.end.y },
                        ]}
                        stroke="hsl(var(--foreground))"
                        strokeWidth={1}
                        strokeDasharray="4 4"
                        strokeOpacity={0.5}
                      />
                    )}
                    <Scatter data={data} fill="hsl(var(--primary))">
                      {data.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={GROUP_COLORS[entry.group]}
                          fillOpacity={0.7}
                        />
                      ))}
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 mt-4 justify-center">
          {selectedGroups.map(group => (
            <div key={group} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: GROUP_COLORS[group] }}
              />
              <span className="text-sm text-muted-foreground">{group}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
