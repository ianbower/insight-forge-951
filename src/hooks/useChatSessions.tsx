import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export interface ChatFolder {
  id: string;
  name: string;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface ChatSession {
  id: string;
  title: string;
  persona: string | null;
  session_type: string;
  folder_id: string | null;
  messages: ChatMessage[];
  created_at: string;
  updated_at: string;
}

interface UseChatSessionsOptions {
  sessionType: "expert_ai" | "research";
}

const TITLE_GENERATE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-chat-title`;

export function useChatSessions({ sessionType }: UseChatSessionsOptions) {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [folders, setFolders] = useState<ChatFolder[]>([]);
  const [activeSession, setActiveSession] = useState<ChatSession | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch all folders for the user
  const fetchFolders = useCallback(async () => {
    if (!user) {
      setFolders([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("chat_folders")
        .select("*")
        .eq("user_id", user.id)
        .order("order_index", { ascending: true });

      if (error) throw error;
      setFolders(data || []);
    } catch (error) {
      console.error("Error fetching folders:", error);
    }
  }, [user]);

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
            folder_id: session.folder_id || null,
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
    fetchFolders();
    fetchSessions();
  }, [fetchFolders, fetchSessions]);

  // Generate a title from the first message
  const generateTitle = useCallback(async (message: string): Promise<string> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      if (!accessToken) return message.slice(0, 40) + (message.length > 40 ? "..." : "");

      const resp = await fetch(TITLE_GENERATE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ message }),
      });

      if (!resp.ok) {
        return message.slice(0, 40) + (message.length > 40 ? "..." : "");
      }

      const data = await resp.json();
      return data.title || message.slice(0, 40);
    } catch (error) {
      console.error("Error generating title:", error);
      return message.slice(0, 40) + (message.length > 40 ? "..." : "");
    }
  }, []);

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
          folder_id: null,
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

  // Update session title
  const updateSessionTitle = useCallback(
    async (sessionId: string, newTitle: string) => {
      try {
        const { error } = await supabase
          .from("chat_sessions")
          .update({ title: newTitle })
          .eq("id", sessionId);

        if (error) throw error;

        setSessions((prev) =>
          prev.map((s) => (s.id === sessionId ? { ...s, title: newTitle } : s))
        );

        if (activeSession?.id === sessionId) {
          setActiveSession((prev) => (prev ? { ...prev, title: newTitle } : null));
        }
      } catch (error) {
        console.error("Error updating session title:", error);
      }
    },
    [activeSession]
  );

  // Move session to folder
  const moveSessionToFolder = useCallback(
    async (sessionId: string, folderId: string | null) => {
      try {
        const { error } = await supabase
          .from("chat_sessions")
          .update({ folder_id: folderId })
          .eq("id", sessionId);

        if (error) throw error;

        setSessions((prev) =>
          prev.map((s) => (s.id === sessionId ? { ...s, folder_id: folderId } : s))
        );
      } catch (error) {
        console.error("Error moving session to folder:", error);
      }
    },
    []
  );

  // Create a new folder
  const createFolder = useCallback(
    async (name: string): Promise<ChatFolder | null> => {
      if (!user) return null;

      try {
        const maxOrder = folders.reduce((max, f) => Math.max(max, f.order_index), -1);
        
        const { data, error } = await supabase
          .from("chat_folders")
          .insert({
            user_id: user.id,
            name,
            order_index: maxOrder + 1,
          })
          .select()
          .single();

        if (error) throw error;

        setFolders((prev) => [...prev, data]);
        return data;
      } catch (error) {
        console.error("Error creating folder:", error);
        return null;
      }
    },
    [user, folders]
  );

  // Rename a folder
  const renameFolder = useCallback(
    async (folderId: string, newName: string) => {
      try {
        const { error } = await supabase
          .from("chat_folders")
          .update({ name: newName })
          .eq("id", folderId);

        if (error) throw error;

        setFolders((prev) =>
          prev.map((f) => (f.id === folderId ? { ...f, name: newName } : f))
        );
      } catch (error) {
        console.error("Error renaming folder:", error);
      }
    },
    []
  );

  // Delete a folder
  const deleteFolder = useCallback(
    async (folderId: string) => {
      try {
        // First, unassign all sessions from this folder
        await supabase
          .from("chat_sessions")
          .update({ folder_id: null })
          .eq("folder_id", folderId);

        const { error } = await supabase
          .from("chat_folders")
          .delete()
          .eq("id", folderId);

        if (error) throw error;

        setFolders((prev) => prev.filter((f) => f.id !== folderId));
        setSessions((prev) =>
          prev.map((s) => (s.folder_id === folderId ? { ...s, folder_id: null } : s))
        );
      } catch (error) {
        console.error("Error deleting folder:", error);
      }
    },
    []
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

        // Auto-generate title if this is the first user message
        const session = sessions.find((s) => s.id === sessionId);
        if (session && session.messages.length === 0 && role === "user") {
          // Generate title asynchronously
          generateTitle(content).then((title) => {
            updateSessionTitle(sessionId, title);
          });
        }

        return newMessage;
      } catch (error) {
        console.error("Error adding message:", error);
        return null;
      }
    },
    [user, sessions, activeSession, generateTitle, updateSessionTitle]
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
    folders,
    activeSession,
    loading,
    createSession,
    addMessage,
    updateMessageContent,
    updateSessionTitle,
    moveSessionToFolder,
    createFolder,
    renameFolder,
    deleteFolder,
    deleteSession,
    selectSession,
    setActiveSession,
    refetch: fetchSessions,
  };
}
