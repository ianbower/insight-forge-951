import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  ClipboardList,
  Search,
  Play,
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronRight,
  Mail,
  Link,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AssignedAssessment {
  id: string;
  email: string;
  name: string | null;
  status: string;
  token: string;
  invited_at: string;
  started_at: string | null;
  completed_at: string | null;
  assessment_instance: {
    id: string;
    name: string;
    description: string | null;
    status: string;
    assessment_template: {
      id: string;
      name: string;
      category: string;
    } | null;
  };
  _progress?: {
    answered: number;
    total: number;
    percentage: number;
  };
}

const statusConfig = {
  pending: {
    label: "Not Started",
    color: "bg-slate-500/10 text-slate-500",
    icon: AlertCircle,
  },
  started: {
    label: "In Progress",
    color: "bg-amber-500/10 text-amber-500",
    icon: Clock,
  },
  completed: {
    label: "Completed",
    color: "bg-emerald-500/10 text-emerald-500",
    icon: CheckCircle2,
  },
};

const categoryColors: Record<string, string> = {
  maturity: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  readiness: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  capability: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  culture: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  general: "bg-slate-500/10 text-slate-500 border-slate-500/20",
};

interface MyAssessmentsProps {
  userEmail?: string;
  onTakeAssessment?: (token: string) => void;
}

