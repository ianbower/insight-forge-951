import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, FileText, Target, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

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
    
    return (
      <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0 prose-headings:my-2 prose-table:border-collapse prose-th:border prose-th:border-border prose-th:px-3 prose-th:py-2 prose-th:bg-muted prose-td:border prose-td:border-border prose-td:px-3 prose-td:py-2 prose-hr:my-4">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
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
