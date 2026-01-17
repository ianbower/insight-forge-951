import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  ClipboardList,
  Send,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ScaleConfig {
  min: number;
  max: number;
  labels: Record<number, string>;
  descriptions: Record<number, string>;
}

interface Question {
  id: string;
  question_text: string;
  question_type: string;
  scale_config?: ScaleConfig;
  options?: string[];
  required: boolean;
  dimension_id: string | null;
}

interface Dimension {
  id: string;
  name: string;
  description: string | null;
  questions: Question[];
}

export default function AssessmentRespond() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [recipient, setRecipient] = useState<any>(null);
  const [instance, setInstance] = useState<any>(null);
  const [dimensions, setDimensions] = useState<Dimension[]>([]);
  const [responses, setResponses] = useState<Record<string, any>>({});
  const [currentDimensionIndex, setCurrentDimensionIndex] = useState(0);

  useEffect(() => {
    if (token) {
      fetchAssessment();
    }
  }, [token]);

  const fetchAssessment = async () => {
    setLoading(true);

    // Fetch recipient by token
    const { data: recipientData, error: recipientError } = await supabase
      .from("assessment_recipients")
      .select("*, assessment_instance:assessment_instances(*)")
      .eq("token", token)
      .single();

    if (recipientError || !recipientData) {
      toast({ title: "Invalid or expired link", variant: "destructive" });
      setLoading(false);
      return;
    }

    if (recipientData.status === "completed") {
      setCompleted(true);
      setLoading(false);
      return;
    }

    setRecipient(recipientData);
    setInstance(recipientData.assessment_instance);

    const templateId = recipientData.assessment_instance.assessment_template_id;

    // Mark as started if pending
    if (recipientData.status === "pending") {
      await supabase
        .from("assessment_recipients")
        .update({ status: "started", started_at: new Date().toISOString() })
        .eq("id", recipientData.id);
    }

    // Fetch dimensions
    const { data: dimensionsData } = await supabase
      .from("assessment_dimensions")
      .select("*")
      .eq("assessment_template_id", templateId)
      .order("order_index");

    // Fetch questions
    const { data: questionsData } = await supabase
      .from("assessment_questions")
      .select("*")
      .eq("assessment_template_id", templateId)
      .order("order_index");

    // Fetch existing responses
    const { data: existingResponses } = await supabase
      .from("assessment_responses")
      .select("*")
      .eq("assessment_instance_id", recipientData.assessment_instance.id)
      .eq("recipient_id", recipientData.id);

    // Build responses map
    const responsesMap: Record<string, any> = {};
    (existingResponses || []).forEach((r) => {
      responsesMap[r.question_id] = r.response_value;
    });
    setResponses(responsesMap);

    // Build dimensions with questions
    const dims: Dimension[] = (dimensionsData || []).map((d) => ({
      id: d.id,
      name: d.name,
      description: d.description,
      questions: (questionsData || [])
        .filter((q) => q.dimension_id === d.id)
        .map((q) => ({
          id: q.id,
          question_text: q.question_text,
          question_type: q.question_type,
          scale_config: q.scale_config as unknown as ScaleConfig | undefined,
          options: q.options as unknown as string[] | undefined,
          required: q.required,
          dimension_id: q.dimension_id,
        })),
    }));

    // Add uncategorized questions
    const uncategorizedQuestions = (questionsData || [])
      .filter((q) => !q.dimension_id)
      .map((q) => ({
        id: q.id,
        question_text: q.question_text,
        question_type: q.question_type,
        scale_config: q.scale_config as unknown as ScaleConfig | undefined,
        options: q.options as unknown as string[] | undefined,
        required: q.required,
        dimension_id: null,
      }));

    if (uncategorizedQuestions.length > 0) {
      dims.unshift({
        id: "general",
        name: "General Questions",
        description: null,
        questions: uncategorizedQuestions,
      });
    }

    setDimensions(dims);
    setLoading(false);
  };

  const handleResponse = async (questionId: string, value: any) => {
    setResponses((prev) => ({ ...prev, [questionId]: value }));

    // Save response to database
    const { error } = await supabase.from("assessment_responses").upsert(
      {
        assessment_instance_id: instance.id,
        recipient_id: recipient.id,
        question_id: questionId,
        response_value: value,
      },
      { onConflict: "assessment_instance_id,recipient_id,question_id" }
    );

    if (error) {
      console.error("Error saving response:", error);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);

    // Mark as completed
    const { error } = await supabase
      .from("assessment_recipients")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", recipient.id);

    if (error) {
      toast({ title: "Error submitting", description: error.message, variant: "destructive" });
    } else {
      setCompleted(true);
      toast({ title: "Assessment submitted successfully!" });
    }

    setSubmitting(false);
  };

  const currentDimension = dimensions[currentDimensionIndex];
  const totalQuestions = dimensions.reduce((sum, d) => sum + d.questions.length, 0);
  const answeredQuestions = Object.keys(responses).length;
  const progress = totalQuestions > 0 ? (answeredQuestions / totalQuestions) * 100 : 0;

  const canGoNext = currentDimension?.questions.every((q) => !q.required || responses[q.id] !== undefined);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading assessment...</p>
      </div>
    );
  }

  if (completed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-12 pb-8">
            <CheckCircle2 className="h-16 w-16 mx-auto mb-6 text-emerald-500" />
            <h1 className="text-2xl font-bold mb-2">Thank You!</h1>
            <p className="text-muted-foreground">
              Your responses have been submitted successfully. You can close this page now.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!instance || dimensions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-12 pb-8">
            <ClipboardList className="h-16 w-16 mx-auto mb-6 text-muted-foreground/50" />
            <h1 className="text-2xl font-bold mb-2">Assessment Not Available</h1>
            <p className="text-muted-foreground">
              This assessment is not currently available or has no questions configured.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <h1 className="text-xl font-semibold">{instance.name}</h1>
          {instance.description && (
            <p className="text-sm text-muted-foreground mt-1">{instance.description}</p>
          )}
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
              <span>Progress</span>
              <span>{Math.round(progress)}% complete</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Dimension Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline">
              Section {currentDimensionIndex + 1} of {dimensions.length}
            </Badge>
          </div>
          <h2 className="text-lg font-semibold">{currentDimension.name}</h2>
          {currentDimension.description && (
            <p className="text-sm text-muted-foreground mt-1">{currentDimension.description}</p>
          )}
        </div>

        {/* Questions */}
        <div className="space-y-6">
          {currentDimension.questions.map((question, qIndex) => (
            <Card key={question.id} className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-start gap-2">
                  <span className="text-muted-foreground font-normal">{qIndex + 1}.</span>
                  <span>{question.question_text}</span>
                  {question.required && <span className="text-destructive">*</span>}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {question.question_type === "likert" && question.scale_config && (
                  <RadioGroup
                    value={responses[question.id]?.toString() || ""}
                    onValueChange={(value) => handleResponse(question.id, Number(value))}
                    className="space-y-3"
                  >
                    {Array.from(
                      { length: question.scale_config.max - question.scale_config.min + 1 },
                      (_, i) => question.scale_config!.min + i
                    ).map((level) => (
                      <div key={level} className="flex items-start space-x-3">
                        <RadioGroupItem value={level.toString()} id={`${question.id}-${level}`} />
                        <div className="flex-1">
                          <Label
                            htmlFor={`${question.id}-${level}`}
                            className="font-medium cursor-pointer"
                          >
                            {level} - {question.scale_config!.labels?.[level] || `Level ${level}`}
                          </Label>
                          {question.scale_config!.descriptions?.[level] && (
                            <p className="text-sm text-muted-foreground mt-0.5">
                              {question.scale_config!.descriptions[level]}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </RadioGroup>
                )}

                {question.question_type === "multiple_choice" && question.options && (
                  <RadioGroup
                    value={responses[question.id] || ""}
                    onValueChange={(value) => handleResponse(question.id, value)}
                    className="space-y-2"
                  >
                    {question.options.map((option, oIndex) => (
                      <div key={oIndex} className="flex items-center space-x-3">
                        <RadioGroupItem value={option} id={`${question.id}-${oIndex}`} />
                        <Label htmlFor={`${question.id}-${oIndex}`} className="cursor-pointer">
                          {option}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                )}

                {question.question_type === "text" && (
                  <Textarea
                    value={responses[question.id] || ""}
                    onChange={(e) => handleResponse(question.id, e.target.value)}
                    placeholder="Enter your response..."
                    className="min-h-[100px]"
                  />
                )}

                {question.question_type === "numeric" && (
                  <Input
                    type="number"
                    value={responses[question.id] || ""}
                    onChange={(e) => handleResponse(question.id, Number(e.target.value))}
                    placeholder="Enter a number..."
                    className="max-w-[200px]"
                  />
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t">
          <Button
            variant="outline"
            onClick={() => setCurrentDimensionIndex((prev) => prev - 1)}
            disabled={currentDimensionIndex === 0}
            className="gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>

          {currentDimensionIndex < dimensions.length - 1 ? (
            <Button
              onClick={() => setCurrentDimensionIndex((prev) => prev + 1)}
              disabled={!canGoNext}
              className="gap-2"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={submitting || !canGoNext}
              className="gap-2"
            >
              <Send className="h-4 w-4" />
              {submitting ? "Submitting..." : "Submit Assessment"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
