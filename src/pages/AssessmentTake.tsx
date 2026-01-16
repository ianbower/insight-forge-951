import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  ClipboardCheck,
  ChevronLeft,
  ChevronRight,
  Check,
  AlertCircle,
  ArrowLeft,
  Eye,
  Send,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Question {
  id: string;
  dimension_id: string | null;
  question_text: string;
  question_type: string;
  weight: number;
  order_index: number;
  scale_config: {
    min: number;
    max: number;
    labels: Record<string, string>;
    descriptions: Record<string, string>;
  } | null;
  required: boolean;
}

interface Dimension {
  id: string;
  name: string;
  description: string | null;
  order_index: number;
}

interface Response {
  question_id: string;
  response_value: number | string;
  notes?: string;
}

export default function AssessmentTake() {
  const { assessmentId, instanceId } = useParams<{ assessmentId: string; instanceId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const isTestMode = searchParams.get("mode") === "test";

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [instanceName, setInstanceName] = useState("");
  const [instanceDescription, setInstanceDescription] = useState("");
  const [templateName, setTemplateName] = useState("");

  const [dimensions, setDimensions] = useState<Dimension[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [responses, setResponses] = useState<Record<string, Response>>({});

  const [currentDimensionIndex, setCurrentDimensionIndex] = useState(0);

  // Respondent info (for non-test mode)
  const [showRespondentForm, setShowRespondentForm] = useState(true);
  const [recipientId, setRecipientId] = useState<string | null>(null);
  const [respondentInfo, setRespondentInfo] = useState({
    name: "",
    email: "",
    organization: "",
    role: "",
    industry: "Technology",
  });

  useEffect(() => {
    fetchAssessment();
  }, [instanceId]);

  const fetchAssessment = async () => {
    setLoading(true);

    // Fetch instance
    const { data: instanceData, error: instanceError } = await supabase
      .from("assessment_instances")
      .select("*, assessment_templates(*)")
      .eq("id", instanceId)
      .single();

    if (instanceError || !instanceData) {
      setError("Assessment not found");
      setLoading(false);
      return;
    }

    // Check if active or in test mode
    if (instanceData.status !== "active" && !isTestMode) {
      setError("This assessment is not currently active");
      setLoading(false);
      return;
    }

    const template = instanceData.assessment_templates as any;
    setInstanceName(instanceData.name);
    setInstanceDescription(instanceData.description || "");
    setTemplateName(template?.name || "");

    // Fetch dimensions
    const { data: dimensionsData } = await supabase
      .from("assessment_dimensions")
      .select("*")
      .eq("assessment_template_id", template.id)
      .order("order_index");

    setDimensions(dimensionsData || []);

    // Fetch questions
    const { data: questionsData } = await supabase
      .from("assessment_questions")
      .select("*")
      .eq("assessment_template_id", template.id)
      .order("order_index");

    const formattedQuestions = (questionsData || []).map((q: any) => ({
      ...q,
      weight: Number(q.weight),
      scale_config: q.scale_config as Question["scale_config"],
    }));

    setQuestions(formattedQuestions);

    // In test mode, skip respondent form
    if (isTestMode) {
      setShowRespondentForm(false);
    }

    setLoading(false);
  };

  const handleStartAssessment = async () => {
    if (!isTestMode && !respondentInfo.email) {
      toast({ title: "Email is required", variant: "destructive" });
      return;
    }

    // Create or find recipient
    if (!isTestMode) {
      // Check if already exists
      const { data: existingRecipient } = await supabase
        .from("assessment_recipients")
        .select("*")
        .eq("assessment_instance_id", instanceId)
        .eq("email", respondentInfo.email)
        .maybeSingle();

      if (existingRecipient) {
        if (existingRecipient.status === "completed") {
          setSubmitted(true);
          return;
        }
        setRecipientId(existingRecipient.id);

        // Load existing responses
        const { data: existingResponses } = await supabase
          .from("assessment_responses")
          .select("*")
          .eq("assessment_instance_id", instanceId)
          .eq("recipient_id", existingRecipient.id);

        const responsesMap: Record<string, Response> = {};
        (existingResponses || []).forEach((r: any) => {
          responsesMap[r.question_id] = {
            question_id: r.question_id,
            response_value: r.response_value,
            notes: r.notes,
          };
        });
        setResponses(responsesMap);
      } else {
        // Create new recipient
        const { data: newRecipient, error: recipientError } = await supabase
          .from("assessment_recipients")
          .insert({
            assessment_instance_id: instanceId,
            email: respondentInfo.email,
            name: respondentInfo.name || null,
            organization: respondentInfo.organization || null,
            role: respondentInfo.role || null,
            industry: respondentInfo.industry || null,
            status: "started",
            started_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (recipientError) {
          toast({ title: "Error starting assessment", variant: "destructive" });
          return;
        }

        setRecipientId(newRecipient.id);
      }
    }

    setShowRespondentForm(false);
  };

  const getCurrentQuestions = () => {
    if (dimensions.length === 0) {
      return questions;
    }
    const currentDimension = dimensions[currentDimensionIndex];
    return questions.filter((q) => q.dimension_id === currentDimension?.id);
  };

  const handleResponseChange = (questionId: string, value: number | string) => {
    setResponses({
      ...responses,
      [questionId]: {
        question_id: questionId,
        response_value: value,
        notes: responses[questionId]?.notes,
      },
    });
  };

  const handleNotesChange = (questionId: string, notes: string) => {
    setResponses({
      ...responses,
      [questionId]: {
        ...responses[questionId],
        question_id: questionId,
        notes,
      },
    });
  };

  const saveCurrentResponses = async () => {
    if (isTestMode || !recipientId) return;

    const currentQuestions = getCurrentQuestions();
    const responsesToSave = currentQuestions
      .filter((q) => responses[q.id]?.response_value !== undefined)
      .map((q) => ({
        assessment_instance_id: instanceId,
        recipient_id: recipientId,
        question_id: q.id,
        response_value: responses[q.id].response_value,
        notes: responses[q.id].notes || null,
      }));

    if (responsesToSave.length > 0) {
      for (const response of responsesToSave) {
        await supabase.from("assessment_responses").upsert(response, {
          onConflict: "assessment_instance_id,recipient_id,question_id",
        });
      }
    }
  };

  const handleNext = async () => {
    await saveCurrentResponses();
    if (currentDimensionIndex < dimensions.length - 1) {
      setCurrentDimensionIndex(currentDimensionIndex + 1);
      window.scrollTo(0, 0);
    }
  };

  const handlePrevious = () => {
    if (currentDimensionIndex > 0) {
      setCurrentDimensionIndex(currentDimensionIndex - 1);
      window.scrollTo(0, 0);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);

    if (isTestMode) {
      toast({ title: "Test completed!", description: "In test mode, responses are not saved." });
      navigate(`/assessments/${assessmentId}/launch/${instanceId}`);
      setSubmitting(false);
      return;
    }

    await saveCurrentResponses();

    // Mark as completed
    await supabase
      .from("assessment_recipients")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", recipientId);

    setSubmitted(true);
    setSubmitting(false);
    toast({ title: "Assessment submitted successfully!" });
  };

  const answeredCount = Object.keys(responses).filter(
    (k) => responses[k]?.response_value !== undefined
  ).length;
  const totalQuestions = questions.length;
  const progressPercent = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;

  const isLastSection = currentDimensionIndex === dimensions.length - 1 || dimensions.length === 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Loading assessment...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Error</h2>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <div className="h-16 w-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
              <Check className="h-8 w-8 text-emerald-500" />
            </div>
            <h2 className="text-xl font-bold mb-2">Thank You!</h2>
            <p className="text-muted-foreground mb-6">
              Your assessment has been submitted successfully.
            </p>
            <Button onClick={() => navigate(`/assessments/${assessmentId}/launch/${instanceId}`)}>
              Back to Assessment
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Respondent info form
  if (showRespondentForm && !isTestMode) {
    return (
      <div className="p-6 max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <ClipboardCheck className="h-5 w-5 text-primary" />
              <Badge variant="secondary">Assessment</Badge>
            </div>
            <CardTitle>{instanceName}</CardTitle>
            <CardDescription>{instanceDescription || templateName}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input
                type="email"
                value={respondentInfo.email}
                onChange={(e) => setRespondentInfo({ ...respondentInfo, email: e.target.value })}
                placeholder="your@email.com"
              />
            </div>

            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={respondentInfo.name}
                onChange={(e) => setRespondentInfo({ ...respondentInfo, name: e.target.value })}
                placeholder="Your name"
              />
            </div>

            <div className="space-y-2">
              <Label>Organization</Label>
              <Input
                value={respondentInfo.organization}
                onChange={(e) => setRespondentInfo({ ...respondentInfo, organization: e.target.value })}
                placeholder="Company or organization"
              />
            </div>

            <div className="space-y-2">
              <Label>Role</Label>
              <Input
                value={respondentInfo.role}
                onChange={(e) => setRespondentInfo({ ...respondentInfo, role: e.target.value })}
                placeholder="Your role or title"
              />
            </div>

            <Button onClick={handleStartAssessment} className="w-full gap-2">
              <Send className="h-4 w-4" />
              Start Assessment
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentDimension = dimensions[currentDimensionIndex];
  const currentQuestions = getCurrentQuestions();

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate(`/assessments/${assessmentId}/launch/${instanceId}`)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold">{instanceName}</h1>
              {isTestMode && (
                <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 border-amber-500/20">
                  <Eye className="h-3 w-3 mr-1" />
                  Test Mode
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{templateName}</p>
          </div>
        </div>
        <Badge variant="outline">
          {answeredCount}/{totalQuestions} answered
        </Badge>
      </div>

      <Progress value={progressPercent} className="h-2" />

      {/* Dimension Header */}
      {currentDimension && (
        <Card className="bg-muted/30">
          <CardContent className="pt-6">
            <Badge variant="secondary" className="mb-2">
              Section {currentDimensionIndex + 1} of {dimensions.length}
            </Badge>
            <h2 className="text-xl font-bold">{currentDimension.name}</h2>
            {currentDimension.description && (
              <p className="text-muted-foreground mt-1">{currentDimension.description}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Questions */}
      <div className="space-y-4">
        {currentQuestions.map((question, idx) => (
          <Card key={question.id}>
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <span className="text-sm font-medium text-muted-foreground min-w-[24px]">
                  {idx + 1}.
                </span>
                <div className="flex-1 space-y-4">
                  <p className="font-medium">
                    {question.question_text}
                    {question.required && <span className="text-destructive ml-1">*</span>}
                  </p>

                  {question.question_type === "likert" && question.scale_config && (
                    <RadioGroup
                      value={responses[question.id]?.response_value?.toString() || ""}
                      onValueChange={(value) =>
                        handleResponseChange(question.id, parseInt(value))
                      }
                      className="space-y-2"
                    >
                      {Object.entries(question.scale_config.labels).map(([key, label]) => (
                        <div
                          key={key}
                          className={cn(
                            "flex items-start gap-3 p-3 rounded-lg border transition-colors",
                            responses[question.id]?.response_value?.toString() === key
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-primary/50"
                          )}
                        >
                          <RadioGroupItem value={key} id={`${question.id}-${key}`} />
                          <Label
                            htmlFor={`${question.id}-${key}`}
                            className="flex-1 cursor-pointer"
                          >
                            <span className="font-medium">
                              {key}. {label as string}
                            </span>
                            {question.scale_config?.descriptions?.[key] && (
                              <p className="text-sm text-muted-foreground mt-0.5">
                                {question.scale_config.descriptions[key]}
                              </p>
                            )}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  )}

                  {question.question_type === "text" && (
                    <Textarea
                      value={(responses[question.id]?.response_value as string) || ""}
                      onChange={(e) => handleResponseChange(question.id, e.target.value)}
                      placeholder="Enter your response..."
                      rows={3}
                    />
                  )}

                  {question.question_type === "numeric" && (
                    <Input
                      type="number"
                      value={(responses[question.id]?.response_value as number) || ""}
                      onChange={(e) =>
                        handleResponseChange(question.id, parseFloat(e.target.value))
                      }
                      placeholder="Enter a number"
                    />
                  )}

                  <div className="pt-2">
                    <Label className="text-sm text-muted-foreground">
                      Additional notes (optional)
                    </Label>
                    <Textarea
                      value={responses[question.id]?.notes || ""}
                      onChange={(e) => handleNotesChange(question.id, e.target.value)}
                      placeholder="Add any context or comments..."
                      rows={2}
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-6 border-t">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentDimensionIndex === 0}
          className="gap-2"
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Button>

        {isLastSection ? (
          <Button onClick={handleSubmit} disabled={submitting} className="gap-2">
            {submitting ? "Submitting..." : isTestMode ? "Finish Test" : "Submit Assessment"}
            <Check className="h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={handleNext} className="gap-2">
            Next Section
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
