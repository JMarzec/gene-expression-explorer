import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GeneExpression } from "@/types/expression";
import { calculateMean, calculateStdDev } from "@/utils/statistics";
import { useMemo, useState } from "react";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
  Label,
  LabelList,
} from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

interface VolcanoPlotProps {
  expressions: GeneExpression[];
  selectedGenes: string[];
  selectedGroups: string[];
  groups: string[];
}

interface VolcanoPoint {
  gene: string;
  logFC: number;
  negLogPValue: number;
  pValue: number;
  significant: boolean;
  direction: "up" | "down" | "none";
}

// Welch's t-test (copied from DifferentialExpression for consistency)
function welchTTest(values1: number[], values2: number[]): { tStatistic: number; pValue: number } {
  const n1 = values1.length;
  const n2 = values2.length;
  
  if (n1 < 2 || n2 < 2) {
    return { tStatistic: 0, pValue: 1 };
  }
  
  const mean1 = calculateMean(values1);
  const mean2 = calculateMean(values2);
  const var1 = Math.pow(calculateStdDev(values1), 2);
  const var2 = Math.pow(calculateStdDev(values2), 2);
  
  const se = Math.sqrt(var1 / n1 + var2 / n2);
  
  if (se === 0) {
    return { tStatistic: 0, pValue: 1 };
  }
  
  const t = (mean1 - mean2) / se;
  
  const num = Math.pow(var1 / n1 + var2 / n2, 2);
  const denom = Math.pow(var1 / n1, 2) / (n1 - 1) + Math.pow(var2 / n2, 2) / (n2 - 1);
  const df = num / denom;
  
  const pValue = tDistributionPValue(Math.abs(t), df);
  
  return { tStatistic: t, pValue };
}

function tDistributionPValue(t: number, df: number): number {
  const x = df / (df + t * t);
  const a = df / 2;
  const b = 0.5;
  const beta = incompleteBeta(x, a, b);
  return beta;
}

function incompleteBeta(x: number, a: number, b: number): number {
  if (x === 0) return 0;
  if (x === 1) return 1;
  
  const bt = Math.exp(
    logGamma(a + b) - logGamma(a) - logGamma(b) +
    a * Math.log(x) + b * Math.log(1 - x)
  );
  
  if (x < (a + 1) / (a + b + 2)) {
    return bt * betaCF(x, a, b) / a;
  } else {
    return 1 - bt * betaCF(1 - x, b, a) / b;
  }
}

function betaCF(x: number, a: number, b: number): number {
  const maxIterations = 100;
  const epsilon = 1e-10;
  
  let qab = a + b;
  let qap = a + 1;
  let qam = a - 1;
  let c = 1;
  let d = 1 - qab * x / qap;
  
  if (Math.abs(d) < epsilon) d = epsilon;
  d = 1 / d;
  let h = d;
  
  for (let m = 1; m <= maxIterations; m++) {
    let m2 = 2 * m;
    let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < epsilon) d = epsilon;
    c = 1 + aa / c;
    if (Math.abs(c) < epsilon) c = epsilon;
    d = 1 / d;
    h *= d * c;
    
    aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < epsilon) d = epsilon;
    c = 1 + aa / c;
    if (Math.abs(c) < epsilon) c = epsilon;
    d = 1 / d;
    let del = d * c;
    h *= del;
    
    if (Math.abs(del - 1) < epsilon) break;
  }
  
  return h;
}

function logGamma(x: number): number {
  const g = 7;
  const coef = [
    0.99999999999980993,
    676.5203681218851,
    -1259.1392167224028,
    771.32342877765313,
    -176.61502916214059,
    12.507343278686905,
    -0.13857109526572012,
    9.9843695780195716e-6,
    1.5056327351493116e-7,
  ];
  
  if (x < 0.5) {
    return Math.log(Math.PI / Math.sin(Math.PI * x)) - logGamma(1 - x);
  }
  
  x -= 1;
  let a = coef[0];
  for (let i = 1; i < g + 2; i++) {
    a += coef[i] / (x + i);
  }
  
  const t = x + g + 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
}

