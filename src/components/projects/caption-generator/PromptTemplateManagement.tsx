"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Instagram, Youtube } from "lucide-react";

interface PromptTemplate {
  _id: string;
  name: string;
  prompt: string;
  platform: string;
  tone: string;
  style: string;
  length: string;
  aiModel: string;
  llmProvider: string;
  modelParams?: {
    temperature?: number;
  };
}

interface PromptTemplateManagementProps {
  selectedPrompt: PromptTemplate | null;
  promptList: PromptTemplate[];
  promptLoading: boolean;
  promptError: string | null;
  additionalContext: string;
  onPromptChange: (promptId: string) => void;
  onAdditionalContextChange: (context: string) => void;
  onEditPrompt: () => void;
  onNewPrompt: () => void;
}

export function PromptTemplateManagement({
  selectedPrompt,
  promptList,
  promptLoading,
  promptError,
  additionalContext,
  onPromptChange,
  onAdditionalContextChange,
  onEditPrompt,
  onNewPrompt,
}: PromptTemplateManagementProps) {
  return (
    <div className="space-y-4">
      {/* Prompt Selection and Action Buttons */}
      <div className="grid grid-cols-[1fr_auto_auto] items-end gap-2">
        <div className="flex-grow">
          <label
            htmlFor="main-prompt-select"
            className="block text-xs font-medium mb-1 text-[hsl(var(--foreground-muted))]"
          >
            Active Prompt Template
          </label>
          <Select
            value={selectedPrompt?._id || ""}
            onValueChange={onPromptChange}
            disabled={
              promptLoading || (promptList.length === 0 && !promptError)
            }
          >
            <SelectTrigger
              id="main-prompt-select"
              className="w-full bg-transparent border-[hsl(var(--border))]"
            >
              <SelectValue
                placeholder={
                  promptLoading
                    ? "Loading prompts..."
                    : promptError
                      ? "Error loading"
                      : "Select a prompt..."
                }
              >
                {selectedPrompt && (
                  <div className="flex items-center gap-2 truncate">
                    {selectedPrompt.platform === "instagram" && (
                      <Instagram className="w-4 h-4 flex-shrink-0" />
                    )}
                    {selectedPrompt.platform === "youtube" && (
                      <Youtube className="w-4 h-4 flex-shrink-0" />
                    )}
                    <span className="truncate">{selectedPrompt.name}</span>
                  </div>
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {promptError && (
                <SelectItem
                  value="__ERROR__"
                  disabled
                  className="text-destructive-500"
                >
                  Error: {promptError}
                </SelectItem>
              )}
              {!promptError && promptList.length === 0 && !promptLoading && (
                <SelectItem value="__NO_PROMPTS__" disabled>
                  No prompts. Click 'New' to create.
                </SelectItem>
              )}
              <SelectItem value="__PROMPT_NONE__">-- None --</SelectItem>
              {promptList.map((prompt) => (
                <SelectItem key={prompt._id} value={prompt._id}>
                  <div className="flex items-center gap-2 w-full">
                    {prompt.platform === "instagram" && (
                      <Instagram className="w-4 h-4 flex-shrink-0" />
                    )}
                    {prompt.platform === "youtube" && (
                      <Youtube className="w-4 h-4 flex-shrink-0" />
                    )}
                    <span className="truncate">{prompt.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          variant="outline"
          onClick={onEditPrompt}
          disabled={!selectedPrompt}
          className="border-[hsl(var(--border))]"
        >
          Edit
        </Button>
        <Button
          variant="outline"
          onClick={onNewPrompt}
          className="border-[hsl(var(--border))]"
        >
          New
        </Button>
      </div>

      {/* Additional Context Input */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-[hsl(var(--foreground-muted))] uppercase tracking-wide">
          Additional Context
        </label>
        <Textarea
          value={additionalContext}
          onChange={(e) => onAdditionalContextChange(e.target.value)}
          placeholder="Add specific context, instructions, or details for this caption generation..."
          className="min-h-[80px] bg-transparent border-[hsl(var(--border))] text-[hsl(var(--foreground))] dark:text-white"
        />
        <p className="text-xs text-[hsl(var(--foreground-muted))]">
          This will be combined with your selected prompt template to provide
          more specific guidance to the AI.
        </p>
      </div>
    </div>
  );
}
