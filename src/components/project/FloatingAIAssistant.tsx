import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Bot, User, Sparkles, X, Minimize2, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface ToolData {
  toolName: string;
  data: any;
}

interface StepData {
  id: string;
  title: string;
  status: string;
  order_index: number | null;
  description?: string | null;
  deliverables?: any;
  notes_json?: any;
}

interface FloatingAIAssistantProps {
  projectId: string;
  projectName: string;
  clientName?: string;
  currentStepId?: string;
  currentStepTitle?: string;
  allSteps?: StepData[];
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/expert-ai-chat`;

export function FloatingAIAssistant({
  projectId,
  projectName,
  clientName,
  currentStepId,
  currentStepTitle,
  allSteps = [],
}: FloatingAIAssistantProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [toolDataContent, setToolDataContent] = useState<Record<string, ToolData>>({});
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hasInitialized, setHasInitialized] = useState(false);

  // Fetch all tool data for the project
  const fetchAllToolData = useCallback(async () => {
    if (!projectId) return;

    const { data: toolDataRecords } = await supabase
      .from("tool_data")
      .select("tool_id, content_json, step_id, consulting_tools(name)")
      .eq("project_id", projectId);

    if (toolDataRecords && toolDataRecords.length > 0) {
      const toolContent: Record<string, ToolData> = {};
      toolDataRecords.forEach((record: any) => {
        if (record.content_json && record.consulting_tools?.name) {
          const key = record.step_id 
            ? `${record.tool_id}-${record.step_id}` 
            : record.tool_id;
          toolContent[key] = {
            toolName: record.consulting_tools.name,
            data: record.content_json
          };
        }
      });
      setToolDataContent(toolContent);
    }
  }, [projectId]);

  // Listen for tool saves and refresh context
  useEffect(() => {
    const handler = () => fetchAllToolData();
    window.addEventListener('tool-data-saved', handler);
    return () => window.removeEventListener('tool-data-saved', handler);
  }, [fetchAllToolData]);

  // Initialize on first open
  useEffect(() => {
    if (isOpen && !hasInitialized) {
      fetchAllToolData();
      
      let greeting = `Hi! I'm your AI assistant for the "${projectName}" project`;
      if (clientName) greeting += ` with ${clientName}`;
      greeting += ".";
      
      if (allSteps.length > 0) {
        const completedSteps = allSteps.filter(s => s.status === "completed").length;
        greeting += ` You have ${completedSteps}/${allSteps.length} steps completed.`;
      }
      
      if (currentStepTitle) {
        greeting += ` Currently viewing: "${currentStepTitle}".`;
      }
      
      greeting += " I have full context on your project - ask me anything!";
      