export function VolcanoPlot({
  expressions,
  selectedGenes,
  selectedGroups,
  groups,
}: VolcanoPlotProps) {
  const [group1, setGroup1] = useState<string>(selectedGroups[0] || "");
  const [group2, setGroup2] = useState<string>(selectedGroups[1] || "");
  const [showLabels, setShowLabels] = useState(true);

  // Update group selections when selectedGroups changes
  useMemo(() => {
    if (!selectedGroups.includes(group1) && selectedGroups.length > 0) {
      setGroup1(selectedGroups[0]);
    }
    if (!selectedGroups.includes(group2) && selectedGroups.length > 1) {
      setGroup2(selectedGroups[1]);
    }
  }, [selectedGroups]);

  const volcanoData = useMemo(() => {
    if (!group1 || !group2 || group1 === group2) return [];
    
    const filteredGenes = expressions.filter(e => selectedGenes.includes(e.gene));
    const data: VolcanoPoint[] = [];
    
    for (const expr of filteredGenes) {
      const values1 = expr.samples.filter(s => s.group === group1).map(s => s.value);
      const values2 = expr.samples.filter(s => s.group === group2).map(s => s.value);
      
      if (values1.length < 2 || values2.length < 2) continue;
      
      const mean1 = calculateMean(values1);
      const mean2 = calculateMean(values2);
      const logFC = Math.log2((mean2 + 0.01) / (mean1 + 0.01));
      
      const { pValue } = welchTTest(values1, values2);
      const negLogPValue = -Math.log10(Math.max(pValue, 1e-300)); // Prevent -log(0)
      
      const significant = pValue < 0.05 && Math.abs(logFC) > 0.5;
      
      data.push({
        gene: expr.gene,
        logFC,
        negLogPValue,
        pValue,
        significant,
        direction: logFC > 0.5 ? "up" : logFC < -0.5 ? "down" : "none",
      });
    }
    
    return data;
  }, [expressions, selectedGenes, group1, group2]);

  // Get top significant genes for labeling
  const labeledPoints = useMemo(() => {
    if (!showLabels) return [];
    const significant = volcanoData.filter(d => d.significant);
    // Sort by -log10(p) and take top 10
    return significant
      .sort((a, b) => b.negLogPValue - a.negLogPValue)
      .slice(0, 10);
  }, [volcanoData, showLabels]);

  if (selectedGroups.length < 2) {
    return (
      <Card className="glass-panel">
        <CardContent className="flex items-center justify-center h-[300px] text-muted-foreground">
          Select at least 2 groups to view volcano plot
        </CardContent>
      </Card>
    );
  }

  if (selectedGenes.length === 0) {
    return (
      <Card className="glass-panel">
        <CardContent className="flex items-center justify-center h-[300px] text-muted-foreground">
          Select genes to view volcano plot
        </CardContent>
      </Card>
    );
  }

  const getPointColor = (point: VolcanoPoint) => {
    if (!point.significant) return "hsl(var(--muted-foreground))";
    if (point.direction === "up") return "hsl(142 76% 36%)"; // Green
    if (point.direction === "down") return "hsl(0 84% 60%)"; // Red
    return "hsl(var(--muted-foreground))";
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as VolcanoPoint;
      return (
        <div className="bg-popover/95 backdrop-blur-sm border border-border rounded-lg p-3 shadow-lg">
          <p className="font-semibold text-foreground">{data.gene}</p>
          <p className="text-sm text-muted-foreground">
            log₂FC: <span className={data.logFC > 0 ? "text-green-400" : data.logFC < 0 ? "text-red-400" : ""}>
              {data.logFC > 0 ? "+" : ""}{data.logFC.toFixed(3)}
            </span>
          </p>
          <p className="text-sm text-muted-foreground">
            p-value: {data.pValue < 0.001 ? data.pValue.toExponential(2) : data.pValue.toFixed(4)}
          </p>
          <p className="text-sm text-muted-foreground">
            -log₁₀(p): {data.negLogPValue.toFixed(2)}
          </p>
          {data.significant && (
            <p className="text-xs mt-1 text-amber-400 font-medium">
              Significant ({data.direction === "up" ? "upregulated" : "downregulated"})
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  // Calculate axis domains
  const maxAbsLogFC = Math.max(...volcanoData.map(d => Math.abs(d.logFC)), 1);
  const maxNegLogP = Math.max(...volcanoData.map(d => d.negLogPValue), 2);

  return (
    <Card className="glass-panel animate-fade-in">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-lg font-semibold">
            Volcano Plot
          </CardTitle>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch
                id="show-labels"
                checked={showLabels}
                onCheckedChange={setShowLabels}
              />
              <label htmlFor="show-labels" className="text-xs text-muted-foreground cursor-pointer">
                Show labels
              </label>
            </div>
            <div className="flex items-center gap-2">
              <Select value={group1} onValueChange={setGroup1}>
                <SelectTrigger className="w-[140px] h-8">
                  <SelectValue placeholder="Group 1" />
                </SelectTrigger>
                <SelectContent>
                  {selectedGroups.map(g => (
                    <SelectItem key={g} value={g} disabled={g === group2}>{g}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-muted-foreground text-sm">vs</span>
              <Select value={group2} onValueChange={setGroup2}>
                <SelectTrigger className="w-[140px] h-8">
                  <SelectValue placeholder="Group 2" />
                </SelectTrigger>
                <SelectContent>
                  {selectedGroups.map(g => (
                    <SelectItem key={g} value={g} disabled={g === group1}>{g}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <ScatterChart margin={{ top: 20, right: 20, bottom: 40, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
            <XAxis
              type="number"
              dataKey="logFC"
              domain={[-maxAbsLogFC * 1.1, maxAbsLogFC * 1.1]}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
              tickLine={{ stroke: "hsl(var(--border))" }}
            >
              <Label
                value="log₂ Fold Change"
                position="bottom"
                offset={20}
                style={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
              />
            </XAxis>
            <YAxis
              type="number"
              dataKey="negLogPValue"
              domain={[0, maxNegLogP * 1.1]}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
              tickLine={{ stroke: "hsl(var(--border))" }}
            >
              <Label
                value="-log₁₀(p-value)"
                angle={-90}
                position="insideLeft"
                style={{ fill: "hsl(var(--muted-foreground))", fontSize: 12, textAnchor: "middle" }}
              />
            </YAxis>
            <Tooltip content={<CustomTooltip />} />
            
            {/* Significance threshold lines */}
            <ReferenceLine
              y={-Math.log10(0.05)}
              stroke="hsl(var(--muted-foreground))"
              strokeDasharray="5 5"
              opacity={0.5}
            />
            <ReferenceLine
              x={-0.5}
              stroke="hsl(var(--muted-foreground))"
              strokeDasharray="5 5"
              opacity={0.5}
            />
            <ReferenceLine
              x={0.5}
              stroke="hsl(var(--muted-foreground))"
              strokeDasharray="5 5"
              opacity={0.5}
            />
            
            <Scatter data={volcanoData} fill="hsl(var(--primary))">
              {volcanoData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getPointColor(entry)} />
              ))}
              {showLabels && (
                <LabelList
                  dataKey="gene"
                  position="top"
                  offset={8}
                  style={{ fontSize: 10, fill: "hsl(var(--foreground))" }}
                  formatter={(value: string) => labeledPoints.some(p => p.gene === value) ? value : ""}
                />
              )}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
        
        <div className="mt-4 flex items-center gap-6 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span>Upregulated (log₂FC &gt; 0.5, p &lt; 0.05)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span>Downregulated (log₂FC &lt; -0.5, p &lt; 0.05)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-muted-foreground" />
            <span>Not significant</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
