import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Sparkles, History, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useChatSessions, ChatMessage } from "@/hooks/useChatSessions";
import { useAuth } from "@/hooks/useAuth";

const personas = [
  {
    id: "strategist",
    name: "Strategist",
    description: "Strategic planning and market analysis expert",
  },
  {
    id: "service-designer",
    name: "Service Designer",
    description: "Customer experience and service design specialist",
  },
  {
    id: "change-manager",
    name: "Change Manager",
    description: "Organizational transformation specialist",
  },
];

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/expert-ai-chat`;

export default function ExpertAI() {
  const { toast } = useToast();
  const { user } = useAuth();
  const {
    sessions,
    activeSession,
    loading: sessionsLoading,
    createSession,
    addMessage,
    updateMessageContent,
    deleteSession,
    selectSession,
    setActiveSession,
  } = useChatSessions({ sessionType: "expert_ai" });

  const [selectedPersona, setSelectedPersona] = useState(personas[0]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Get messages from active session or use welcome message
  const messages: ChatMessage[] = activeSession?.messages || [];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handlePersonaChange = async (personaId: string) => {
    const persona = personas.find((p) => p.id === personaId);
    if (persona) {
      setSelectedPersona(persona);
      // Create a new session with the new persona
      await createSession(persona.id, `${persona.name} Chat`);
    }
  };

  const handleNewChat = async () => {
    await createSession(selectedPersona.id, "New Conversation");
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading || !user) return;

    let currentSession = activeSession;

    // Create a new session if none exists
    if (!currentSession) {
      currentSession = await createSession(selectedPersona.id);
      if (!currentSession) {
        toast({
          title: "Error",
          description: "Failed to create chat session",
          variant: "destructive",
        });
        return;
      }
    }

    const userMessageContent = inputValue;
    setInputValue("");
    setIsLoading(true);

    // Add user message to database
    const userMessage = await addMessage(currentSession.id, "user", userMessageContent);
    if (!userMessage) {
      setIsLoading(false);
      return;
    }

    let assistantContent = "";

    try {
      const allMessages = [...(currentSession.messages || []), userMessage];

      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: allMessages.map((m) => ({ role: m.role, content: m.content })),
          persona: selectedPersona.id,
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

      // Create initial assistant message in database
      const assistantMessage = await addMessage(currentSession.id, "assistant", "");
      if (!assistantMessage) throw new Error("Failed to create assistant message");

      let streamDone = false;
      while (!streamDone) {
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
          if (jsonStr === "[DONE]") {
            streamDone = true;
            break;
          }

          try {
            const parsed = JSON.parse(jsonStr);
            // Support both streaming delta format and full message format
            const content = parsed.choices?.[0]?.delta?.content || parsed.choices?.[0]?.message?.content;
            if (content && content !== assistantContent) {
              assistantContent = content.length > assistantContent.length ? content : assistantContent + content;
              await updateMessageContent(currentSession.id, assistantMessage.id, assistantContent);
            }
          } catch (parseError) {
            // Only re-buffer if it looks like incomplete JSON
            if (jsonStr.includes("{") && !jsonStr.includes("}")) {
              buffer = line + "\n" + buffer;
              break;
            }
            // Otherwise skip malformed line
            console.warn("Skipping malformed SSE line:", jsonStr);
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

  const getWelcomeMessage = (): ChatMessage => ({
    id: "welcome",
    role: "assistant",
    content: `Hello! I'm your AI ${selectedPersona.name} assistant. I can help you with strategic analysis, framework recommendations, and consulting best practices. What would you like to explore today?`,
    timestamp: new Date(),
  });

  const displayMessages = messages.length > 0 ? messages : [getWelcomeMessage()];

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-6 animate-fade-in">
      {/* Chat History Sidebar */}
      <div
        className={cn(
          "w-64 flex-shrink-0 rounded-xl border border-border bg-card transition-all",
          showHistory ? "block" : "hidden lg:block"
        )}
      >
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold font-display flex items-center gap-2">
              <History className="h-4 w-4" />
              Chat History
            </h3>
            <Button size="icon" variant="ghost" onClick={handleNewChat}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <ScrollArea className="h-[calc(100%-80px)]">
          <div className="p-2 space-y-1">
            {sessionsLoading ? (
              <p className="text-sm text-muted-foreground p-2">Loading...</p>
            ) : sessions.length === 0 ? (
              <p className="text-sm text-muted-foreground p-2">No conversations yet</p>
            ) : (
              sessions.map((session) => (
                <div
                  key={session.id}
                  className={cn(
                    "group flex items-center gap-2 rounded-lg px-3 py-2 text-sm cursor-pointer transition-colors",
                    activeSession?.id === session.id
                      ? "bg-primary/10 text-primary"
                      : "hover:bg-muted"
                  )}
                  onClick={() => selectSession(session.id)}
                >
                  <Bot className="h-4 w-4 flex-shrink-0" />
                  <span className="flex-1 truncate">{session.title}</span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteSession(session.id);
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Main Chat Area */}
      <div className="flex flex-1 flex-col rounded-xl border border-border bg-card overflow-hidden">
        {/* Chat Header */}
        <div className="flex items-center justify-between border-b border-border bg-muted/30 px-6 py-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setShowHistory(!showHistory)}
            >
              <History className="h-5 w-5" />
            </Button>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
              <Bot className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h2 className="font-semibold font-display">Expert AI Assistant</h2>
              <p className="text-sm text-muted-foreground">
                {selectedPersona.description}
              </p>
            </div>
          </div>
          <Select
            value={selectedPersona.id}
            onValueChange={handlePersonaChange}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {personas.map((persona) => (
                <SelectItem key={persona.id} value={persona.id}>
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    {persona.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-6" ref={scrollRef}>
          <div className="space-y-6">
            {displayMessages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex gap-3 animate-slide-up",
                  message.role === "user" && "flex-row-reverse"
                )}
              >
                <div
                  className={cn(
                    "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg",
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
                    "max-w-[80%] rounded-xl px-4 py-3",
                    message.role === "assistant"
                      ? "bg-muted/50"
                      : "bg-primary text-primary-foreground"
                  )}
                >
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                </div>
              </div>
            ))}
            {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
              <div className="flex gap-3 animate-slide-up">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="max-w-[80%] rounded-xl bg-muted/50 px-4 py-3">
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
        <div className="border-t border-border p-4">
          <div className="flex gap-3">
            <Input
              placeholder="Ask about strategy, frameworks, or best practices..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1"
              disabled={isLoading}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isLoading}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Quick Prompts Sidebar */}
      <div className="hidden w-72 flex-shrink-0 rounded-xl border border-border bg-card p-4 xl:block">
        <h3 className="font-semibold font-display mb-4">Quick Prompts</h3>
        <div className="space-y-2">
          {[
            "How should I structure a digital transformation strategy?",
            "What frameworks are best for organizational assessment?",
            "How do I identify quick wins in a change program?",
            "What's the best approach for stakeholder management?",
          ].map((prompt, i) => (
            <button
              key={i}
              onClick={() => setInputValue(prompt)}
              className="w-full rounded-lg border border-border bg-muted/50 p-3 text-left text-sm transition-all hover:bg-muted hover:shadow-card"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