      setMessages([{ id: "1", role: "assistant", content: greeting }]);
      setHasInitialized(true);
    }
  }, [isOpen, hasInitialized, projectName, clientName, allSteps, currentStepTitle, fetchAllToolData]);

  // Update context when step changes
  useEffect(() => {
    if (hasInitialized && currentStepTitle && messages.length > 0) {
      fetchAllToolData();
    }
  }, [currentStepId, currentStepTitle, hasInitialized, messages.length, fetchAllToolData]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Build rich context for the AI
  const buildProjectContext = useCallback(() => {
    const parts: string[] = [];
    
    parts.push(`## Project Context`);
    parts.push(`- **Project**: ${projectName}`);
    if (clientName) parts.push(`- **Client**: ${clientName}`);
    
    if (allSteps.length > 0) {
      parts.push(`\n## Workflow Steps (${allSteps.length} total)`);
      const currentIndex = allSteps.findIndex(s => s.id === currentStepId);
      allSteps.forEach((step, i) => {
        const marker = i === currentIndex ? "→ " : "  ";
        const statusEmoji = step.status === "completed" ? "✅" : step.status === "in_progress" ? "🔄" : "⏳";
        parts.push(`\n${marker}### Step ${i + 1}: ${step.title} ${statusEmoji}`);
        
        // Include step description if available
        if (step.description) {
          parts.push(`**Description:** ${step.description}`);
        }
        
        // Include step deliverables if available
        if (step.deliverables && Array.isArray(step.deliverables) && step.deliverables.length > 0) {
          const completed = step.deliverables.filter((d: any) => d.completed).length;
          parts.push(`**Deliverables (${completed}/${step.deliverables.length}):**`);
          step.deliverables.forEach((d: any) => {
            const check = d.completed ? "✅" : "⬜";
            parts.push(`  ${check} ${d.text || d.name || d}`);
          });
        }
        
        // Include step notes if available
        if (step.notes_json && Array.isArray(step.notes_json) && step.notes_json.length > 0) {
          parts.push(`**Notes:**`);
          step.notes_json.forEach((note: any) => {
            parts.push(`  - ${note.text || note}`);
          });
        }
      });
    }
    
    if (currentStepTitle) {
      parts.push(`\n## Currently Viewing: ${currentStepTitle}`);
    }
    
    // Include all tool data across the project
    if (Object.keys(toolDataContent).length > 0) {
      parts.push(`\n## Tool Data & Analysis Results`);
      Object.values(toolDataContent).forEach(({ toolName, data }) => {
        parts.push(`\n### ${toolName} Data`);
        try {
          if (toolName === "SWOT Analysis" && data) {
            if (data.strengths?.length) parts.push(`**Strengths:** ${data.strengths.map((s: any) => s.text || s).join(", ")}`);
            if (data.weaknesses?.length) parts.push(`**Weaknesses:** ${data.weaknesses.map((w: any) => w.text || w).join(", ")}`);
            if (data.opportunities?.length) parts.push(`**Opportunities:** ${data.opportunities.map((o: any) => o.text || o).join(", ")}`);
            if (data.threats?.length) parts.push(`**Threats:** ${data.threats.map((t: any) => t.text || t).join(", ")}`);
          } else if (toolName === "Business Model Canvas" && data) {
            const sections = ["keyPartners", "keyActivities", "keyResources", "valuePropositions", "customerRelationships", "channels", "customerSegments", "costStructure", "revenueStreams"];
            sections.forEach(section => {
              if (data[section]?.length) {
                const label = section.replace(/([A-Z])/g, ' $1').trim();
                parts.push(`**${label}:** ${data[section].map((item: any) => item.text || item).join(", ")}`);
              }
            });
          } else if (toolName === "7S Framework" && data) {
            const sections = ["strategy", "structure", "systems", "sharedValues", "style", "staff", "skills"];
            sections.forEach(section => {
              if (data[section]?.length) {
                const label = section.replace(/([A-Z])/g, ' $1').trim();
                parts.push(`**${label}:** ${data[section].map((item: any) => item.text || item).join(", ")}`);
              }
            });
          } else if (toolName === "Operating Model Canvas" && data) {
            const sections = ["valueChain", "organization", "locations", "information", "suppliers", "managementSystem"];
            sections.forEach(section => {
              if (data[section]?.length) {
                const label = section.replace(/([A-Z])/g, ' $1').trim();
                parts.push(`**${label}:** ${data[section].map((item: any) => item.text || item).join(", ")}`);
              }
            });
          } else {
            parts.push(JSON.stringify(data, null, 2).slice(0, 500));
          }
        } catch {
          parts.push(`(Tool data available but could not be formatted)`);
        }
      });
    }
    
    return parts.join("\n");
  }, [projectName, clientName, allSteps, currentStepId, currentStepTitle, toolDataContent]);

  const suggestedPrompts = [
    "What should I focus on next?",
    "Summarize key findings so far",
    "What are potential risks?",
    "Generate client talking points",
  ];

  const handleSendMessage = async (messageText?: string) => {
    const text = messageText || inputValue;
    if (!text.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text,
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputValue("");
    setIsLoading(true);

    let assistantContent = "";

    try {
      const projectContext = buildProjectContext();

      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
          persona: "strategist",
          projectContext,
        }),
      });

      if (!resp.ok) {
        const errorData = await resp.json().catch(() => ({}));
        throw new Error(errorData.error || `Request failed with status ${resp.status}`);
      }

      if (!resp.body) throw new Error("No response body");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      const assistantId = (Date.now() + 1).toString();
      setMessages((prev) => [
        ...prev,
        { id: assistantId, role: "assistant", content: "" },
      ]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        let newlineIndex;
        while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantContent += content;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId ? { ...m, content: assistantContent } : m
                )
              );
            }
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to get response",
        variant: "destructive",
      });
      if (!assistantContent) {
        setMessages((prev) => prev.slice(0, -1));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <>
      {/* Floating bubble button */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg transition-all duration-300",
          "bg-primary hover:bg-primary/90 text-primary-foreground",
          isOpen && "scale-0 opacity-0"
        )}
        size="icon"
      >
        <MessageCircle className="h-6 w-6" />
      </Button>

      {/* Expanded chat panel */}
      <div
        className={cn(
          "fixed bottom-6 right-6 z-50 flex flex-col rounded-2xl border bg-background shadow-2xl transition-all duration-300 overflow-hidden",
          isOpen 
            ? "w-[400px] h-[550px] opacity-100 scale-100" 
            : "w-14 h-14 opacity-0 scale-90 pointer-events-none"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-primary/5">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">AI Assistant</h3>
              <div className="flex items-center gap-1">
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                  Context-Aware
                </Badge>
                {currentStepTitle && (
                  <span className="text-[10px] text-muted-foreground truncate max-w-[150px]">
                    · {currentStepTitle}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setIsOpen(false)}
            >
              <Minimize2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Suggested Prompts */}
        <div className="px-3 py-2 border-b bg-muted/20">
          <p className="text-[10px] text-muted-foreground mb-1.5 flex items-center gap-1">
            <Sparkles className="h-3 w-3" />
            Quick prompts
          </p>
          <div className="flex flex-wrap gap-1.5">
            {suggestedPrompts.map((prompt, i) => (
              <button
                key={i}
                onClick={() => handleSendMessage(prompt)}
                disabled={isLoading}
                className="text-[11px] px-2 py-1 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-50"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-3" ref={scrollRef}>
          <div className="space-y-3">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex gap-2",
                  message.role === "user" && "flex-row-reverse"
                )}
              >
                <div
                  className={cn(
                    "flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg",
                    message.role === "assistant"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  )}
                >
                  {message.role === "assistant" ? (
                    <Bot className="h-3.5 w-3.5" />
                  ) : (
                    <User className="h-3.5 w-3.5" />
                  )}
                </div>
                <div
                  className={cn(
                    "max-w-[85%] rounded-xl px-3 py-2",
                    message.role === "assistant"
                      ? "bg-muted/50"
                      : "bg-primary text-primary-foreground"
                  )}
                >
                  {message.role === "assistant" ? (
                    <div className="text-xs leading-relaxed prose prose-sm max-w-none">
                      <ReactMarkdown>{message.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <p className="text-xs leading-relaxed">{message.content}</p>
                  )}
                </div>
              </div>
            ))}
            {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
              <div className="flex gap-2">
                <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Bot className="h-3.5 w-3.5" />
                </div>
                <div className="rounded-xl bg-muted/50 px-3 py-2">
                  <div className="flex gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50 animate-pulse" />
                    <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50 animate-pulse" style={{ animationDelay: "0.2s" }} />
                    <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50 animate-pulse" style={{ animationDelay: "0.4s" }} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="border-t p-3">
          <div className="flex gap-2">
            <Input
              placeholder="Ask anything about this project..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1 text-sm h-9"
              disabled={isLoading}
            />
            <Button
              onClick={() => handleSendMessage()}
              disabled={!inputValue.trim() || isLoading}
              size="icon"
              className="h-9 w-9"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
