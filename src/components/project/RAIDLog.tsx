import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { AlertTriangle, CheckCircle2, Circle, Clock, Plus, User } from "lucide-react";
import { format } from "date-fns";
import type { Risk } from "./RiskMatrix";

export interface Issue {
  id: string;
  project_id: string;
  title: string;
  description?: string;
  priority: "Critical" | "High" | "Medium" | "Low";
  status: "Open" | "In Progress" | "Resolved" | "Escalated";
  resolution?: string;
  owner_id?: string;
  raised_date: string;
  target_resolution_date?: string;
  resolved_date?: string;
}

interface RAIDLogProps {
  risks: Risk[];
  issues: Issue[];
  onAddRisk?: () => void;
  onAddIssue?: () => void;
  onEditRisk?: (risk: Risk) => void;
  onEditIssue?: (issue: Issue) => void;
}

const priorityColors = {
  Critical: "bg-red-500/20 text-red-400 border-red-500/30",
  High: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  Medium: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  Low: "bg-slate-500/20 text-slate-400 border-slate-500/30",
};

const issueStatusColors = {
  Open: "bg-red-500/20 text-red-400 border-red-500/30",
  "In Progress": "bg-blue-500/20 text-blue-400 border-blue-500/30",
  Resolved: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  Escalated: "bg-violet-500/20 text-violet-400 border-violet-500/30",
};

const riskStatusColors = {
  Open: "bg-red-500/20 text-red-400 border-red-500/30",
  Mitigating: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  Closed: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
};

export function RAIDLog({ risks, issues, onAddRisk, onAddIssue, onEditRisk, onEditIssue }: RAIDLogProps) {
  const openRisks = risks.filter((r) => r.status !== "Closed");
  const openIssues = issues.filter((i) => i.status !== "Resolved");

  return (
    <Tabs defaultValue="risks" className="space-y-4">
      <div className="flex items-center justify-between">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="risks" className="gap-2">
            <AlertTriangle className="h-4 w-4" />
            Risks
            {openRisks.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                {openRisks.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="issues" className="gap-2">
            <Circle className="h-4 w-4" />
            Issues
            {openIssues.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                {openIssues.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="risks" className="space-y-3">
        <div className="flex justify-end">
          {onAddRisk && (
            <Button variant="outline" size="sm" onClick={onAddRisk} className="gap-1">
              <Plus className="h-4 w-4" />
              Add Risk
            </Button>
          )}
        </div>
        
        {risks.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No risks logged yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {risks.map((risk, idx) => (
              <Card
                key={risk.id}
                className={cn(
                  "cursor-pointer transition-all hover:shadow-md border-border/50",
                  "animate-in fade-in slide-in-from-bottom-2"
                )}
                style={{ animationDelay: `${idx * 50}ms` }}
                onClick={() => onEditRisk?.(risk)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium">{risk.title}</h4>
                        <Badge variant="outline" className="text-xs">
                          {risk.category}
                        </Badge>
                      </div>
                      {risk.description && (
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {risk.description}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant="outline" className={cn("text-xs", riskStatusColors[risk.status])}>
                        {risk.status}
                      </Badge>
                      <div className="flex gap-1 text-xs text-muted-foreground">
                        <span>L: {risk.likelihood}</span>
                        <span>•</span>
                        <span>I: {risk.impact}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </TabsContent>

      <TabsContent value="issues" className="space-y-3">
        <div className="flex justify-end">
          {onAddIssue && (
            <Button variant="outline" size="sm" onClick={onAddIssue} className="gap-1">
              <Plus className="h-4 w-4" />
              Add Issue
            </Button>
          )}
        </div>
        
        {issues.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Circle className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No issues logged yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {issues.map((issue, idx) => (
              <Card
                key={issue.id}
                className={cn(
                  "cursor-pointer transition-all hover:shadow-md border-border/50",
                  "animate-in fade-in slide-in-from-bottom-2"
                )}
                style={{ animationDelay: `${idx * 50}ms` }}
                onClick={() => onEditIssue?.(issue)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium">{issue.title}</h4>
                        <Badge variant="outline" className={cn("text-xs", priorityColors[issue.priority])}>
                          {issue.priority}
                        </Badge>
                      </div>
                      {issue.description && (
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {issue.description}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant="outline" className={cn("text-xs", issueStatusColors[issue.status])}>
                        {issue.status}
                      </Badge>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {format(new Date(issue.raised_date), "MMM d")}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}
