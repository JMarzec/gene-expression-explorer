import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GeneExpression } from "@/types/expression";
import { calculateBoxPlotStats } from "@/utils/statistics";
import {
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Scatter,
} from "recharts";

interface SampleBoxPlotProps {
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

// Custom shape for horizontal box plot
const HorizontalBoxPlotShape = (props: any) => {
  const { cx, cy, payload } = props;
  if (!payload || !cx || !cy) return null;
  
  const { q1, q3, median, min, max, color } = payload;
  const xScale = props.xAxis;
  
  if (!xScale) return null;
  
  const boxHeight = 12;
  const boxY = cy - boxHeight / 2;
  
  const x1 = xScale.scale(q1);
  const x3 = xScale.scale(q3);
  const xMedian = xScale.scale(median);
  const xMin = xScale.scale(min);
  const xMax = xScale.scale(max);
  
  const boxWidth = Math.abs(x3 - x1);
  const boxX = Math.min(x1, x3);
  
  return (
    <g>
      {/* Whisker line from min to max */}
      <line
        x1={xMin}
        y1={cy}
        x2={xMax}
        y2={cy}
        stroke="hsl(var(--foreground))"
        strokeWidth={1.5}
      />
      
      {/* Min whisker cap */}
      <line
        x1={xMin}
        y1={cy - boxHeight / 4}
        x2={xMin}
        y2={cy + boxHeight / 4}
        stroke="hsl(var(--foreground))"
        strokeWidth={1.5}
      />
      
      {/* Max whisker cap */}
      <line
        x1={xMax}
        y1={cy - boxHeight / 4}
        x2={xMax}
        y2={cy + boxHeight / 4}
        stroke="hsl(var(--foreground))"
        strokeWidth={1.5}
      />
      
      {/* Box from Q1 to Q3 */}
      <rect
        x={boxX}
        y={boxY}
        width={boxWidth}
        height={boxHeight}
        fill={color}
        fillOpacity={0.7}
        stroke={color}
        strokeWidth={2}
        rx={2}
      />
      
      {/* Median line */}
      <line
        x1={xMedian}
        y1={boxY}
        x2={xMedian}
        y2={boxY + boxHeight}
        stroke="hsl(var(--foreground))"
        strokeWidth={2}
      />
    </g>
  );
};

export function SampleBoxPlot({
  expressions,
  selectedGenes,
  selectedGroups,
  groups,
}: SampleBoxPlotProps) {
  // Assign colors to groups
  groups.forEach((group, index) => {
    GROUP_COLORS[group] = CHART_COLORS[index % CHART_COLORS.length];
  });

  // Get all unique samples from selected groups
  const filteredExpressions = expressions.filter(e => selectedGenes.includes(e.gene));
  
  if (filteredExpressions.length === 0) {
    return (
      <Card className="glass-panel animate-fade-in">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold">Per-Sample Expression</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Select genes to view per-sample distribution.</p>
        </CardContent>
      </Card>
    );
  }

  // Build sample data: for each sample, collect expression values across all selected genes
  const sampleMap = new Map<string, { values: number[]; group: string }>();
  
  filteredExpressions.forEach(expr => {
    expr.samples.forEach(sample => {
      if (!selectedGroups.includes(sample.group)) return;
      
      if (!sampleMap.has(sample.sampleId)) {
        sampleMap.set(sample.sampleId, { values: [], group: sample.group });
      }
      sampleMap.get(sample.sampleId)!.values.push(sample.value);
    });
  });

  // Calculate box plot stats for each sample
  const chartData = Array.from(sampleMap.entries())
    .map(([sampleId, data]) => {
      if (data.values.length === 0) return null;
      
      const stats = calculateBoxPlotStats(data.values);
      return {
        sample: sampleId,
        group: data.group,
        median: stats.median,
        q1: stats.q1,
        q3: stats.q3,
        min: stats.min,
        max: stats.max,
        color: GROUP_COLORS[data.group],
        values: stats.values,
        n: data.values.length,
      };
    })
    .filter(Boolean)
    .sort((a, b) => {
      // Sort by group first, then by sample ID
      const groupCompare = groups.indexOf(a!.group) - groups.indexOf(b!.group);
      if (groupCompare !== 0) return groupCompare;
      return a!.sample.localeCompare(b!.sample);
    }) as NonNullable<typeof chartData[number]>[];

  const chartHeight = Math.max(300, chartData.length * 25);

  // Calculate domain for X axis
  const allValues = chartData.flatMap(d => [d.min, d.max]);
  const xMin = Math.min(...allValues);
  const xMax = Math.max(...allValues);
  const xPadding = (xMax - xMin) * 0.1;

  return (
    <Card className="glass-panel animate-fade-in">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold">
          Per-Sample Expression Distribution
          <span className="text-muted-foreground font-normal ml-2 text-sm">
            ({selectedGenes.length} genes)
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={chartHeight}>
          <ComposedChart
            data={chartData}
            layout="vertical"
            margin={{ top: 20, right: 30, bottom: 20, left: 100 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              type="number"
              domain={[xMin - xPadding, xMax + xPadding]}
              tickFormatter={(value) => value.toFixed(1)}
              label={{
                value: "Expression (log2)",
                position: "bottom",
                fill: "hsl(var(--muted-foreground))",
                fontSize: 12,
              }}
              tick={{ fill: "hsl(var(--foreground))", fontSize: 11 }}
              axisLine={{ stroke: "hsl(var(--border))" }}
            />
            <YAxis
              type="category"
              dataKey="sample"
              tick={{ fill: "hsl(var(--foreground))", fontSize: 10 }}
              axisLine={{ stroke: "hsl(var(--border))" }}
              width={90}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
                      <p className="font-semibold text-foreground">{data.sample}</p>
                      <p className="text-sm text-muted-foreground mb-2">{data.group}</p>
                      <div className="space-y-1 text-sm">
                        <p><span className="text-muted-foreground">Max:</span> {data.max.toFixed(2)}</p>
                        <p><span className="text-muted-foreground">Q3:</span> {data.q3.toFixed(2)}</p>
                        <p><span className="text-muted-foreground">Median:</span> <strong>{data.median.toFixed(2)}</strong></p>
                        <p><span className="text-muted-foreground">Q1:</span> {data.q1.toFixed(2)}</p>
                        <p><span className="text-muted-foreground">Min:</span> {data.min.toFixed(2)}</p>
                        <p><span className="text-muted-foreground">Genes:</span> {data.n}</p>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Scatter
              dataKey="median"
              shape={<HorizontalBoxPlotShape />}
              legendType="none"
            />
          </ComposedChart>
        </ResponsiveContainer>
        
        {/* Legend */}
        <div className="flex flex-wrap gap-4 mt-4 justify-center">
          {selectedGroups.map(group => (
            <div key={group} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-sm"
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
