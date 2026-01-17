import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, FileText, Target, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface AssessmentInsightsProps {
  instanceId: string;
  instanceName: string;
}

interface InsightResult {
  content: string;
  summary: {
    name: string;
    overallScore: string;
    responseCount: number;
  };
}

export function AssessmentInsights({ instanceId, instanceName }: AssessmentInsightsProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);
  const [insights, setInsights] = useState<InsightResult | null>(null);
  const [summary, setSummary] = useState<InsightResult | null>(null);
  const [recommendations, setRecommendations] = useState<InsightResult | null>(null);

  const fetchInsight = async (action: "insights" | "summary" | "recommendations") => {
    setLoading(action);

    try {
      const { data, error } = await supabase.functions.invoke("assessment-insights", {
        body: { instanceId, action },
      });

      if (error) throw error;

      if (action === "insights") {
        setInsights(data);
      } else if (action === "summary") {
        setSummary(data);
      } else {
        setRecommendations(data);
      }
    } catch (error) {
      console.error("Error fetching insights:", error);
      toast({
        title: "Error generating insights",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  const renderContent = (content: string | undefined) => {
    if (!content) return null;
    
    // Simple markdown-like rendering
    const lines = content.split("\n");
    return (
      <div className="prose prose-sm dark:prose-invert max-w-none">
        {lines.map((line, i) => {
          if (line.startsWith("# ")) {
            return <h1 key={i} className="text-xl font-bold mt-4 mb-2">{line.slice(2)}</h1>;
          }
          if (line.startsWith("## ")) {
            return <h2 key={i} className="text-lg font-semibold mt-3 mb-2">{line.slice(3)}</h2>;
          }
          if (line.startsWith("### ")) {
            return <h3 key={i} className="text-base font-medium mt-2 mb-1">{line.slice(4)}</h3>;
          }
          if (line.startsWith("- ") || line.startsWith("* ")) {
            return (
              <div key={i} className="flex gap-2 my-1">
                <span className="text-primary">•</span>
                <span>{line.slice(2)}</span>
              </div>
            );
          }
          if (line.match(/^\d+\.\s/)) {
            return (
              <div key={i} className="flex gap-2 my-1">
                <span className="text-primary font-medium">{line.match(/^\d+/)?.[0]}.</span>
                <span>{line.replace(/^\d+\.\s/, "")}</span>
              </div>
            );
          }
          if (line.startsWith("**") && line.endsWith("**")) {
            return <p key={i} className="font-semibold my-1">{line.slice(2, -2)}</p>;
          }
          if (line.trim() === "") {
            return <br key={i} />;
          }
          return <p key={i} className="my-1">{line}</p>;
        })}
      </div>
    );
  };

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          AI-Powered Insights
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="insights" className="space-y-4">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="insights" className="gap-2">
              <Sparkles className="h-4 w-4" />
              Insights
            </TabsTrigger>
            <TabsTrigger value="summary" className="gap-2">
              <FileText className="h-4 w-4" />
              Summary
            </TabsTrigger>
            <TabsTrigger value="recommendations" className="gap-2">
              <Target className="h-4 w-4" />
              Roadmap
            </TabsTrigger>
          </TabsList>

          <TabsContent value="insights" className="space-y-4">
            {!insights ? (
              <div className="text-center py-8">
                <Sparkles className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-muted-foreground mb-4">
                  Generate AI-powered insights from your assessment results
                </p>
                <Button
                  onClick={() => fetchInsight("insights")}
                  disabled={loading === "insights"}
                  className="gap-2"
                >
                  {loading === "insights" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  Generate Insights
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchInsight("insights")}
                    disabled={loading === "insights"}
                    className="gap-2"
                  >
                    {loading === "insights" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                    Regenerate
                  </Button>
                </div>
                {renderContent(insights.content)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="summary" className="space-y-4">
            {!summary ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-muted-foreground mb-4">
                  Create an executive summary for leadership review
                </p>
                <Button
                  onClick={() => fetchInsight("summary")}
                  disabled={loading === "summary"}
                  className="gap-2"
                >
                  {loading === "summary" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <FileText className="h-4 w-4" />
                  )}
                  Generate Summary
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchInsight("summary")}
                    disabled={loading === "summary"}
                    className="gap-2"
                  >
                    {loading === "summary" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <FileText className="h-4 w-4" />
                    )}
                    Regenerate
                  </Button>
                </div>
                {renderContent(summary.content)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="recommendations" className="space-y-4">
            {!recommendations ? (
              <div className="text-center py-8">
                <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-muted-foreground mb-4">
                  Generate a prioritized improvement roadmap
                </p>
                <Button
                  onClick={() => fetchInsight("recommendations")}
                  disabled={loading === "recommendations"}
                  className="gap-2"
                >
                  {loading === "recommendations" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Target className="h-4 w-4" />
                  )}
                  Generate Roadmap
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchInsight("recommendations")}
                    disabled={loading === "recommendations"}
                    className="gap-2"
                  >
                    {loading === "recommendations" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Target className="h-4 w-4" />
                    )}
                    Regenerate
                  </Button>
                </div>
                {renderContent(recommendations.content)}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
