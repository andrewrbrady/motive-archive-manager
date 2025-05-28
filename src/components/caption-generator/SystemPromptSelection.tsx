import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LoadingContainer } from "@/components/ui/loading";
import { MessageSquare, AlertCircle } from "lucide-react";
import type { SystemPrompt } from "./types";

interface SystemPromptSelectionProps {
  systemPrompts: SystemPrompt[];
  selectedSystemPromptId: string | null;
  onSystemPromptChange: (promptId: string) => void;
  loading: boolean;
  error: string | null;
}

export function SystemPromptSelection({
  systemPrompts,
  selectedSystemPromptId,
  onSystemPromptChange,
  loading,
  error,
}: SystemPromptSelectionProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4" />
          System Prompt
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <LoadingContainer />
        ) : error ? (
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">{error}</span>
          </div>
        ) : (
          <Select
            value={selectedSystemPromptId || ""}
            onValueChange={onSystemPromptChange}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a system prompt" />
            </SelectTrigger>
            <SelectContent>
              {systemPrompts.map((prompt) => (
                <SelectItem key={prompt._id} value={prompt._id}>
                  <div>
                    <div className="font-medium">{prompt.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {prompt.description}
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </CardContent>
    </Card>
  );
}
