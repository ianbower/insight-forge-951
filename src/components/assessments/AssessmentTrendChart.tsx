import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp } from "lucide-react";

interface TrendDataPoint {
  period: string;
  score: number;
  benchmark?: number;
  target?: number;
}

interface AssessmentTrendChartProps {
  data: TrendDataPoint[];
  title?: string;
  showBenchmark?: boolean;
  showTarget?: boolean;
}

export function AssessmentTrendChart({
  data,
  title = "Maturity Trend",
  showBenchmark = false,
  showTarget = false,
}: AssessmentTrendChartProps) {
  const trend = useMemo(() => {
    if (data.length < 2) return 0;
    const first = data[0].score;
    const last = data[data.length - 1].score;
    return last - first;
  }, [data]);

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4 text-primary" />
            {title}
          </CardTitle>
          <Badge
            variant={trend >= 0 ? "default" : "destructive"}
            className={trend >= 0 ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : ""}
          >
            {trend >= 0 ? "+" : ""}{trend.toFixed(1)} pts
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="period"
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
              />
              <YAxis
                domain={[0, 100]}
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
              />
              <Legend />

              {showTarget && (
                <Line
                  type="monotone"
                  dataKey="target"
                  stroke="hsl(var(--muted-foreground))"
                  strokeDasharray="5 5"
                  strokeWidth={2}
                  dot={false}
                  name="Target"
                />
              )}

              {showBenchmark && (
                <Line
                  type="monotone"
                  dataKey="benchmark"
                  stroke="hsl(var(--chart-2))"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  name="Benchmark"
                />
              )}

              <Line
                type="monotone"
                dataKey="score"
                stroke="hsl(var(--primary))"
                strokeWidth={3}
                dot={{ r: 4, fill: "hsl(var(--primary))" }}
                name="Your Score"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
