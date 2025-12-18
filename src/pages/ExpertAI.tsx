import { useState } from "react";
import { Send, Bot, User, Sparkles } from "lucide-react";
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

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const personas = [
  {
    id: "strategist",
    name: "Strategist",
    description: "Strategic planning and market analysis expert",
    systemPrompt: "You are a senior strategy consultant...",
  },
  {
    id: "service-designer",
    name: "Service Designer",
    description: "Customer experience and service design specialist",
    systemPrompt: "You are a service design expert...",
  },
  {
    id: "change-manager",
    name: "Change Manager",
    description: "Organizational transformation specialist",
    systemPrompt: "You are a change management expert...",
  },
];

export default function ExpertAI() {
  const [selectedPersona, setSelectedPersona] = useState(personas[0]);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: `Hello! I'm your AI ${selectedPersona.name} assistant. I can help you with strategic analysis, framework recommendations, and consulting best practices. What would you like to explore today?`,
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handlePersonaChange = (personaId: string) => {
    const persona = personas.find((p) => p.id === personaId);
    if (persona) {
      setSelectedPersona(persona);
      setMessages([
        {
          id: Date.now().toString(),
          role: "assistant",
          content: `I've switched to ${persona.name} mode. ${persona.description}. How can I assist you?`,
          timestamp: new Date(),
        },
      ]);
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: inputValue,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    // Simulate AI response (would connect to actual AI service)
    setTimeout(() => {
      const responses = [
        "That's an excellent question. Based on my experience in similar engagements, I'd recommend starting with a thorough current-state assessment...",
        "From a strategic perspective, there are several frameworks we could apply here. The Business Model Canvas would help visualize the key components...",
        "Let me break this down into actionable steps. First, we should identify the key stakeholders and their concerns...",
        "This is a common challenge in transformation projects. The key is to balance quick wins with longer-term structural changes...",
      ];

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: responses[Math.floor(Math.random() * responses.length)],
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setIsLoading(false);
    }, 1500);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-6 animate-fade-in">
      {/* Main Chat Area */}
      <div className="flex flex-1 flex-col rounded-xl border border-border bg-card overflow-hidden">
        {/* Chat Header */}
        <div className="flex items-center justify-between border-b border-border bg-muted/30 px-6 py-4">
          <div className="flex items-center gap-3">
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
        <ScrollArea className="flex-1 p-6">
          <div className="space-y-6">
            {messages.map((message) => (
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
                  <p className="text-sm leading-relaxed">{message.content}</p>
                </div>
              </div>
            ))}
            {isLoading && (
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
      <div className="hidden w-72 flex-shrink-0 rounded-xl border border-border bg-card p-4 lg:block">
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