export function MyAssessments({ userEmail, onTakeAssessment }: MyAssessmentsProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [assessments, setAssessments] = useState<AssignedAssessment[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [emailFilter, setEmailFilter] = useState(userEmail || "");

  useEffect(() => {
    if (emailFilter) {
      fetchAssessments();
    } else {
      setLoading(false);
    }
  }, [emailFilter]);

  const fetchAssessments = async () => {
    setLoading(true);

    // Fetch all recipients matching the email
    const { data: recipients, error } = await supabase
      .from("assessment_recipients")
      .select(`
        *,
        assessment_instance:assessment_instances(
          id,
          name,
          description,
          status,
          assessment_template:assessment_templates(
            id,
            name,
            category
          )
        )
      `)
      .eq("email", emailFilter.toLowerCase())
      .order("invited_at", { ascending: false });

    if (error) {
      toast({ title: "Error fetching assessments", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    // Fetch progress for each assessment
    const assessmentsWithProgress = await Promise.all(
      (recipients || []).map(async (recipient) => {
        // Get total questions for this template
        const templateId = recipient.assessment_instance?.assessment_template?.id;
        if (!templateId) return { ...recipient, _progress: undefined };

        const { count: totalQuestions } = await supabase
          .from("assessment_questions")
          .select("*", { count: "exact", head: true })
          .eq("assessment_template_id", templateId);

        // Get answered questions for this recipient
        const { count: answeredQuestions } = await supabase
          .from("assessment_responses")
          .select("*", { count: "exact", head: true })
          .eq("assessment_instance_id", recipient.assessment_instance?.id)
          .eq("recipient_id", recipient.id);

        const total = totalQuestions || 0;
        const answered = answeredQuestions || 0;
        const percentage = total > 0 ? (answered / total) * 100 : 0;

        return {
          ...recipient,
          _progress: { answered, total, percentage },
        };
      })
    );

    setAssessments(assessmentsWithProgress as AssignedAssessment[]);
    setLoading(false);
  };

  const handleLookup = () => {
    if (emailFilter.includes("@")) {
      fetchAssessments();
    } else {
      toast({ title: "Please enter a valid email", variant: "destructive" });
    }
  };

  const handleTakeAssessment = (token: string) => {
    if (onTakeAssessment) {
      onTakeAssessment(token);
    } else {
      // Navigate to in-app assessment page
      navigate(`/assessments/take/${token}`);
    }
  };

  const copyLink = (token: string) => {
    const url = `${window.location.origin}/assess/${token}`;
    navigator.clipboard.writeText(url);
    toast({ title: "Link copied to clipboard" });
  };

  const filteredAssessments = assessments.filter((a) => {
    const name = a.assessment_instance?.name?.toLowerCase() || "";
    const templateName = a.assessment_instance?.assessment_template?.name?.toLowerCase() || "";
    return name.includes(searchQuery.toLowerCase()) || templateName.includes(searchQuery.toLowerCase());
  });

  const pendingAssessments = filteredAssessments.filter((a) => a.status === "pending" || a.status === "started");
  const completedAssessments = filteredAssessments.filter((a) => a.status === "completed");

  if (!emailFilter) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center">
          <Mail className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
          <p className="text-lg font-medium text-muted-foreground">Find Your Assessments</p>
          <p className="text-sm text-muted-foreground mt-1 mb-6">
            Enter your email to see assessments assigned to you
          </p>
          <div className="flex items-center gap-2 max-w-md mx-auto">
            <Input
              type="email"
              placeholder="your.email@company.com"
              value={emailFilter}
              onChange={(e) => setEmailFilter(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLookup()}
            />
            <Button onClick={handleLookup}>Look Up</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading your assessments...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Email and Search */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted text-sm">
          <Mail className="h-4 w-4 text-muted-foreground" />
          <span>{emailFilter}</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={() => setEmailFilter("")}
          >
            Change
          </Button>
        </div>
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search assessments..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="outline" onClick={fetchAssessments}>
          Refresh
        </Button>
      </div>

      {/* Pending/In Progress Assessments */}
      {pendingAssessments.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Pending ({pendingAssessments.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pendingAssessments.map((assessment) => {
              const status = statusConfig[assessment.status as keyof typeof statusConfig] || statusConfig.pending;
              const StatusIcon = status.icon;
              const category = assessment.assessment_instance?.assessment_template?.category || "general";

              return (
                <Card key={assessment.id} className="border-border hover:border-primary/50 transition-colors">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <Badge
                        variant="outline"
                        className={cn("capitalize", categoryColors[category])}
                      >
                        {category}
                      </Badge>
                      <Badge variant="outline" className={cn(status.color)}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {status.label}
                      </Badge>
                    </div>
                    <CardTitle className="text-lg mt-2">
                      {assessment.assessment_instance?.name}
                    </CardTitle>
                    {assessment.assessment_instance?.description && (
                      <CardDescription className="line-clamp-2">
                        {assessment.assessment_instance.description}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {assessment._progress && assessment._progress.total > 0 && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Progress</span>
                          <span>
                            {assessment._progress.answered} / {assessment._progress.total} questions
                          </span>
                        </div>
                        <Progress value={assessment._progress.percentage} className="h-2" />
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Button
                        className="flex-1 gap-2"
                        onClick={() => handleTakeAssessment(assessment.token)}
                      >
                        <Play className="h-4 w-4" />
                        {assessment.status === "started" ? "Continue" : "Start"}
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => copyLink(assessment.token)}
                        title="Copy secure link"
                      >
                        <Link className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Completed Assessments */}
      {completedAssessments.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Completed ({completedAssessments.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {completedAssessments.map((assessment) => {
              const category = assessment.assessment_instance?.assessment_template?.category || "general";

              return (
                <Card key={assessment.id} className="border-border bg-muted/30">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <Badge
                        variant="outline"
                        className={cn("capitalize opacity-60", categoryColors[category])}
                      >
                        {category}
                      </Badge>
                      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Completed
                      </Badge>
                    </div>
                    <CardTitle className="text-lg mt-2">
                      {assessment.assessment_instance?.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>
                        Submitted {assessment.completed_at
                          ? new Date(assessment.completed_at).toLocaleDateString()
                          : "N/A"}
                      </span>
                      <Button variant="ghost" size="sm" className="gap-1">
                        View <ChevronRight className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty State */}
      {filteredAssessments.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <ClipboardList className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-lg font-medium text-muted-foreground">No assessments found</p>
            <p className="text-sm text-muted-foreground mt-1">
              {searchQuery
                ? "Try a different search term"
                : "No assessments have been assigned to this email yet"}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
