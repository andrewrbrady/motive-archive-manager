"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  useChat,
  UseChatOptions,
  ChatMessage,
  AIModel,
  DEFAULT_MODEL_CONFIGS,
  validateTokenRange,
} from "@/hooks/useChat";
import {
  Send,
  Bot,
  User,
  AlertCircle,
  Loader2,
  FileText,
  Upload,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { FileUploadDropzone } from "./FileUploadDropzone";

interface AIChatInterfaceProps extends UseChatOptions {
  title?: string;
  placeholder?: string;
  height?: string;
  showFileAttachments?: boolean;
  showFileUpload?: boolean;
}

export function AIChatInterface({
  entityType,
  entityId,
  conversationId,
  fileIds: initialFileIds = [],
  settings = {},
  title = "AI Assistant",
  placeholder = "Ask a question...",
  height = "500px",
  showFileAttachments = true,
  showFileUpload = true,
}: AIChatInterfaceProps) {
  const [inputValue, setInputValue] = useState("");
  const [fileUploadError, setFileUploadError] = useState<string | null>(null);
  const [showUploadPanel, setShowUploadPanel] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Model and token configuration state
  const [selectedModel, setSelectedModel] = useState<AIModel>(
    settings.model || "gpt-4o-mini"
  );
  const [tokenLimit, setTokenLimit] = useState<number>(
    validateTokenRange(settings.maxTokens || 1000)
  );

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Compute current settings to pass to useChat
  const currentSettings = useMemo(
    () => ({
      ...settings,
      model: selectedModel,
      maxTokens: tokenLimit,
    }),
    [settings, selectedModel, tokenLimit]
  );

  // Use the useChat hook with dynamic settings
  const {
    messages,
    isLoading,
    error,
    conversationId: currentConversationId,
    currentFileIds,
    send,
    clearMessages,
    clearError,
    updateFileIds,
  } = useChat({
    entityType,
    entityId,
    conversationId,
    fileIds: initialFileIds,
    settings: currentSettings,
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when component mounts
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const message = inputValue.trim();
    setInputValue("");

    try {
      await send(message);
    } catch (error) {
      // Error is handled by the hook
      console.error("Failed to send message:", error);
    }
  };

  const handleFilesUploaded = (newFileIds: string[]) => {
    // Get current file IDs and add new ones
    const allFileIds = [...currentFileIds, ...newFileIds];
    // Update the chat hook with all file IDs
    updateFileIds(allFileIds);
    setFileUploadError(null);
  };

  const handleFileUploadError = (error: string) => {
    setFileUploadError(error);
  };

  const clearFileUploadError = () => {
    setFileUploadError(null);
  };

  const handleModelChange = (value: string) => {
    setSelectedModel(value as AIModel);
  };

  const formatTimestamp = (timestamp: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(new Date(timestamp));
  };

  const MessageBubble = ({ message }: { message: ChatMessage }) => {
    const isUser = message.role === "user";
    const isSystem = message.role === "system";

    if (isSystem) {
      return (
        <div className="flex justify-center my-4">
          <div className="bg-muted/50 text-muted-foreground px-3 py-1 rounded-full text-xs">
            {message.content}
          </div>
        </div>
      );
    }

    return (
      <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}>
        <div
          className={`flex max-w-[70%] ${isUser ? "flex-row-reverse" : "flex-row"}`}
        >
          {/* Avatar */}
          <div className={`flex-shrink-0 ${isUser ? "ml-2" : "mr-2"}`}>
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center ${
                isUser
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {isUser ? <User size={16} /> : <Bot size={16} />}
            </div>
          </div>

          {/* Message content */}
          <div
            className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}
          >
            <div
              className={`px-4 py-2 rounded-2xl break-words ${
                isUser
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground"
              }`}
            >
              <p className="whitespace-pre-wrap">{message.content}</p>
            </div>

            {/* Timestamp and metadata */}
            <div
              className={`text-xs text-muted-foreground mt-1 flex items-center gap-2 ${
                isUser ? "flex-row-reverse" : "flex-row"
              }`}
            >
              <span>{formatTimestamp(message.timestamp)}</span>
              {message.metadata?.attachments &&
                message.metadata.attachments.length > 0 && (
                  <div className="flex items-center gap-1">
                    <FileText size={12} />
                    <span>{message.metadata.attachments.length} file(s)</span>
                  </div>
                )}
              {message.metadata?.usage && (
                <span className="text-xs opacity-70">
                  {message.metadata.usage.totalTokens} tokens
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      className="flex flex-col border rounded-lg bg-background"
      style={{ height }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-muted/20">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">{title}</h3>
          {currentConversationId && (
            <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
              Conversation Active
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {showFileAttachments && currentFileIds.length > 0 && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
              <FileText size={12} />
              {currentFileIds.length} file(s) attached
            </div>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSettings(!showSettings)}
            className="text-xs"
          >
            <Settings className="w-4 h-4 mr-1" />
            Settings
          </Button>

          {showFileUpload && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowUploadPanel(!showUploadPanel)}
              className="text-xs"
            >
              <Upload className="w-4 h-4 mr-1" />
              Upload Files
            </Button>
          )}

          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearMessages}
              className="text-xs"
            >
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Model & Token Configuration Panel */}
      <Collapsible open={showSettings} onOpenChange={setShowSettings}>
        <CollapsibleContent className="p-4 border-b bg-muted/5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Model Selection */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">AI Model</Label>
              <Select value={selectedModel} onValueChange={handleModelChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a model" />
                </SelectTrigger>
                <SelectContent>
                  {DEFAULT_MODEL_CONFIGS.filter((config) => config.enabled).map(
                    (config) => (
                      <SelectItem key={config.id} value={config.id}>
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {config.displayName}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {config.description}
                          </span>
                        </div>
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Token Length Control */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Response Length</Label>
                <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                  {tokenLimit} tokens
                </span>
              </div>
              <Slider
                value={[tokenLimit]}
                onValueChange={(value) =>
                  setTokenLimit(validateTokenRange(value[0]))
                }
                min={500}
                max={4000}
                step={100}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <button
                  onClick={() => setTokenLimit(1000)}
                  className="hover:text-foreground transition-colors"
                >
                  1K
                </button>
                <button
                  onClick={() => setTokenLimit(2000)}
                  className="hover:text-foreground transition-colors"
                >
                  2K
                </button>
                <button
                  onClick={() => setTokenLimit(4000)}
                  className="hover:text-foreground transition-colors"
                >
                  4K
                </button>
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* File Upload Panel */}
      {showFileUpload && showUploadPanel && (
        <div className="p-4 border-b bg-muted/10">
          <FileUploadDropzone
            entityType={entityType}
            entityId={entityId}
            onFilesUploaded={handleFilesUploaded}
            onError={handleFileUploadError}
          />
        </div>
      )}

      {/* File Upload Error */}
      {fileUploadError && (
        <div className="p-4 border-b">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              {fileUploadError}
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFileUploadError}
                className="ml-2"
              >
                Dismiss
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
            <Bot className="w-12 h-12 mb-4 opacity-50" />
            <p className="text-lg font-medium">AI Assistant Ready</p>
            <p className="text-sm">
              Ask questions about this {entityType} or request assistance.
            </p>
            {currentFileIds.length > 0 && (
              <p className="text-xs mt-2 opacity-70">
                I have access to {currentFileIds.length} uploaded file(s) for
                context.
              </p>
            )}
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}

            {/* Loading indicator */}
            {isLoading && (
              <div className="flex justify-start mb-4">
                <div className="flex items-center gap-2 mr-2">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                    <Bot size={16} />
                  </div>
                </div>
                <div className="bg-muted px-4 py-2 rounded-2xl flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">
                    Thinking...
                  </span>
                </div>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 border-t">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              {error}
              <Button
                variant="ghost"
                size="sm"
                onClick={clearError}
                className="ml-2"
              >
                Dismiss
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t bg-muted/10">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={placeholder}
            disabled={isLoading}
            className="flex-1"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
          <Button
            type="submit"
            disabled={!inputValue.trim() || isLoading}
            size="icon"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </form>

        <p className="text-xs text-muted-foreground mt-2 text-center">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
