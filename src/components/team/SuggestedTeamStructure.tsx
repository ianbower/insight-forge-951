import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";

interface TeamRole {
  level: string;
  count: number;
  role: string;
  skills: string[];
}

interface SuggestedTeamStructureProps {
  projectType: string;
  structure: TeamRole[];
  onSelectRole?: (role: TeamRole) => void;
}

const levelColors: Record<string, string> = {
  Partner: "bg-violet-500 text-white",
  Director: "bg-blue-500 text-white",
  Manager: "bg-emerald-500 text-white",
  Consultant: "bg-amber-500 text-white",
  Analyst: "bg-slate-500 text-white",
};

const levelWidths: Record<string, string> = {
  Partner: "w-24",
  Director: "w-32",
  Manager: "w-44",
  Consultant: "w-56",
  Analyst: "w-64",
};

export function SuggestedTeamStructure({ projectType, structure, onSelectRole }: SuggestedTeamStructureProps) {
  const totalHeadcount = structure.reduce((sum, role) => sum + role.count, 0);

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Lightbulb className="h-4 w-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Suggested Team Structure</CardTitle>
              <p className="text-sm text-muted-foreground">{projectType} Project</p>
            </div>
          </div>
          <Badge variant="outline" className="gap-1">
            <Users className="h-3 w-3" />
            {totalHeadcount} FTE
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {/* Pyramid Visualization */}
        <div className="flex flex-col items-center gap-2 py-4">
          {structure.map((role, idx) => (
            <button
              key={idx}
              onClick={() => onSelectRole?.(role)}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-all hover:scale-105 hover:shadow-lg",
                levelWidths[role.level],
                levelColors[role.level]
              )}
            >
              <div className="flex items-center justify-between">
                <span>{role.level}</span>
                <span className="opacity-80">×{role.count}</span>
              </div>
            </button>
          ))}
        </div>

        {/* Role Details */}
        <div className="space-y-2 pt-4 border-t border-border/50">
          {structure.map((role, idx) => (
            <div key={idx} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div className={cn("h-2 w-2 rounded-full", levelColors[role.level])} />
                <span className="text-muted-foreground">{role.role}</span>
              </div>
              <div className="flex gap-1">
                {role.skills.slice(0, 2).map((skill, sidx) => (
                  <Badge key={sidx} variant="outline" className="text-xs">
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
