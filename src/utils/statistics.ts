import { BoxPlotData, GeneExpression } from "@/types/expression";

export function calculateQuantile(sorted: number[], q: number): number {
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  
  if (sorted[base + 1] !== undefined) {
    return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
  }
  return sorted[base];
}

export function calculateBoxPlotStats(values: number[]): Omit<BoxPlotData, "group"> {
  const sorted = [...values].sort((a, b) => a - b);
  
  const q1 = calculateQuantile(sorted, 0.25);
  const median = calculateQuantile(sorted, 0.5);
  const q3 = calculateQuantile(sorted, 0.75);
  const iqr = q3 - q1;
  
  const lowerFence = q1 - 1.5 * iqr;
  const upperFence = q3 + 1.5 * iqr;
  
  const inRange = sorted.filter(v => v >= lowerFence && v <= upperFence);
  const outliers = sorted.filter(v => v < lowerFence || v > upperFence);
  
  return {
    min: inRange[0] ?? sorted[0],
    q1,
    median,
    q3,
    max: inRange[inRange.length - 1] ?? sorted[sorted.length - 1],
    outliers,
    values: sorted,
  };
}

export function getBoxPlotDataByGroup(
  geneExpression: GeneExpression,
  groups: string[]
): BoxPlotData[] {
  return groups.map(group => {
    const groupValues = geneExpression.samples
      .filter(s => s.group === group)
      .map(s => s.value);
    
    const stats = calculateBoxPlotStats(groupValues);
    return { group, ...stats };
  });
}

export function calculateZScore(value: number, mean: number, std: number): number {
  if (std === 0) return 0;
  return (value - mean) / std;
}

export function getMeanAndStd(values: number[]): { mean: number; std: number } {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  return { mean, std: Math.sqrt(variance) };
}

export function calculateMean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function calculateStdDev(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = calculateMean(values);
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
}

export function calculateMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return calculateQuantile(sorted, 0.5);
}

export function calculateMin(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.min(...values);
}

export function calculateMax(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.max(...values);
}

export function calculateCorrelation(x: number[], y: number[]): number {
  const n = x.length;
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
  const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
  const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);
  
  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
  
  return denominator === 0 ? 0 : numerator / denominator;
}
