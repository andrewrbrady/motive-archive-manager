"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useFirebaseAuth } from "@/hooks/useFirebaseAuth";
import {
  AIModel,
  ModelConfig,
  DEFAULT_MODEL_CONFIGS,
  validateTokenRange,
} from "@/utils/aiHelpers";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  metadata?: {
    model?: string;
    usage?: {
      promptTokens?: number;
      completionTokens?: number;
      totalTokens?: number;
    };
    attachments?: string[];
  };
}

// Export the imported types for backwards compatibility
export type { AIModel, ModelConfig };
export { DEFAULT_MODEL_CONFIGS, validateTokenRange };

export interface ChatSettings {
  model?: AIModel;
  temperature?: number;
  maxTokens?: number;
  tools?: string[];
}

export interface UseChatOptions {
  entityType: "car" | "project";
  entityId: string;
  conversationId?: string;
  fileIds?: string[];
  settings?: ChatSettings;
}

export interface UseChatReturn {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  conversationId: string | null;
  currentFileIds: string[];
  send: (content: string) => Promise<void>;
  clearMessages: () => void;
  clearError: () => void;
  updateFileIds: (newFileIds: string[]) => void;
}

export function useChat(options: UseChatOptions): UseChatReturn {
  const {
    entityType,
    entityId,
    conversationId: initialConversationId,
    fileIds: initialFileIds = [],
    settings = {},
  } = options;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(
    initialConversationId || null
  );
  const [currentFileIds, setCurrentFileIds] =
    useState<string[]>(initialFileIds);

  const eventSourceRef = useRef<EventSource | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const { user } = useFirebaseAuth();

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const cleanup = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  const updateFileIds = useCallback((newFileIds: string[]) => {
    setCurrentFileIds(newFileIds);
  }, []);

  const send = useCallback(
    async (content: string) => {
      if (isLoading || !content.trim()) return;

      setIsLoading(true);
      setError(null);
      cleanup();

      // Add user message immediately
      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        role: "user",
        content: content.trim(),
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);

      try {
        // Get auth token from Firebase user
        if (!user) {
          throw new Error(
            "Please sign in to use the AI assistant. Authentication required."
          );
        }

        const authToken = await user.getIdToken(true); // Force refresh to ensure valid token

        const response = await fetch("/api/ai-chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
            "x-user-id": user.uid, // Add user ID as backup
          },
          body: JSON.stringify({
            messages: [...messages, userMessage].map((msg) => ({
              role: msg.role,
              content: msg.content,
            })),
            conversationId,
            entityType,
            entityId,
            fileIds: currentFileIds,
            settings,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to send message");
        }

        // Handle streaming response
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        let assistantMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "",
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, assistantMessage]);

        if (!reader) {
          throw new Error("Failed to read response stream");
        }

        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();

          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || ""; // Keep incomplete line in buffer

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));

                if (data.type === "content") {
                  assistantMessage.content += data.content;

                  // Update the assistant message in state
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === assistantMessage.id
                        ? { ...assistantMessage }
                        : msg
                    )
                  );

                  // Update conversation ID if provided
                  if (data.conversationId && !conversationId) {
                    setConversationId(data.conversationId);
                  }
                } else if (data.type === "complete") {
                  // Final update with usage info if available
                  if (data.usage) {
                    assistantMessage.metadata = {
                      ...assistantMessage.metadata,
                      usage: data.usage,
                    };

                    setMessages((prev) =>
                      prev.map((msg) =>
                        msg.id === assistantMessage.id
                          ? { ...assistantMessage }
                          : msg
                      )
                    );
                  }

                  // Update conversation ID
                  if (data.conversationId) {
                    setConversationId(data.conversationId);
                  }
                } else if (data.type === "error") {
                  throw new Error(data.error);
                }
              } catch (parseError) {
                console.error("Failed to parse streaming data:", parseError);
              }
            }
          }
        }
      } catch (err) {
        console.error("Chat error:", err);
        setError(
          err instanceof Error ? err.message : "An unknown error occurred"
        );

        // Remove the failed assistant message
        setMessages((prev) =>
          prev.filter((msg) => msg.role !== "assistant" || msg.content)
        );
      } finally {
        setIsLoading(false);
        cleanup();
      }
    },
    [
      isLoading,
      messages,
      conversationId,
      entityType,
      entityId,
      currentFileIds,
      settings,
      cleanup,
      user,
    ]
  );

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    messages,
    isLoading,
    error,
    conversationId,
    currentFileIds,
    send,
    clearMessages,
    clearError,
    updateFileIds,
  };
}
