import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GeneExpression } from "@/types/expression";
import { getBoxPlotDataByGroup } from "@/utils/statistics";
import {
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Rectangle,
  Line,
  Scatter,
  ZAxis,
} from "recharts";

interface ExpressionBoxPlotProps {
  geneExpression: GeneExpression;
  groups: string[];
  selectedGroups: string[];
}

const CHART_COLORS = [
  "hsl(200, 80%, 50%)",
  "hsl(340, 75%, 55%)",
  "hsl(165, 60%, 45%)",
  "hsl(280, 60%, 55%)",
  "hsl(25, 85%, 55%)",
  "hsl(45, 90%, 50%)",
];

// Custom shape for drawing a box plot box (Q1 to Q3 with median line)
const BoxPlotShape = (props: any) => {
  const { x, y, width, height, payload } = props;
  if (!payload) return null;
  
  const { q1, q3, median, min, max, color } = payload;
  const yScale = props.yAxis;
  
  if (!yScale) return null;
  
  const boxWidth = Math.min(width * 0.8, 70);
  const centerX = x + width / 2;
  const boxX = centerX - boxWidth / 2;
  
  const y1 = yScale.scale(q1);
  const y3 = yScale.scale(q3);
  const yMedian = yScale.scale(median);
  const yMin = yScale.scale(min);
  const yMax = yScale.scale(max);
  
  const boxHeight = Math.abs(y1 - y3);
  const boxY = Math.min(y1, y3);
  
  return (
    <g>
      {/* Whisker line from min to max */}
      <line
        x1={centerX}
        y1={yMin}
        x2={centerX}
        y2={yMax}
        stroke="hsl(var(--foreground))"
        strokeWidth={1.5}
      />
      
      {/* Min whisker cap */}
      <line
        x1={centerX - boxWidth / 4}
        y1={yMin}
        x2={centerX + boxWidth / 4}
        y2={yMin}
        stroke="hsl(var(--foreground))"
        strokeWidth={1.5}
      />
      
      {/* Max whisker cap */}
      <line
        x1={centerX - boxWidth / 4}
        y1={yMax}
        x2={centerX + boxWidth / 4}
        y2={yMax}
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
        x1={boxX}
        y1={yMedian}
        x2={boxX + boxWidth}
        y2={yMedian}
        stroke="hsl(var(--foreground))"
        strokeWidth={2}
      />
    </g>
  );
};

export function ExpressionBoxPlot({
  geneExpression,
  groups,
  selectedGroups,
}: ExpressionBoxPlotProps) {
  const filteredGroups = groups.filter(g => selectedGroups.includes(g));
  const boxPlotData = getBoxPlotDataByGroup(geneExpression, filteredGroups);
  
  const chartData = boxPlotData.map((data, index) => ({
    group: data.group,
    median: data.median,
    q1: data.q1,
    q3: data.q3,
    min: data.min,
    max: data.max,
    color: CHART_COLORS[groups.indexOf(data.group) % CHART_COLORS.length],
    values: data.values,
    // For positioning
    index: index,
  }));

  // Calculate domain for Y axis
  const allValues = chartData.flatMap(d => [d.min, d.max]);
  const yMin = Math.min(...allValues);
  const yMax = Math.max(...allValues);
  const yPadding = (yMax - yMin) * 0.1;

  return (
    <Card className="glass-panel animate-fade-in">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <span className="gene-tag">{geneExpression.gene}</span>
          <span className="text-muted-foreground font-normal">Expression by Group</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart 
            data={chartData} 
            margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="group" 
              tick={{ fill: "hsl(var(--foreground))", fontSize: 12 }}
              axisLine={{ stroke: "hsl(var(--border))" }}
            />
            <YAxis
              domain={[yMin - yPadding, yMax + yPadding]}
              tickFormatter={(value) => value.toFixed(1)}
              label={{ 
                value: "Expression (log2)", 
                angle: -90, 
                position: "insideLeft",
                fill: "hsl(var(--muted-foreground))",
                fontSize: 12
              }}
              tick={{ fill: "hsl(var(--foreground))", fontSize: 11 }}
              axisLine={{ stroke: "hsl(var(--border))" }}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
                      <p className="font-semibold text-foreground mb-2">{data.group}</p>
                      <div className="space-y-1 text-sm">
                        <p><span className="text-muted-foreground">Max:</span> {data.max.toFixed(2)}</p>
                        <p><span className="text-muted-foreground">Q3:</span> {data.q3.toFixed(2)}</p>
                        <p><span className="text-muted-foreground">Median:</span> <strong>{data.median.toFixed(2)}</strong></p>
                        <p><span className="text-muted-foreground">Q1:</span> {data.q1.toFixed(2)}</p>
                        <p><span className="text-muted-foreground">Min:</span> {data.min.toFixed(2)}</p>
                        <p><span className="text-muted-foreground">n:</span> {data.values.length}</p>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            {/* Invisible scatter for positioning and tooltip triggers */}
            <Scatter
              dataKey="median"
              shape={<BoxPlotShape />}
              legendType="none"
            />
          </ComposedChart>
        </ResponsiveContainer>
        
        {/* Legend */}
        <div className="flex flex-wrap gap-4 mt-2 justify-center">
          {chartData.map(item => (
            <div key={item.group} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-sm text-muted-foreground">{item.group}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
