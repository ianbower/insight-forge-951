import { useState, useEffect, useRef } from "react";
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  ClipboardList,
  Send,
  MessageSquarePlus,
  ChevronDown,
  ListChecks,
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

interface AssessmentItem {
  id: string;
  title: string;
  description: string | null;
  order_index: number;
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
  const [items, setItems] = useState<AssessmentItem[]>([]);
  const [assessmentType, setAssessmentType] = useState("standard");
  const [responses, setResponses] = useState<Record<string, any>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [currentDimensionIndex, setCurrentDimensionIndex] = useState(0);
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const notesTimers = useRef<Record<string, NodeJS.Timeout>>({});

  const isItemBased = ["use_case", "comparative", "process"].includes(assessmentType);

  useEffect(() => {
    if (token) {
      fetchAssessment();
    }
  }, [token]);

  const fetchAssessment = async () => {
    setLoading(true);

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

    // Fetch template to get assessment_type
    const { data: templateData } = await supabase
      .from("assessment_templates")
      .select("*")
      .eq("id", templateId)
      .single();
    
    const aType = (templateData as any)?.assessment_type || "standard";
    setAssessmentType(aType);

    if (recipientData.status === "pending") {
      await supabase
        .from("assessment_recipients")
        .update({ status: "started", started_at: new Date().toISOString() })
        .eq("id", recipientData.id);
    }

    // Fetch items for item-based assessments (only in-scope)
    if (["use_case", "comparative", "process"].includes(aType)) {
      const { data: itemsData } = await supabase
        .from("assessment_items" as any)
        .select("*")
        .eq("assessment_template_id", templateId)
        .order("order_index");
      const allItems = (itemsData as any[]) || [];
      const inScopeItems = allItems.filter((i: any) => {
        const meta = i.metadata_json as Record<string, any> | null;
        return meta?.in_scope !== false; // default to in-scope
      });
      setItems(inScopeItems);
    }

    const { data: dimensionsData } = await supabase
      .from("assessment_dimensions")
      .select("*")
      .eq("assessment_template_id", templateId)
      .order("order_index");

    const { data: questionsData } = await supabase
      .from("assessment_questions")
      .select("*")
      .eq("assessment_template_id", templateId)
      .order("order_index");

    const { data: existingResponses } = await supabase
      .from("assessment_responses")
      .select("*")
      .eq("assessment_instance_id", recipientData.assessment_instance.id)
      .eq("recipient_id", recipientData.id);

    const responsesMap: Record<string, any> = {};
    const notesMap: Record<string, string> = {};
    (existingResponses || []).forEach((r) => {
      const itemId = (r as any).item_id;
      const key = itemId ? `${itemId}:${r.question_id}` : r.question_id;
      responsesMap[key] = r.response_value;
      if (r.notes) notesMap[key] = r.notes;
    });
    setResponses(responsesMap);
    setNotes(notesMap);

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

  const getResponseKey = (questionId: string) => {
    if (isItemBased && items.length > 0) {
      return `${items[currentItemIndex]?.id}:${questionId}`;
    }
    return questionId;
  };

  const handleResponse = async (questionId: string, value: any) => {
    const key = getResponseKey(questionId);
    setResponses((prev) => ({ ...prev, [key]: value }));

    const itemId = isItemBased && items.length > 0 ? items[currentItemIndex]?.id : null;

    const insertData: any = {
      assessment_instance_id: instance.id,
      recipient_id: recipient.id,
      question_id: questionId,
      response_value: value,
    };
    if (itemId) insertData.item_id = itemId;

    const { error } = await supabase.from("assessment_responses").upsert(
      insertData,
      { onConflict: "assessment_instance_id,recipient_id,question_id" }
    );

    if (error) {
      console.error("Error saving response:", error);
    }
  };

  const handleDualResponse = async (questionId: string, field: "asIs" | "toBe", value: number) => {
    const key = getResponseKey(questionId);
    const current = responses[key];
    const updated = {
      asIs: current?.asIs ?? null,
      toBe: current?.toBe ?? null,
      [field]: value,
    };
    await handleResponse(questionId, updated);
  };

  const handleNotesChange = (questionId: string, value: string) => {
    const key = getResponseKey(questionId);
    setNotes((prev) => ({ ...prev, [key]: value }));
    if (notesTimers.current[key]) clearTimeout(notesTimers.current[key]);
    notesTimers.current[key] = setTimeout(async () => {
      await supabase
        .from("assessment_responses")
        .update({ notes: value })
        .eq("assessment_instance_id", instance.id)
        .eq("recipient_id", recipient.id)
        .eq("question_id", questionId);
    }, 800);
  };

  const handleSubmit = async () => {
    setSubmitting(true);

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
  const currentItem = isItemBased ? items[currentItemIndex] : null;
  const allQuestions = dimensions.reduce((acc, d) => acc.concat(d.questions), [] as Question[]);
  const totalSlots = isItemBased ? items.length * allQuestions.length : allQuestions.length;
  const answeredSlots = Object.keys(responses).filter((key) => {
    const val = responses[key];
    if (val && typeof val === "object" && "asIs" in val) {
      return val.asIs != null && val.toBe != null;
    }
    return val !== undefined;
  }).length;
  const progress = totalSlots > 0 ? (answeredSlots / totalSlots) * 100 : 0;

  const canGoNext = isItemBased
    ? allQuestions.every((q) => {
        if (!q.required) return true;
        const key = getResponseKey(q.id);
        const val = responses[key];
        if (val && typeof val === "object" && "asIs" in val) {
          return val.asIs != null && val.toBe != null;
        }
        return val !== undefined;
      })
    : currentDimension?.questions.every((q) => {
        if (!q.required) return true;
        const key = getResponseKey(q.id);
        const val = responses[key];
        if (val && typeof val === "object" && "asIs" in val) {
          return val.asIs != null && val.toBe != null;
        }
        return val !== undefined;
      });

  const handleNext = () => {
    if (isItemBased) {
      // For item-based: navigate between items (all dimensions shown on one page)
      if (currentItemIndex < items.length - 1) {
        setCurrentItemIndex((prev) => prev + 1);
      }
    } else {
      // For standard: navigate between dimensions
      if (currentDimensionIndex < dimensions.length - 1) {
        setCurrentDimensionIndex((prev) => prev + 1);
      }
    }
  };

  const handlePrev = () => {
    if (isItemBased) {
      if (currentItemIndex > 0) {
        setCurrentItemIndex((prev) => prev - 1);
      }
    } else {
      if (currentDimensionIndex > 0) {
        setCurrentDimensionIndex((prev) => prev - 1);
      }
    }
  };

  const isFirstPage = isItemBased ? currentItemIndex === 0 : currentDimensionIndex === 0;
  const isLastPage = isItemBased
    ? currentItemIndex === items.length - 1
    : currentDimensionIndex === dimensions.length - 1;

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
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Item indicator for item-based */}
        {isItemBased && currentItem && (
          <Card className="mb-6 border-primary/30 bg-primary/5">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <ListChecks className="h-5 w-5 text-primary" />
                <div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {currentItemIndex + 1} of {items.length}
                    </Badge>
                    <span className="font-medium">{currentItem.title}</span>
                  </div>
                  {currentItem.description && (
                    <p className="text-sm text-muted-foreground mt-1">{currentItem.description}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {isItemBased ? (
          /* Item-based: show ALL dimensions on one page */
          <div className="space-y-6">
            {dimensions.map((dimension) => (
              <div key={dimension.id}>
                {dimension.questions.map((question, qIndex) => {
                  const responseKey = getResponseKey(question.id);
                  return (
                    <Card key={`${responseKey}-${qIndex}`} className="border-border">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-start gap-2">
                          <span>{dimension.name}</span>
                          {question.required && <span className="text-destructive">*</span>}
                        </CardTitle>
                        {dimension.description && (
                          <CardDescription className="text-sm">{dimension.description}</CardDescription>
                        )}
                      </CardHeader>
                      <CardContent>
                        {question.question_type === "likert" && (
                          <LikertDualScore
                            question={question}
                            value={responses[responseKey]}
                            onChange={(field, val) => handleDualResponse(question.id, field, val)}
                          />
                        )}

                        {question.question_type === "multiple_choice" && question.options && (
                          <RadioGroup
                            value={responses[responseKey] || ""}
                            onValueChange={(value) => handleResponse(question.id, value)}
                            className="space-y-2"
                          >
                            {question.options.map((option, oIndex) => (
                              <div key={oIndex} className="flex items-center space-x-3">
                                <RadioGroupItem value={option} id={`${responseKey}-${oIndex}`} />
                                <Label htmlFor={`${responseKey}-${oIndex}`} className="cursor-pointer">
                                  {option}
                                </Label>
                              </div>
                            ))}
                          </RadioGroup>
                        )}

                        {question.question_type === "text" && (
                          <Textarea
                            value={responses[responseKey] || ""}
                            onChange={(e) => handleResponse(question.id, e.target.value)}
                            placeholder="Enter your response..."
                            className="min-h-[100px]"
                          />
                        )}

                        {question.question_type === "numeric" && (
                          <Input
                            type="number"
                            value={responses[responseKey] || ""}
                            onChange={(e) => handleResponse(question.id, Number(e.target.value))}
                            placeholder="Enter a number..."
                            className="max-w-[200px]"
                          />
                        )}

                        {/* Optional notes per dimension */}
                        <Collapsible className="mt-4">
                          <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground p-0 h-auto">
                              <MessageSquarePlus className="h-4 w-4" />
                              <span className="text-sm">{notes[responseKey] ? "Edit additional comments" : "Add additional comments"}</span>
                              <ChevronDown className="h-3 w-3" />
                            </Button>
                          </CollapsibleTrigger>
                          <CollapsibleContent className="mt-2">
                            <Textarea
                              value={notes[responseKey] || ""}
                              onChange={(e) => handleNotesChange(question.id, e.target.value)}
                              placeholder="Share any additional thoughts, context, or insights..."
                              className="min-h-[80px] text-sm"
                            />
                          </CollapsibleContent>
                        </Collapsible>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ))}
          </div>
        ) : (
          /* Standard: paginated by dimension */
          <>
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

            <div className="space-y-6">
              {currentDimension.questions.map((question, qIndex) => {
                const responseKey = getResponseKey(question.id);
                return (
                  <Card key={`${responseKey}-${qIndex}`} className="border-border">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-start gap-2">
                        <span className="text-muted-foreground font-normal">{qIndex + 1}.</span>
                        <span>{question.question_text}</span>
                        {question.required && <span className="text-destructive">*</span>}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {question.question_type === "likert" && (
                        <LikertDualScore
                          question={question}
                          value={responses[responseKey]}
                          onChange={(field, val) => handleDualResponse(question.id, field, val)}
                        />
                      )}

                      {question.question_type === "multiple_choice" && question.options && (
                        <RadioGroup
                          value={responses[responseKey] || ""}
                          onValueChange={(value) => handleResponse(question.id, value)}
                          className="space-y-2"
                        >
                          {question.options.map((option, oIndex) => (
                            <div key={oIndex} className="flex items-center space-x-3">
                              <RadioGroupItem value={option} id={`${responseKey}-${oIndex}`} />
                              <Label htmlFor={`${responseKey}-${oIndex}`} className="cursor-pointer">
                                {option}
                              </Label>
                            </div>
                          ))}
                        </RadioGroup>
                      )}

                      {question.question_type === "text" && (
                        <Textarea
                          value={responses[responseKey] || ""}
                          onChange={(e) => handleResponse(question.id, e.target.value)}
                          placeholder="Enter your response..."
                          className="min-h-[100px]"
                        />
                      )}

                      {question.question_type === "numeric" && (
                        <Input
                          type="number"
                          value={responses[responseKey] || ""}
                          onChange={(e) => handleResponse(question.id, Number(e.target.value))}
                          placeholder="Enter a number..."
                          className="max-w-[200px]"
                        />
                      )}

                      <Collapsible className="mt-4">
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground p-0 h-auto">
                            <MessageSquarePlus className="h-4 w-4" />
                            <span className="text-sm">{notes[responseKey] ? "Edit additional comments" : "Add additional comments"}</span>
                            <ChevronDown className="h-3 w-3" />
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="mt-2">
                          <Textarea
                            value={notes[responseKey] || ""}
                            onChange={(e) => handleNotesChange(question.id, e.target.value)}
                            placeholder="Share any additional thoughts, context, or insights about your answer..."
                            className="min-h-[80px] text-sm"
                          />
                        </CollapsibleContent>
                      </Collapsible>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t">
          <Button
            variant="outline"
            onClick={handlePrev}
            disabled={isFirstPage}
            className="gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>

          {!isLastPage ? (
            <Button
              onClick={handleNext}
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

/** Dual Likert scale: As-Is and To-Be side by side in columns */
function LikertDualScore({
  question,
  value,
  onChange,
}: {
  question: { id: string; scale_config?: { min?: number; max?: number; labels?: Record<number, string>; descriptions?: Record<number, string> } };
  value: any;
  onChange: (field: "asIs" | "toBe", val: number) => void;
}) {
  const rawConfig = question.scale_config;
  const min = Number(rawConfig?.min);
  const max = Number(rawConfig?.max);

  const hasValidRange = Number.isFinite(min) && Number.isFinite(max) && max >= min && max - min <= 20;

  if (!hasValidRange) {
    return (
      <div className="rounded-md border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
        This question's scoring scale is temporarily unavailable.
      </div>
    );
  }

  const labels = (rawConfig?.labels ?? {}) as Record<number, string>;
  const descriptions = (rawConfig?.descriptions ?? {}) as Record<number, string>;

  const levels = Array.from(
    { length: max - min + 1 },
    (_, i) => min + i
  );

  const asIsValue = value?.asIs ?? null;
  const toBeValue = value?.toBe ?? null;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="text-left py-2 pr-4 font-medium text-muted-foreground w-1/2">Level</th>
            <th className="text-center py-2 px-3 font-medium w-1/4">
              <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">As-Is</Badge>
            </th>
            <th className="text-center py-2 px-3 font-medium w-1/4">
              <Badge variant="outline" className="bg-accent/50 text-accent-foreground border-accent">To-Be</Badge>
            </th>
          </tr>
        </thead>
        <tbody>
          {levels.map((level) => (
            <tr key={level} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
              <td className="py-3 pr-4">
                <div className="font-medium">{level} - {labels?.[level] || `Level ${level}`}</div>
                {descriptions?.[level] && (
                  <p className="text-xs text-muted-foreground mt-0.5">{descriptions[level]}</p>
                )}
              </td>
              <td className="text-center py-3 px-3">
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={() => onChange("asIs", level)}
                    className={cn(
                      "h-4 w-4 rounded-full border border-primary ring-offset-background focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 cursor-pointer flex items-center justify-center",
                      asIsValue === level && "bg-primary"
                    )}
                    aria-label={`As-Is: ${level}`}
                  >
                    {asIsValue === level && (
                      <span className="h-2.5 w-2.5 rounded-full bg-primary-foreground" />
                    )}
                  </button>
                </div>
              </td>
              <td className="text-center py-3 px-3">
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={() => onChange("toBe", level)}
                    className={cn(
                      "h-4 w-4 rounded-full border border-primary ring-offset-background focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 cursor-pointer flex items-center justify-center",
                      toBeValue === level && "bg-primary"
                    )}
                    aria-label={`To-Be: ${level}`}
                  >
                    {toBeValue === level && (
                      <span className="h-2.5 w-2.5 rounded-full bg-primary-foreground" />
                    )}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
