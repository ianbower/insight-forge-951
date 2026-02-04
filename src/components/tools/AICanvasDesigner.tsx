import { useState, useRef, useEffect } from "react";
import { Sparkles, Send, Loader2, Copy, Check, Lightbulb, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

interface CanvasDesign {
  name: string;
  description: string;
  category: string;
  sections: Array<{
    id: string;
    title: string;
    description: string;
    position: { x: number; y: number; width: number; height: number };
    color: string;
  }>;
  layout: {
    columns: number;
    rows: number;
    backgroundColor: string;
  };
  tips: string[];
}

interface Message {
  role: "user" | "assistant";
  content: string;
  design?: CanvasDesign;
}

interface AICanvasDesignerProps {
  onApplyDesign: (design: { name: string; description: string; category: string }) => void;
}

const EXAMPLE_PROMPTS = [
  "Create a customer journey mapping canvas with touchpoints, emotions, and opportunities",
  "Design a stakeholder analysis matrix with power/interest quadrants",
  "Build a value proposition canvas connecting customer jobs to product features",
  "Create a risk assessment framework with likelihood, impact, and mitigation zones",
  "Design a digital transformation readiness assessment canvas",
];

export function AICanvasDesigner({ onApplyDesign }: AICanvasDesignerProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const extractDesignFromContent = (content: string): CanvasDesign | null => {
    try {
      // Look for JSON in code blocks
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1]);
      }
      // Try parsing the whole content as JSON
      return JSON.parse(content);
    } catch {
      return null;
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: "user", content: input.trim() };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        toast.error("Please sign in to use the AI designer");
        setIsLoading(false);
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-canvas-generator`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            messages: [...messages, userMessage].map((m) => ({
              role: m.role,
              content: m.content,
            })),
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to get AI response");
      }

      const data = await response.json();
      const content = data.content || "I couldn't generate a response. Please try again.";
      const design = extractDesignFromContent(content);

      const assistantMessage: Message = {
        role: "assistant",
        content,
        design: design || undefined,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("AI canvas designer error:", error);
      toast.error("Failed to get AI response. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCopyDesign = (design: CanvasDesign, index: number) => {
    navigator.clipboard.writeText(JSON.stringify(design, null, 2));
    setCopiedIndex(index);
    toast.success("Design copied to clipboard");
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleApplyDesign = (design: CanvasDesign) => {
    onApplyDesign({
      name: design.name,
      description: design.description,
      category: design.category,
    });
    toast.success("Design applied! Now upload a background image or continue customizing.");
  };

  const handleExampleClick = (prompt: string) => {
    setInput(prompt);
    textareaRef.current?.focus();
  };

  return (
    <div className="flex flex-col h-full border border-border rounded-xl bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/30">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
          <Sparkles className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-sm">AI Canvas Designer</h3>
          <p className="text-xs text-muted-foreground">Describe your canvas idea</p>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="space-y-4">
            <div className="text-center py-6">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Wand2 className="h-6 w-6 text-primary" />
              </div>
              <h4 className="font-medium">Let AI design your canvas</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Describe the type of canvas you want to create
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Lightbulb className="h-3 w-3" />
                <span>Try these examples:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {EXAMPLE_PROMPTS.slice(0, 3).map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => handleExampleClick(prompt)}
                    className="text-left text-xs px-3 py-2 rounded-lg border border-border hover:border-primary/50 hover:bg-muted/50 transition-colors"
                  >
                    {prompt.length > 60 ? prompt.slice(0, 60) + "..." : prompt}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[90%] rounded-xl px-4 py-3 ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  {message.role === "assistant" ? (
                    <div className="space-y-3">
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <ReactMarkdown>
                          {message.content.replace(/```json[\s\S]*?```/g, "").trim() || 
                           "Here's your canvas design:"}
                        </ReactMarkdown>
                      </div>

                      {message.design && (
                        <div className="mt-3 p-3 rounded-lg border border-border bg-background space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <h5 className="font-semibold">{message.design.name}</h5>
                              <Badge variant="secondary" className="text-xs mt-1">
                                {message.design.category}
                              </Badge>
                            </div>
                          </div>

                          <p className="text-sm text-muted-foreground">
                            {message.design.description}
                          </p>

                          {/* Visual preview of sections */}
                          <div
                            className="relative rounded-lg border border-border overflow-hidden"
                            style={{
                              backgroundColor: message.design.layout.backgroundColor,
                              aspectRatio: "16/9",
                            }}
                          >
                            <div
                              className="absolute inset-2 grid gap-1"
                              style={{
                                gridTemplateColumns: `repeat(${message.design.layout.columns}, 1fr)`,
                                gridTemplateRows: `repeat(${message.design.layout.rows}, 1fr)`,
                              }}
                            >
                              {message.design.sections.map((section) => (
                                <div
                                  key={section.id}
                                  className="rounded border border-white/20 flex items-center justify-center p-1"
                                  style={{
                                    backgroundColor: section.color + "cc",
                                    gridColumn: `${section.position.x + 1} / span ${section.position.width}`,
                                    gridRow: `${section.position.y + 1} / span ${section.position.height}`,
                                  }}
                                >
                                  <span className="text-[8px] text-white font-medium text-center truncate px-1">
                                    {section.title}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {message.design.tips && message.design.tips.length > 0 && (
                            <div className="text-xs text-muted-foreground">
                              <strong>Tips:</strong>
                              <ul className="list-disc list-inside mt-1">
                                {message.design.tips.slice(0, 3).map((tip, i) => (
                                  <li key={i}>{tip}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          <div className="flex gap-2 pt-2">
                            <Button
                              size="sm"
                              onClick={() => handleApplyDesign(message.design!)}
                            >
                              <Wand2 className="h-3 w-3 mr-1" />
                              Apply Design
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCopyDesign(message.design!, index)}
                            >
                              {copiedIndex === index ? (
                                <Check className="h-3 w-3 mr-1" />
                              ) : (
                                <Copy className="h-3 w-3 mr-1" />
                              )}
                              Copy JSON
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm">{message.content}</p>
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-xl px-4 py-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Designing your canvas...
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t border-border">
        <div className="flex gap-2">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe the canvas you want to create..."
            className="min-h-[44px] max-h-[120px] resize-none"
            rows={1}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            size="icon"
            className="shrink-0"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
