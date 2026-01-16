import { useMemo } from "react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Target } from "lucide-react";

interface DimensionScore {
  dimension: string;
  score: number;
  maxScore: number;
  benchmark?: number;
  target?: number;
}

interface AssessmentRadarChartProps {
  data: DimensionScore[];
  title?: string;
  showBenchmark?: boolean;
  showTarget?: boolean;
}

export function AssessmentRadarChart({
  data,
  title = "Assessment Results",
  showBenchmark = false,
  showTarget = false,
}: AssessmentRadarChartProps) {
  const chartData = useMemo(() => {
    return data.map((d) => ({
      dimension: d.dimension.length > 15 ? d.dimension.slice(0, 15) + "..." : d.dimension,
      fullName: d.dimension,
      score: (d.score / d.maxScore) * 100,
      benchmark: d.benchmark ? (d.benchmark / d.maxScore) * 100 : undefined,
      target: d.target ? (d.target / d.maxScore) * 100 : undefined,
    }));
  }, [data]);

  const averageScore = useMemo(() => {
    const total = data.reduce((sum, d) => sum + (d.score / d.maxScore) * 100, 0);
    return Math.round(total / data.length);
  }, [data]);

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="h-4 w-4 text-primary" />
            {title}
          </CardTitle>
          <Badge variant="outline" className="text-lg font-semibold">
            {averageScore}%
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={chartData} cx="50%" cy="50%" outerRadius="70%">
              <PolarGrid stroke="hsl(var(--border))" />
              <PolarAngleAxis
                dataKey="dimension"
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
              />
              <PolarRadiusAxis
                angle={90}
                domain={[0, 100]}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
              />
              
              {showTarget && (
                <Radar
                  name="Target"
                  dataKey="target"
                  stroke="hsl(var(--muted-foreground))"
                  strokeDasharray="5 5"
                  fill="none"
                  strokeWidth={2}
                />
              )}
              
              {showBenchmark && (
                <Radar
                  name="Benchmark"
                  dataKey="benchmark"
                  stroke="hsl(var(--chart-2))"
                  fill="hsl(var(--chart-2))"
                  fillOpacity={0.1}
                  strokeWidth={2}
                />
              )}
              
              <Radar
                name="Your Score"
                dataKey="score"
                stroke="hsl(var(--primary))"
                fill="hsl(var(--primary))"
                fillOpacity={0.3}
                strokeWidth={2}
              />
              
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const data = payload[0].payload;
                  return (
                    <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
                      <p className="font-medium text-sm">{data.fullName}</p>
                      <div className="mt-1 space-y-0.5 text-xs">
                        <p className="text-primary">Score: {Math.round(data.score)}%</p>
                        {data.benchmark && (
                          <p className="text-chart-2">Benchmark: {Math.round(data.benchmark)}%</p>
                        )}
                        {data.target && (
                          <p className="text-muted-foreground">Target: {Math.round(data.target)}%</p>
                        )}
                      </div>
                    </div>
                  );
                }}
              />
              
              <Legend />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
