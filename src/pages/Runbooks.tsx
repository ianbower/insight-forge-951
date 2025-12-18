import { useEffect, useState } from "react";
import { BookOpen, Play, Clock, CheckCircle2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface RunbookTemplate {
  id: string;
  name: string;
  industry_focus: string | null;
  workflow_json: any;
}

const mockRunbooks: RunbookTemplate[] = [
  {
    id: "1",
    name: "Digital Transformation Strategy",
    industry_focus: "Cross-Industry",
    workflow_json: [
      { step: 1, title: "Current State Assessment", tools: ["SWOT", "Operating Model Canvas"] },
      { step: 2, title: "Vision & Strategy Definition", tools: ["Business Model Canvas"] },
      { step: 3, title: "Roadmap Development", tools: ["Transformation Roadmap"] },
      { step: 4, title: "Implementation Planning", tools: ["7S Framework"] },
    ],
  },
  {
    id: "2",
    name: "Post-Merger Integration",
    industry_focus: "Financial Services",
    workflow_json: [
      { step: 1, title: "Due Diligence Review", tools: ["SWOT"] },
      { step: 2, title: "Synergy Identification", tools: ["Operating Model Canvas"] },
      { step: 3, title: "Integration Roadmap", tools: ["Transformation Roadmap"] },
      { step: 4, title: "Day 1 Planning", tools: ["7S Framework"] },
    ],
  },
  {
    id: "3",
    name: "Operating Model Redesign",
    industry_focus: "Technology",
    workflow_json: [
      { step: 1, title: "As-Is Analysis", tools: ["Operating Model Canvas", "7S Framework"] },
      { step: 2, title: "Target State Design", tools: ["Operating Model Canvas"] },
      { step: 3, title: "Gap Analysis", tools: ["SWOT"] },
      { step: 4, title: "Transition Planning", tools: ["Transformation Roadmap"] },
    ],
  },
  {
    id: "4",
    name: "Market Entry Strategy",
    industry_focus: "Cross-Industry",
    workflow_json: [
      { step: 1, title: "Market Analysis", tools: ["SWOT", "Porter's Five Forces"] },
      { step: 2, title: "Business Model Design", tools: ["Business Model Canvas"] },
      { step: 3, title: "Go-to-Market Planning", tools: ["Transformation Roadmap"] },
    ],
  },
];

export default function Runbooks() {
  const [runbooks, setRunbooks] = useState<RunbookTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRunbook, setExpandedRunbook] = useState<string | null>(null);

  useEffect(() => {
    const fetchRunbooks = async () => {
      try {
        const { data, error } = await supabase
          .from("runbook_templates")
          .select("*")
          .order("name");

        if (error) throw error;
        setRunbooks(data || []);
      } catch (error) {
        console.error("Error fetching runbooks:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRunbooks();
  }, []);

  const displayRunbooks = runbooks.length > 0 ? runbooks : mockRunbooks;

  const handleStartEngagement = (runbook: RunbookTemplate) => {
    console.log("Starting engagement with runbook:", runbook.name);
    // This would create a new project with the runbook template
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-display font-semibold text-foreground">
          Runbooks
        </h1>
        <p className="text-muted-foreground mt-1">
          Pre-built engagement templates with proven methodologies
        </p>
      </div>

      {/* Runbooks Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {displayRunbooks.map((runbook, index) => {
          const workflow = Array.isArray(runbook.workflow_json)
            ? runbook.workflow_json
            : [];
          const isExpanded = expandedRunbook === runbook.id;

          return (
            <div
              key={runbook.id}
              className="group rounded-xl border border-border bg-card overflow-hidden transition-all duration-300 hover:shadow-card-lg animate-slide-up"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {/* Header */}
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                      <BookOpen className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold font-display">{runbook.name}</h3>
                      <Badge variant="secondary" className="mt-1 text-xs">
                        {runbook.industry_focus || "Cross-Industry"}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    {workflow.length} steps
                  </div>
                </div>

                {/* Workflow Preview */}
                <div className="mt-6">
                  <button
                    onClick={() =>
                      setExpandedRunbook(isExpanded ? null : runbook.id)
                    }
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    {isExpanded ? "Hide workflow" : "View workflow"}
                  </button>

                  {isExpanded && (
                    <div className="mt-4 space-y-3 animate-fade-in">
                      {workflow.map((step: any, stepIndex: number) => (
                        <div
                          key={stepIndex}
                          className="flex items-start gap-3 rounded-lg bg-muted/50 p-3"
                        >
                          <div
                            className={cn(
                              "flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold",
                              "bg-primary text-primary-foreground"
                            )}
                          >
                            {step.step}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-sm">{step.title}</p>
                            <div className="mt-1 flex flex-wrap gap-1">
                              {step.tools?.map((tool: string) => (
                                <Badge
                                  key={tool}
                                  variant="outline"
                                  className="text-xs"
                                >
                                  {tool}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="border-t border-border bg-muted/30 px-6 py-4">
                <Button
                  onClick={() => handleStartEngagement(runbook)}
                  className="w-full gap-2"
                >
                  <Play className="h-4 w-4" />
                  Start Engagement
                  <ArrowRight className="h-4 w-4 ml-auto" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
