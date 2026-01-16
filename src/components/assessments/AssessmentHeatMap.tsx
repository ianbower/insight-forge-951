import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Grid3X3 } from "lucide-react";

interface HeatMapCell {
  dimension: string;
  question: string;
  questionId: string;
  score: number;
  maxScore: number;
  responseCount?: number;
}

interface AssessmentHeatMapProps {
  data: HeatMapCell[];
  title?: string;
}

const getScoreColor = (percentage: number) => {
  if (percentage >= 80) return "bg-emerald-500";
  if (percentage >= 60) return "bg-emerald-400";
  if (percentage >= 40) return "bg-amber-400";
  if (percentage >= 20) return "bg-amber-500";
  return "bg-red-500";
};

const getScoreLabel = (percentage: number) => {
  if (percentage >= 80) return "Optimizing";
  if (percentage >= 60) return "Managed";
  if (percentage >= 40) return "Defined";
  if (percentage >= 20) return "Developing";
  return "Initial";
};

export function AssessmentHeatMap({ data, title = "Response Heat Map" }: AssessmentHeatMapProps) {
  const groupedData = useMemo(() => {
    const groups: Record<string, HeatMapCell[]> = {};
    data.forEach((cell) => {
      if (!groups[cell.dimension]) {
        groups[cell.dimension] = [];
      }
      groups[cell.dimension].push(cell);
    });
    return groups;
  }, [data]);

  const dimensions = Object.keys(groupedData);

  const overallStats = useMemo(() => {
    const totalScore = data.reduce((sum, d) => sum + d.score, 0);
    const maxPossible = data.reduce((sum, d) => sum + d.maxScore, 0);
    const percentage = maxPossible > 0 ? (totalScore / maxPossible) * 100 : 0;
    return {
      score: totalScore,
      max: maxPossible,
      percentage: Math.round(percentage),
    };
  }, [data]);

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Grid3X3 className="h-4 w-4 text-primary" />
            {title}
          </CardTitle>
          <Badge variant="outline">
            Overall: {overallStats.percentage}%
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <TooltipProvider>
          <div className="space-y-4">
            {dimensions.map((dimension) => (
              <div key={dimension}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">{dimension}</span>
                  <span className="text-xs text-muted-foreground">
                    {Math.round(
                      (groupedData[dimension].reduce((s, d) => s + d.score, 0) /
                        groupedData[dimension].reduce((s, d) => s + d.maxScore, 0)) *
                        100
                    )}
                    % avg
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {groupedData[dimension].map((cell) => {
                    const percentage = (cell.score / cell.maxScore) * 100;
                    return (
                      <Tooltip key={cell.questionId}>
                        <TooltipTrigger asChild>
                          <div
                            className={cn(
                              "h-8 w-8 rounded cursor-pointer transition-transform hover:scale-110",
                              getScoreColor(percentage)
                            )}
                          />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-[250px]">
                          <p className="font-medium text-sm mb-1">{cell.question}</p>
                          <div className="flex items-center gap-2 text-xs">
                            <span>
                              Score: {cell.score}/{cell.maxScore}
                            </span>
                            <Badge variant="secondary" className="text-xs">
                              {getScoreLabel(percentage)}
                            </Badge>
                          </div>
                          {cell.responseCount && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {cell.responseCount} responses
                            </p>
                          )}
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </TooltipProvider>

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 mt-6 pt-4 border-t text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <div className="h-3 w-3 rounded bg-red-500" />
            <span>Initial</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-3 w-3 rounded bg-amber-500" />
            <span>Developing</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-3 w-3 rounded bg-amber-400" />
            <span>Defined</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-3 w-3 rounded bg-emerald-400" />
            <span>Managed</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-3 w-3 rounded bg-emerald-500" />
            <span>Optimizing</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
