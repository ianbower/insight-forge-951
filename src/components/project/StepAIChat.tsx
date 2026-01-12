import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface Deliverable {
  id: string;
  text: string;
  completed: boolean;
}

interface StepAIChatProps {
  stepTitle: string;
  projectName: string;
  clientName?: string;
  tools: string[];
  description?: string;
  notes?: string;
  deliverables?: Deliverable[];
  allSteps?: { title: string; status: string; order_index: number | null }[];
  currentStepIndex?: number;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/expert-ai-chat`;

export function StepAIChat({ 
  stepTitle, 
  projectName, 
  clientName, 
  tools,
  description,
  notes,
  deliverables,
  allSteps,
  currentStepIndex
}: StepAIChatProps) {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Build rich context for the AI
  const buildProjectContext = () => {
    const parts: string[] = [];
    
    // Project overview
    parts.push(`## Project Context`);
    parts.push(`- **Project**: ${projectName}`);
    if (clientName) parts.push(`- **Client**: ${clientName}`);
    
    // Workflow context
    if (allSteps && allSteps.length > 0) {
      parts.push(`\n## Workflow Overview (${allSteps.length} steps)`);
      allSteps.forEach((step, i) => {
        const marker = i === currentStepIndex ? "→ " : "  ";
        const statusEmoji = step.status === "completed" ? "✅" : step.status === "in_progress" ? "🔄" : "⏳";
        parts.push(`${marker}${i + 1}. ${step.title} ${statusEmoji}`);
      });
    }
    
    // Current step details
    parts.push(`\n## Current Step: ${stepTitle}`);
    if (tools.length > 0) {
      parts.push(`- **Assigned Tools/Frameworks**: ${tools.join(", ")}`);
    }
    
    // Description
    if (description && description.trim()) {
      parts.push(`\n### Step Description`);
      parts.push(description);
    }
    
    // Deliverables
    if (deliverables && deliverables.length > 0) {
      parts.push(`\n### Deliverables (${deliverables.filter(d => d.completed).length}/${deliverables.length} complete)`);
      deliverables.forEach(d => {
        const status = d.completed ? "✅" : "⬜";
        parts.push(`${status} ${d.text}`);
      });
    }
    
    // Notes
    if (notes && notes.trim()) {
      parts.push(`\n### Working Notes`);
      parts.push(notes);
    }
    
    return parts.join("\n");
  };

  // Initialize with context-aware greeting
  useEffect(() => {
    const completedDeliverables = deliverables?.filter(d => d.completed).length || 0;
    const totalDeliverables = deliverables?.length || 0;
    const hasNotes = notes && notes.trim().length > 0;
    const hasDescription = description && description.trim().length > 0;
    
    let greeting = `I'm here to help with the "${stepTitle}" step`;
    if (clientName) greeting += ` for ${clientName}`;
    greeting += ".";
    
    if (tools.length > 0) {
      greeting += ` This step involves ${tools.join(", ")}.`;
    }
    
    if (totalDeliverables > 0) {
      greeting += ` You have ${completedDeliverables}/${totalDeliverables} deliverables completed.`;
    }
    
    if (hasNotes || hasDescription) {
      greeting += ` I've reviewed the content and notes for this step.`;
    }
    
    greeting += ` What would you like guidance on?`;
    
    setMessages([
      {
        id: "1",
        role: "assistant",
        content: greeting,
      },
    ]);
  }, [stepTitle, clientName, tools, description, notes, deliverables]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const suggestedPrompts = [
    `What questions should I ask the client a...`,
    `What are common pitfalls when working on...`,
    tools.length > 0 ? `How should I approach using ${tools[0]}?` : "What frameworks work best here?",
    `Generate key talking points for ${stepTitle.slice(0, 15)}...`,
  ];

  const fullPrompts = [
    `What questions should I ask the client about ${stepTitle}?`,
    `What are common pitfalls when working on ${stepTitle}?`,
    tools.length > 0 ? `How should I approach using ${tools[0]}?` : "What frameworks work best here?",
    `Generate key talking points for ${stepTitle}`,
  ];

  const handleSendMessage = async (messageText?: string, promptIndex?: number) => {
    const text = promptIndex !== undefined ? fullPrompts[promptIndex] : (messageText || inputValue);
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
      // Build rich context for the AI
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
    <div className="flex flex-col h-full">
      {/* Suggested Prompts */}
      <div className="px-4 py-3 border-b border-border bg-muted/20">
        <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
          <Sparkles className="h-3 w-3" />
          Quick prompts
        </p>
        <div className="flex flex-wrap gap-2">
          {suggestedPrompts.map((prompt, i) => (
            <button
              key={i}
              onClick={() => handleSendMessage(undefined, i)}
              disabled={isLoading}
              className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-50"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex gap-3",
                message.role === "user" && "flex-row-reverse"
              )}
            >
              <div
                className={cn(
                  "flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg",
                  message.role === "assistant"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                )}
              >
                {message.role === "assistant" ? (
                  <Bot className="h-4 w-4" />
                ) : (
                  <User className="h-4 w-4" />
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
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {message.content}
                </p>
              </div>
            </div>
          ))}
          {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
            <div className="flex gap-3">
              <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Bot className="h-4 w-4" />
              </div>
              <div className="rounded-xl bg-muted/50 px-3 py-2">
                <div className="flex gap-1">
                  <span className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-pulse" />
                  <span className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-pulse" style={{ animationDelay: "0.2s" }} />
                  <span className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-pulse" style={{ animationDelay: "0.4s" }} />
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="border-t border-border p-3">
        <div className="flex gap-2">
          <Input
            placeholder="Ask about this step..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1"
            disabled={isLoading}
          />
          <Button
            onClick={() => handleSendMessage()}
            disabled={!inputValue.trim() || isLoading}
            size="icon"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
