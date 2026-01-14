import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export interface Risk {
  id: string;
  project_id: string;
  title: string;
  description?: string;
  category: string;
  likelihood: "Low" | "Medium" | "High";
  impact: "Low" | "Medium" | "High";
  status: "Open" | "Mitigating" | "Closed";
  mitigation_plan?: string;
  owner_id?: string;
}

interface RiskMatrixProps {
  risks: Risk[];
  onRiskClick?: (risk: Risk) => void;
}

const likelihoodLevels = ["Low", "Medium", "High"] as const;
const impactLevels = ["Low", "Medium", "High"] as const;

const cellColors: Record<string, string> = {
  "Low-Low": "bg-emerald-500/20 hover:bg-emerald-500/30",
  "Low-Medium": "bg-amber-500/20 hover:bg-amber-500/30",
  "Low-High": "bg-amber-500/30 hover:bg-amber-500/40",
  "Medium-Low": "bg-emerald-500/30 hover:bg-emerald-500/40",
  "Medium-Medium": "bg-amber-500/30 hover:bg-amber-500/40",
  "Medium-High": "bg-red-500/30 hover:bg-red-500/40",
  "High-Low": "bg-amber-500/20 hover:bg-amber-500/30",
  "High-Medium": "bg-red-500/30 hover:bg-red-500/40",
  "High-High": "bg-red-500/40 hover:bg-red-500/50",
};

export function RiskMatrix({ risks, onRiskClick }: RiskMatrixProps) {
  const openRisks = risks.filter((r) => r.status !== "Closed");

  const getRisksInCell = (likelihood: string, impact: string) => {
    return openRisks.filter((r) => r.likelihood === likelihood && r.impact === impact);
  };

  return (
    <TooltipProvider>
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="font-medium">Risk Matrix</span>
          <span>({openRisks.length} open risks)</span>
        </div>

        <div className="relative">
          {/* Y-axis label */}
          <div className="absolute -left-8 top-1/2 -translate-y-1/2 -rotate-90 text-xs text-muted-foreground font-medium whitespace-nowrap">
            LIKELIHOOD
          </div>

          <div className="ml-4">
            {/* Matrix Grid */}
            <div className="grid grid-cols-3 gap-1">
              {[...likelihoodLevels].reverse().map((likelihood) =>
                impactLevels.map((impact) => {
                  const cellRisks = getRisksInCell(likelihood, impact);
                  const key = `${likelihood}-${impact}`;

                  return (
                    <div
                      key={key}
                      className={cn(
                        "aspect-square min-h-[80px] rounded-lg border border-border/50 p-2 transition-all relative",
                        cellColors[key]
                      )}
                    >
                      {/* Cell label */}
                      <span className="absolute top-1 left-2 text-xs text-muted-foreground opacity-50">
                        {likelihood[0]}/{impact[0]}
                      </span>

                      {/* Risk indicators */}
                      <div className="flex flex-wrap gap-1 justify-center items-center h-full pt-4">
                        {cellRisks.map((risk) => (
                          <Tooltip key={risk.id}>
                            <TooltipTrigger asChild>
                              <button
                                onClick={() => onRiskClick?.(risk)}
                                className={cn(
                                  "h-5 w-5 rounded-full border-2 transition-transform hover:scale-125",
                                  risk.status === "Mitigating"
                                    ? "bg-amber-500 border-amber-400"
                                    : "bg-red-500 border-red-400",
                                  "animate-pulse"
                                )}
                              />
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-[200px]">
                              <p className="font-medium">{risk.title}</p>
                              <p className="text-xs text-muted-foreground">{risk.category}</p>
                            </TooltipContent>
                          </Tooltip>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* X-axis labels */}
            <div className="grid grid-cols-3 gap-1 mt-2">
              {impactLevels.map((impact) => (
                <div key={impact} className="text-center text-xs text-muted-foreground">
                  {impact}
                </div>
              ))}
            </div>
            <div className="text-center text-xs text-muted-foreground font-medium mt-1">
              IMPACT
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2">
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-full bg-red-500 animate-pulse" />
            <span>Open</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-full bg-amber-500 animate-pulse" />
            <span>Mitigating</span>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
