import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus, Target } from "lucide-react";

interface GapItem {
  dimension: string;
  currentScore: number;
  targetScore: number;
  maxScore: number;
  priority?: "high" | "medium" | "low";
}

interface GapAnalysisChartProps {
  data: GapItem[];
  title?: string;
}

export function GapAnalysisChart({ data, title = "Gap Analysis" }: GapAnalysisChartProps) {
  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => {
      const gapA = a.targetScore - a.currentScore;
      const gapB = b.targetScore - b.currentScore;
      return gapB - gapA; // Largest gaps first
    });
  }, [data]);

  const totalGap = useMemo(() => {
    const currentTotal = data.reduce((sum, d) => sum + d.currentScore, 0);
    const targetTotal = data.reduce((sum, d) => sum + d.targetScore, 0);
    return targetTotal - currentTotal;
  }, [data]);

  const getGapIndicator = (current: number, target: number) => {
    const gap = target - current;
    if (gap <= 0) {
      return {
        icon: <TrendingUp className="h-4 w-4 text-emerald-500" />,
        label: "On Track",
        color: "text-emerald-500",
      };
    }
    if (gap <= 1) {
      return {
        icon: <Minus className="h-4 w-4 text-amber-500" />,
        label: "Minor Gap",
        color: "text-amber-500",
      };
    }
    return {
      icon: <TrendingDown className="h-4 w-4 text-red-500" />,
      label: "Significant Gap",
      color: "text-red-500",
    };
  };

  const getPriorityBadge = (priority?: string) => {
    switch (priority) {
      case "high":
        return <Badge variant="destructive" className="text-xs">High Priority</Badge>;
      case "medium":
        return <Badge variant="outline" className="text-xs border-amber-500 text-amber-500">Medium</Badge>;
      case "low":
        return <Badge variant="outline" className="text-xs">Low</Badge>;
      default:
        return null;
    }
  };

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="h-4 w-4 text-primary" />
            {title}
          </CardTitle>
          <Badge variant={totalGap > 0 ? "destructive" : "default"} className="font-normal">
            Total Gap: {totalGap > 0 ? `+${totalGap.toFixed(1)}` : totalGap.toFixed(1)} points
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {sortedData.map((item) => {
            const currentPercent = (item.currentScore / item.maxScore) * 100;
            const targetPercent = (item.targetScore / item.maxScore) * 100;
            const gap = item.targetScore - item.currentScore;
            const indicator = getGapIndicator(item.currentScore, item.targetScore);

            return (
              <div key={item.dimension} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {indicator.icon}
                    <span className="font-medium text-sm">{item.dimension}</span>
                    {getPriorityBadge(item.priority)}
                  </div>
                  <span className={cn("text-sm font-medium", indicator.color)}>
                    {gap > 0 ? `+${gap.toFixed(1)}` : gap.toFixed(1)} gap
                  </span>
                </div>

                <div className="relative h-6 bg-muted rounded-full overflow-hidden">
                  {/* Target indicator */}
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-foreground/50 z-10"
                    style={{ left: `${targetPercent}%` }}
                  />
                  <div
                    className="absolute -top-1 text-xs text-muted-foreground"
                    style={{ left: `${targetPercent}%`, transform: "translateX(-50%)" }}
                  >
                    ▼
                  </div>

                  {/* Current score bar */}
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      gap <= 0 ? "bg-emerald-500" : gap <= 1 ? "bg-amber-500" : "bg-primary"
                    )}
                    style={{ width: `${currentPercent}%` }}
                  />

                  {/* Score labels */}
                  <div className="absolute inset-0 flex items-center justify-between px-3">
                    <span className="text-xs font-medium text-primary-foreground">
                      {item.currentScore.toFixed(1)}
                    </span>
                    {currentPercent < 80 && (
                      <span className="text-xs text-muted-foreground">
                        Target: {item.targetScore.toFixed(1)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary */}
        <div className="mt-6 pt-4 border-t">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-emerald-500">
                {sortedData.filter((d) => d.targetScore - d.currentScore <= 0).length}
              </p>
              <p className="text-xs text-muted-foreground">On Track</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-500">
                {sortedData.filter((d) => {
                  const gap = d.targetScore - d.currentScore;
                  return gap > 0 && gap <= 1;
                }).length}
              </p>
              <p className="text-xs text-muted-foreground">Minor Gaps</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-red-500">
                {sortedData.filter((d) => d.targetScore - d.currentScore > 1).length}
              </p>
              <p className="text-xs text-muted-foreground">Significant Gaps</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
