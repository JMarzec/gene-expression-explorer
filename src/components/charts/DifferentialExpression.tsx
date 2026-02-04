import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GeneExpression } from "@/types/expression";
import { calculateMean, calculateStdDev } from "@/utils/statistics";
import { useMemo } from "react";
import { ArrowUp, ArrowDown, Minus } from "lucide-react";

interface DifferentialExpressionProps {
  expressions: GeneExpression[];
  selectedGenes: string[];
  selectedGroups: string[];
  groups: string[];
}

interface DEResult {
  gene: string;
  group1: string;
  group2: string;
  mean1: number;
  mean2: number;
  logFC: number;
  tStatistic: number;
  pValue: number;
  significant: boolean;
}

// Welch's t-test (unequal variances)
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
  
  // Welch-Satterthwaite degrees of freedom
  const num = Math.pow(var1 / n1 + var2 / n2, 2);
  const denom = Math.pow(var1 / n1, 2) / (n1 - 1) + Math.pow(var2 / n2, 2) / (n2 - 1);
  const df = num / denom;
  
  // Approximate p-value using Student's t-distribution
  // Using a simplified approximation for two-tailed test
  const pValue = tDistributionPValue(Math.abs(t), df);
  
  return { tStatistic: t, pValue };
}

// Approximation of t-distribution p-value (two-tailed)
function tDistributionPValue(t: number, df: number): number {
  // Using approximation from Abramowitz and Stegun
  const x = df / (df + t * t);
  const a = df / 2;
  const b = 0.5;
  
  // Incomplete beta function approximation
  const beta = incompleteBeta(x, a, b);
  return beta;
}

// Simplified incomplete beta function approximation
function incompleteBeta(x: number, a: number, b: number): number {
  // Using a series approximation
  if (x === 0) return 0;
  if (x === 1) return 1;
  
  // Lanczos approximation for beta function
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

// Continued fraction for incomplete beta
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

// Log gamma function (Lanczos approximation)
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

export function DifferentialExpression({
  expressions,
  selectedGenes,
  selectedGroups,
  groups,
}: DifferentialExpressionProps) {
  const deResults = useMemo(() => {
    if (selectedGroups.length < 2) return [];
    
    const results: DEResult[] = [];
    const filteredGenes = expressions.filter(e => selectedGenes.includes(e.gene));
    
    // Generate pairwise comparisons
    for (let i = 0; i < selectedGroups.length; i++) {
      for (let j = i + 1; j < selectedGroups.length; j++) {
        const group1 = selectedGroups[i];
        const group2 = selectedGroups[j];
        
        for (const expr of filteredGenes) {
          const values1 = expr.samples.filter(s => s.group === group1).map(s => s.value);
          const values2 = expr.samples.filter(s => s.group === group2).map(s => s.value);
          
          if (values1.length < 2 || values2.length < 2) continue;
          
          const mean1 = calculateMean(values1);
          const mean2 = calculateMean(values2);
          
          // Log2 fold change (adding small value to avoid log(0))
          const logFC = Math.log2((mean2 + 0.01) / (mean1 + 0.01));
          
          const { tStatistic, pValue } = welchTTest(values1, values2);
          
          results.push({
            gene: expr.gene,
            group1,
            group2,
            mean1,
            mean2,
            logFC,
            tStatistic,
            pValue,
            significant: pValue < 0.05,
          });
        }
      }
    }
    
    // Sort by p-value
    return results.sort((a, b) => a.pValue - b.pValue);
  }, [expressions, selectedGenes, selectedGroups]);

  if (selectedGroups.length < 2) {
    return (
      <Card className="glass-panel">
        <CardContent className="flex items-center justify-center h-[200px] text-muted-foreground">
          Select at least 2 groups to view differential expression
        </CardContent>
      </Card>
    );
  }

  if (selectedGenes.length === 0) {
    return (
      <Card className="glass-panel">
        <CardContent className="flex items-center justify-center h-[200px] text-muted-foreground">
          Select genes to view differential expression
        </CardContent>
      </Card>
    );
  }

  const formatPValue = (p: number) => {
    if (p < 0.001) return p.toExponential(2);
    return p.toFixed(4);
  };

  return (
    <Card className="glass-panel animate-fade-in">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold">
          Differential Expression Analysis
          <span className="text-sm font-normal text-muted-foreground ml-2">
            (Welch's t-test, α = 0.05)
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 px-3 font-semibold text-muted-foreground">Gene</th>
                <th className="text-left py-2 px-3 font-semibold text-muted-foreground">Comparison</th>
                <th className="text-right py-2 px-3 font-semibold text-muted-foreground">Mean 1</th>
                <th className="text-right py-2 px-3 font-semibold text-muted-foreground">Mean 2</th>
                <th className="text-right py-2 px-3 font-semibold text-muted-foreground">log₂FC</th>
                <th className="text-right py-2 px-3 font-semibold text-muted-foreground">t-statistic</th>
                <th className="text-right py-2 px-3 font-semibold text-muted-foreground">p-value</th>
                <th className="text-center py-2 px-3 font-semibold text-muted-foreground">Direction</th>
              </tr>
            </thead>
            <tbody>
              {deResults.map((result, idx) => (
                <tr
                  key={`${result.gene}-${result.group1}-${result.group2}`}
                  className={`border-b border-border/50 ${result.significant ? "bg-primary/5" : ""}`}
                >
                  <td className="py-2 px-3">
                    <span className="gene-tag text-xs">{result.gene}</span>
                  </td>
                  <td className="py-2 px-3 text-muted-foreground">
                    {result.group1} vs {result.group2}
                  </td>
                  <td className="py-2 px-3 text-right font-mono">{result.mean1.toFixed(2)}</td>
                  <td className="py-2 px-3 text-right font-mono">{result.mean2.toFixed(2)}</td>
                  <td className={`py-2 px-3 text-right font-mono ${
                    result.logFC > 0 ? "text-green-400" : result.logFC < 0 ? "text-red-400" : ""
                  }`}>
                    {result.logFC > 0 ? "+" : ""}{result.logFC.toFixed(3)}
                  </td>
                  <td className="py-2 px-3 text-right font-mono">{result.tStatistic.toFixed(3)}</td>
                  <td className={`py-2 px-3 text-right font-mono ${result.significant ? "text-amber-400 font-semibold" : ""}`}>
                    {formatPValue(result.pValue)}
                    {result.significant && " *"}
                  </td>
                  <td className="py-2 px-3 text-center">
                    {result.logFC > 0.5 ? (
                      <ArrowUp className="h-4 w-4 text-green-400 mx-auto" />
                    ) : result.logFC < -0.5 ? (
                      <ArrowDown className="h-4 w-4 text-red-400 mx-auto" />
                    ) : (
                      <Minus className="h-4 w-4 text-muted-foreground mx-auto" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="mt-4 flex items-center gap-6 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-primary/20" />
            <span>Significant (p &lt; 0.05)</span>
          </div>
          <div className="flex items-center gap-2">
            <ArrowUp className="h-3 w-3 text-green-400" />
            <span>Upregulated (log₂FC &gt; 0.5)</span>
          </div>
          <div className="flex items-center gap-2">
            <ArrowDown className="h-3 w-3 text-red-400" />
            <span>Downregulated (log₂FC &lt; -0.5)</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
