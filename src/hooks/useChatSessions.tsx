import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export interface ChatSession {
  id: string;
  title: string;
  persona: string | null;
  session_type: string;
  messages: ChatMessage[];
  created_at: string;
  updated_at: string;
}

interface UseChatSessionsOptions {
  sessionType: "expert_ai" | "research";
}

export function useChatSessions({ sessionType }: UseChatSessionsOptions) {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSession, setActiveSession] = useState<ChatSession | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch all sessions for the user
  const fetchSessions = useCallback(async () => {
    if (!user) {
      setSessions([]);
      setLoading(false);
      return;
    }

    try {
      const { data: sessionsData, error: sessionsError } = await supabase
        .from("chat_sessions")
        .select("*")
        .eq("user_id", user.id)
        .eq("session_type", sessionType)
        .order("updated_at", { ascending: false });

      if (sessionsError) throw sessionsError;

      // Fetch messages for each session
      const sessionsWithMessages: ChatSession[] = await Promise.all(
        (sessionsData || []).map(async (session) => {
          const { data: messagesData } = await supabase
            .from("chat_messages")
            .select("*")
            .eq("session_id", session.id)
            .order("created_at", { ascending: true });

          return {
            ...session,
            messages: (messagesData || []).map((m) => ({
              id: m.id,
              role: m.role as "user" | "assistant",
              content: m.content,
              timestamp: new Date(m.created_at),
            })),
          };
        })
      );

      setSessions(sessionsWithMessages);
    } catch (error) {
      console.error("Error fetching chat sessions:", error);
    } finally {
      setLoading(false);
    }
  }, [user, sessionType]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // Create a new session
  const createSession = useCallback(
    async (persona?: string, initialTitle?: string): Promise<ChatSession | null> => {
      if (!user) return null;

      try {
        const { data, error } = await supabase
          .from("chat_sessions")
          .insert({
            user_id: user.id,
            session_type: sessionType,
            persona: persona || null,
            title: initialTitle || "New Conversation",
          })
          .select()
          .single();

        if (error) throw error;

        const newSession: ChatSession = {
          ...data,
          messages: [],
        };

        setSessions((prev) => [newSession, ...prev]);
        setActiveSession(newSession);
        return newSession;
      } catch (error) {
        console.error("Error creating chat session:", error);
        return null;
      }
    },
    [user, sessionType]
  );

  // Add a message to the active session
  const addMessage = useCallback(
    async (
      sessionId: string,
      role: "user" | "assistant",
      content: string
    ): Promise<ChatMessage | null> => {
      if (!user) return null;

      try {
        const { data, error } = await supabase
          .from("chat_messages")
          .insert({
            session_id: sessionId,
            role,
            content,
          })
          .select()
          .single();

        if (error) throw error;

        const newMessage: ChatMessage = {
          id: data.id,
          role: data.role as "user" | "assistant",
          content: data.content,
          timestamp: new Date(data.created_at),
        };

        // Update local state
        setSessions((prev) =>
          prev.map((s) =>
            s.id === sessionId
              ? { ...s, messages: [...s.messages, newMessage] }
              : s
          )
        );

        if (activeSession?.id === sessionId) {
          setActiveSession((prev) =>
            prev ? { ...prev, messages: [...prev.messages, newMessage] } : null
          );
        }

        // Update session title if this is the first user message
        const session = sessions.find((s) => s.id === sessionId);
        if (session && session.messages.length === 0 && role === "user") {
          await supabase
            .from("chat_sessions")
            .update({ title: content.slice(0, 50) })
            .eq("id", sessionId);

          setSessions((prev) =>
            prev.map((s) =>
              s.id === sessionId ? { ...s, title: content.slice(0, 50) } : s
            )
          );
        }

        return newMessage;
      } catch (error) {
        console.error("Error adding message:", error);
        return null;
      }
    },
    [user, sessions, activeSession]
  );

  // Update message content (for streaming)
  const updateMessageContent = useCallback(
    async (sessionId: string, messageId: string, content: string) => {
      // Update local state immediately for UI
      setSessions((prev) =>
        prev.map((s) =>
          s.id === sessionId
            ? {
                ...s,
                messages: s.messages.map((m) =>
                  m.id === messageId ? { ...m, content } : m
                ),
              }
            : s
        )
      );

      if (activeSession?.id === sessionId) {
        setActiveSession((prev) =>
          prev
            ? {
                ...prev,
                messages: prev.messages.map((m) =>
                  m.id === messageId ? { ...m, content } : m
                ),
              }
            : null
        );
      }

      // Update in database
      try {
        await supabase
          .from("chat_messages")
          .update({ content })
          .eq("id", messageId);
      } catch (error) {
        console.error("Error updating message:", error);
      }
    },
    [activeSession]
  );

  // Delete a session
  const deleteSession = useCallback(
    async (sessionId: string) => {
      try {
        const { error } = await supabase
          .from("chat_sessions")
          .delete()
          .eq("id", sessionId);

        if (error) throw error;

        setSessions((prev) => prev.filter((s) => s.id !== sessionId));
        if (activeSession?.id === sessionId) {
          setActiveSession(null);
        }
      } catch (error) {
        console.error("Error deleting session:", error);
      }
    },
    [activeSession]
  );

  // Select a session as active
  const selectSession = useCallback(
    (sessionId: string) => {
      const session = sessions.find((s) => s.id === sessionId);
      setActiveSession(session || null);
    },
    [sessions]
  );

  return {
    sessions,
    activeSession,
    loading,
    createSession,
    addMessage,
    updateMessageContent,
    deleteSession,
    selectSession,
    setActiveSession,
    refetch: fetchSessions,
  };
}
