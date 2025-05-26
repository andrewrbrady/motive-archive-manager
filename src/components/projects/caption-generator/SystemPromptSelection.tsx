"use client";

import React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SystemPrompt } from "./types";

interface SystemPromptSelectionProps {
  systemPrompts: SystemPrompt[];
  selectedSystemPromptId: string;
  loadingSystemPrompts: boolean;
  systemPromptError: string | null;
  onSystemPromptChange: (promptId: string) => void;
}

export function SystemPromptSelection({
  systemPrompts,
  selectedSystemPromptId,
  loadingSystemPrompts,
  systemPromptError,
  onSystemPromptChange,
}: SystemPromptSelectionProps) {
  return (
    <div className="space-y-3 p-4 rounded-lg bg-[var(--background-secondary)] border border-[hsl(var(--border-subtle))]">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-[hsl(var(--foreground))] dark:text-white">
          System Prompt
        </h3>
        {systemPromptError && (
          <span className="text-xs text-red-500">{systemPromptError}</span>
        )}
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium text-[hsl(var(--foreground-muted))] uppercase tracking-wide">
          Select System Prompt
        </label>
        <Select
          value={selectedSystemPromptId}
          onValueChange={onSystemPromptChange}
          disabled={loadingSystemPrompts || systemPrompts.length === 0}
        >
          <SelectTrigger className="w-full bg-transparent border-[hsl(var(--border))]">
            <SelectValue
              placeholder={
                loadingSystemPrompts
                  ? "Loading system prompts..."
                  : systemPrompts.length === 0
                    ? "No system prompts available"
                    : "Select a system prompt..."
              }
            />
          </SelectTrigger>
          <SelectContent>
            {systemPrompts.map((prompt) => (
              <SelectItem key={prompt._id} value={prompt._id}>
                <div className="flex items-center gap-2 w-full">
                  <span className="truncate">{prompt.name}</span>
                  {prompt.isActive && (
                    <span className="text-xs bg-blue-100 text-blue-800 px-1 rounded">
                      Active
                    </span>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedSystemPromptId && (
          <div className="text-xs text-[hsl(var(--foreground-muted))]">
            {
              systemPrompts.find((p) => p._id === selectedSystemPromptId)
                ?.description
            }
          </div>
        )}
      </div>
    </div>
  );
}
