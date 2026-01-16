import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  Cell,
  Legend,
} from "recharts";
import { Target, TrendingUp, TrendingDown, Minus, AlertTriangle } from "lucide-react";

interface DimensionScore {
  name: string;
  score: number;
  target: number;
  benchmark: number;
  responseCount: number;
}

interface HistoricalData {
  period: string;
  score: number;
}

interface RadarChartProps {
  data: DimensionScore[];
  title?: string;
}

interface HeatMapProps {
  dimensions: {
    name: string;
    questions: { text: string; score: number }[];
  }[];
}

interface GapAnalysisProps {
  data: DimensionScore[];
  targetLabel?: string;
}

interface TrendChartProps {
  data: HistoricalData[];
  title?: string;
}

// Radar/Spider Chart Component
export function AssessmentRadarChart({ data, title = "Dimension Scores" }: RadarChartProps) {
  const chartData = data.map((d) => ({
    dimension: d.name.length > 15 ? d.name.substring(0, 15) + "..." : d.name,
    fullName: d.name,
    score: d.score,
    target: d.target,
    benchmark: d.benchmark,
  }));

  return (
    <Card className="border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <Target className="h-4 w-4" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={chartData} margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
              <PolarGrid stroke="hsl(var(--border))" />
              <PolarAngleAxis
                dataKey="dimension"
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
              />
              <PolarRadiusAxis
                angle={30}
                domain={[0, 5]}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
              />
              <Radar
                name="Benchmark"
                dataKey="benchmark"
                stroke="hsl(var(--muted-foreground))"
                fill="hsl(var(--muted))"
                fillOpacity={0.3}
                strokeDasharray="5 5"
              />
              <Radar
                name="Target"
                dataKey="target"
                stroke="hsl(var(--chart-2))"
                fill="hsl(var(--chart-2))"
                fillOpacity={0.2}
              />
              <Radar
                name="Score"
                dataKey="score"
                stroke="hsl(var(--primary))"
                fill="hsl(var(--primary))"
                fillOpacity={0.4}
                strokeWidth={2}
              />
              <Legend />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
                formatter={(value: number, name: string) => [value.toFixed(2), name]}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// Heat Map Component
export function AssessmentHeatMap({ dimensions }: HeatMapProps) {
  const getScoreColor = (score: number) => {
    if (score >= 4.5) return "bg-emerald-500";
    if (score >= 3.5) return "bg-emerald-400";
    if (score >= 2.5) return "bg-amber-400";
    if (score >= 1.5) return "bg-amber-500";
    return "bg-red-500";
  };

  const getScoreTextColor = (score: number) => {
    if (score >= 4.5) return "text-emerald-500";
    if (score >= 3.5) return "text-emerald-400";
    if (score >= 2.5) return "text-amber-400";
    if (score >= 1.5) return "text-amber-500";
    return "text-red-500";
  };

  return (
    <Card className="border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">Question Heat Map</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {dimensions.map((dimension, dimIdx) => (
            <div key={dimIdx}>
              <h4 className="text-sm font-medium mb-2">{dimension.name}</h4>
              <div className="grid grid-cols-1 gap-2">
                {dimension.questions.map((question, qIdx) => (
                  <div
                    key={qIdx}
                    className="flex items-center gap-3 p-2 rounded-lg bg-muted/30"
                  >
                    <div
                      className={cn(
                        "h-8 w-8 rounded flex items-center justify-center text-white text-sm font-medium shrink-0",
                        getScoreColor(question.score)
                      )}
                    >
                      {question.score.toFixed(1)}
                    </div>
                    <p className="text-sm flex-1 line-clamp-1">{question.text}</p>
                    <div className="w-24">
                      <Progress
                        value={(question.score / 5) * 100}
                        className="h-2"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {dimensions.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              No response data available
            </p>
          )}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 mt-6 pt-4 border-t">
          <div className="flex items-center gap-1.5 text-xs">
            <div className="h-3 w-3 rounded bg-red-500" />
            <span>1-1.5</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <div className="h-3 w-3 rounded bg-amber-500" />
            <span>1.5-2.5</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <div className="h-3 w-3 rounded bg-amber-400" />
            <span>2.5-3.5</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <div className="h-3 w-3 rounded bg-emerald-400" />
            <span>3.5-4.5</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <div className="h-3 w-3 rounded bg-emerald-500" />
            <span>4.5-5</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Gap Analysis Component
export function AssessmentGapAnalysis({ data, targetLabel = "Target" }: GapAnalysisProps) {
  const sortedData = useMemo(() => {
    return [...data]
      .map((d) => ({
        ...d,
        gap: d.target - d.score,
        shortName: d.name.length > 20 ? d.name.substring(0, 20) + "..." : d.name,
      }))
      .sort((a, b) => b.gap - a.gap);
  }, [data]);

  const maxGap = Math.max(...sortedData.map((d) => Math.abs(d.gap)));

  return (
    <Card className="border-border">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Gap Analysis
          </CardTitle>
          <div className="flex gap-2 text-xs">
            <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">
              High Priority
            </Badge>
            <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20">
              Medium
            </Badge>
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
              On Track
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={sortedData}
              layout="vertical"
              margin={{ top: 10, right: 30, left: 100, bottom: 10 }}
            >
              <XAxis type="number" domain={[-maxGap - 0.5, maxGap + 0.5]} />
              <YAxis type="category" dataKey="shortName" width={100} tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
                formatter={(value: number) => [
                  value > 0 ? `Gap: ${value.toFixed(2)}` : `Exceeds by: ${Math.abs(value).toFixed(2)}`,
                  "Status",
                ]}
              />
              <Bar dataKey="gap" radius={[0, 4, 4, 0]}>
                {sortedData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={
                      entry.gap > 1
                        ? "hsl(var(--destructive))"
                        : entry.gap > 0.5
                        ? "hsl(45, 93%, 47%)"
                        : "hsl(142, 76%, 36%)"
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Gap Summary */}
        <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t">
          <div className="text-center">
            <p className="text-2xl font-bold text-red-500">
              {sortedData.filter((d) => d.gap > 1).length}
            </p>
            <p className="text-xs text-muted-foreground">High Priority Gaps</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-amber-500">
              {sortedData.filter((d) => d.gap > 0.5 && d.gap <= 1).length}
            </p>
            <p className="text-xs text-muted-foreground">Medium Gaps</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-emerald-500">
              {sortedData.filter((d) => d.gap <= 0.5).length}
            </p>
            <p className="text-xs text-muted-foreground">On Track</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Trend Line Chart Component
export function AssessmentTrendChart({ data, title = "Maturity Trend" }: TrendChartProps) {
  const latestScore = data.length > 0 ? data[data.length - 1].score : 0;
  const previousScore = data.length > 1 ? data[data.length - 2].score : latestScore;
  const trend = latestScore - previousScore;

  return (
    <Card className="border-border">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium">{title}</CardTitle>
          <div className="flex items-center gap-2">
            {trend > 0 ? (
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 gap-1">
                <TrendingUp className="h-3 w-3" />+{trend.toFixed(2)}
              </Badge>
            ) : trend < 0 ? (
              <Badge variant="outline" className="bg-red-500/10 text-red-500 gap-1">
                <TrendingDown className="h-3 w-3" />
                {trend.toFixed(2)}
              </Badge>
            ) : (
              <Badge variant="outline" className="gap-1">
                <Minus className="h-3 w-3" />
                No change
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="period"
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
              />
              <YAxis
                domain={[0, 5]}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
                formatter={(value: number) => [value.toFixed(2), "Score"]}
              />
              <Area
                type="monotone"
                dataKey="score"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#trendGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// Overall Score Card
interface ScoreCardProps {
  score: number;
  maxScore?: number;
  label: string;
  sublabel?: string;
  trend?: number;
}

export function AssessmentScoreCard({ score, maxScore = 5, label, sublabel, trend }: ScoreCardProps) {
  const percentage = (score / maxScore) * 100;

  const getScoreColor = () => {
    if (percentage >= 80) return "text-emerald-500";
    if (percentage >= 60) return "text-amber-500";
    return "text-red-500";
  };

  return (
    <Card className="border-border">
      <CardContent className="pt-6">
        <div className="text-center">
          <p className={cn("text-4xl font-bold", getScoreColor())}>
            {score.toFixed(1)}
          </p>
          <p className="text-sm text-muted-foreground">out of {maxScore}</p>
          <Progress value={percentage} className="mt-4 h-2" />
          <p className="text-sm font-medium mt-3">{label}</p>
          {sublabel && <p className="text-xs text-muted-foreground">{sublabel}</p>}
          {trend !== undefined && (
            <div className="flex items-center justify-center gap-1 mt-2">
              {trend > 0 ? (
                <TrendingUp className="h-4 w-4 text-emerald-500" />
              ) : trend < 0 ? (
                <TrendingDown className="h-4 w-4 text-red-500" />
              ) : (
                <Minus className="h-4 w-4 text-muted-foreground" />
              )}
              <span
                className={cn(
                  "text-sm",
                  trend > 0 ? "text-emerald-500" : trend < 0 ? "text-red-500" : "text-muted-foreground"
                )}
              >
                {trend > 0 ? "+" : ""}
                {trend.toFixed(2)} from previous
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
