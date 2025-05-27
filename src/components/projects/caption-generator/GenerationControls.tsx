"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Instagram, Youtube, Eye, EyeOff } from "lucide-react";
import type { LengthSetting } from "./types";
import { findModelById } from "@/lib/llmProviders";
import { getIconComponent } from "@/components/ui/IconPicker";

interface GenerationControlsProps {
  selectedCarIds: string[];
  promptList: any[];
  selectedPrompt: any | null;
  promptLoading: boolean;
  promptError: string | null;
  onPromptChange: (promptId: string) => void;
  onEditPrompt: () => void;
  onNewPrompt: () => void;
  additionalContext: string;
  onAdditionalContextChange: (value: string) => void;
  context: string;
  platform: string;
  tone: string;
  style: string;
  derivedLength: LengthSetting | null;
  selectedEventIds: string[];
  useMinimalCarData: boolean;
  onUseMinimalCarDataChange: (checked: boolean) => void;
  showPreview: boolean;
  onShowPreviewToggle: () => void;
  editableLLMText: string;
  onEditableLLMTextChange: (text: string) => void;
  onRefreshLLMText: () => void;
  selectedSystemPromptId: string;
  systemPrompts: any[];
  projectCars: any[];
  projectEvents: any[];
  model: string;
  temperature: number;
  isGenerating: boolean;
  onGenerate: () => void;
  error: string | null;
}

export function GenerationControls({
  selectedCarIds,
  promptList,
  selectedPrompt,
  promptLoading,
  promptError,
  onPromptChange,
  onEditPrompt,
  onNewPrompt,
  additionalContext,
  onAdditionalContextChange,
  context,
  platform,
  tone,
  style,
  derivedLength,
  selectedEventIds,
  useMinimalCarData,
  onUseMinimalCarDataChange,
  showPreview,
  onShowPreviewToggle,
  editableLLMText,
  onEditableLLMTextChange,
  onRefreshLLMText,
  selectedSystemPromptId,
  systemPrompts,
  projectCars,
  projectEvents,
  model,
  temperature,
  isGenerating,
  onGenerate,
  error,
}: GenerationControlsProps) {
  if (selectedCarIds.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
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
            onValueChange={(promptId) => {
              if (promptId === "__PROMPT_NONE__") {
                onPromptChange("");
                return;
              }
              onPromptChange(promptId);
            }}
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
                    {selectedPrompt.platform &&
                      (() => {
                        const IconComponent = getIconComponent(
                          selectedPrompt.platform
                        );
                        return IconComponent ? (
                          <IconComponent className="w-4 h-4 flex-shrink-0" />
                        ) : null;
                      })()}
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
                    {prompt.platform &&
                      (() => {
                        const IconComponent = getIconComponent(prompt.platform);
                        return IconComponent ? (
                          <IconComponent className="w-4 h-4 flex-shrink-0" />
                        ) : null;
                      })()}
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

      {/* Show summary of selected prompt/model */}
      <div className="p-4 rounded-lg bg-[var(--background-secondary)] border border-[hsl(var(--border-subtle))]">
        <div className="flex flex-col gap-3">
          <div>
            <div className="text-xs text-[hsl(var(--foreground-muted))] mb-1">
              Prompt Template
            </div>
            <div className="font-medium text-[hsl(var(--foreground))] dark:text-white whitespace-pre-line">
              {context || "No prompt template selected"}
            </div>
          </div>
          {additionalContext && (
            <div>
              <div className="text-xs text-[hsl(var(--foreground-muted))] mb-1">
                Additional Context
              </div>
              <div className="font-medium text-[hsl(var(--foreground))] dark:text-white whitespace-pre-line">
                {additionalContext}
              </div>
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-3 mt-3 text-xs text-[hsl(var(--foreground-muted))]">
          <div className="flex items-center gap-1">
            {platform === "instagram" && <Instagram className="w-3 h-3" />}
            {platform === "youtube" && <Youtube className="w-3 h-3" />}
            <span className="font-semibold text-[hsl(var(--foreground))] dark:text-white">
              {platform}
            </span>
          </div>
          <span>
            Tone:{" "}
            <span className="font-semibold text-[hsl(var(--foreground))] dark:text-white">
              {tone}
            </span>
          </span>
          <span>
            Style:{" "}
            <span className="font-semibold text-[hsl(var(--foreground))] dark:text-white">
              {style}
            </span>
          </span>
          <span>
            Length:{" "}
            <span className="font-semibold text-[hsl(var(--foreground))] dark:text-white">
              {derivedLength?.name || "No length selected"}
            </span>
          </span>
          <span>
            Cars:{" "}
            <span className="font-semibold text-[hsl(var(--foreground))] dark:text-white">
              {selectedCarIds.length}
            </span>
          </span>
          {selectedEventIds.length > 0 && (
            <span>
              Events:{" "}
              <span className="font-semibold text-[hsl(var(--foreground))] dark:text-white">
                {selectedEventIds.length}
              </span>
            </span>
          )}
        </div>
      </div>

      {/* Data Filtering Options */}
      <div className="space-y-3 p-4 rounded-lg bg-[var(--background-secondary)] border border-[hsl(var(--border-subtle))]">
        <div className="text-sm font-medium text-[hsl(var(--foreground))] dark:text-white">
          Data Filtering Options
        </div>
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="minimal-car-data"
              checked={useMinimalCarData}
              onCheckedChange={(checked) => {
                onUseMinimalCarDataChange(checked as boolean);
              }}
            />
            <label
              htmlFor="minimal-car-data"
              className="text-sm text-[hsl(var(--foreground))] dark:text-white cursor-pointer"
            >
              Use minimal car data
            </label>
          </div>
          <p className="text-xs text-[hsl(var(--foreground-muted))] ml-6">
            Excludes car descriptions from the data sent to the LLM to reduce
            verbosity
          </p>
        </div>
      </div>

      {/* LLM Preview Toggle */}
      <div className="space-y-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onShowPreviewToggle}
          className="w-full justify-center gap-2 border-[hsl(var(--border))]"
        >
          {showPreview ? (
            <>
              <EyeOff className="w-4 h-4" />
              Hide LLM Preview
            </>
          ) : (
            <>
              <Eye className="w-4 h-4" />
              Show LLM Preview
            </>
          )}
        </Button>

        {showPreview && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-4 rounded-lg bg-[var(--background-secondary)] border border-[hsl(var(--border-subtle))]">
            {/* Left Panel - Informative Overview */}
            <div className="space-y-3">
              <div className="text-sm font-medium text-[hsl(var(--foreground))] dark:text-white">
                Selection Overview
              </div>

              {/* System Prompt Info */}
              <div className="space-y-1">
                <div className="text-xs text-[hsl(var(--foreground-muted))] font-medium">
                  System Prompt
                </div>
                <div className="text-xs text-[hsl(var(--foreground))] dark:text-white">
                  {(() => {
                    if (!selectedSystemPromptId) {
                      return "No system prompt selected";
                    }

                    const foundPrompt = systemPrompts.find(
                      (p) => p._id === selectedSystemPromptId
                    );
                    if (!foundPrompt) {
                      return `System prompt not found (ID: ${selectedSystemPromptId})`;
                    }

                    return foundPrompt.name;
                  })()}
                </div>
              </div>

              {/* Length Info */}
              <div className="space-y-1">
                <div className="text-xs text-[hsl(var(--foreground-muted))] font-medium">
                  Length Setting
                </div>
                <div className="text-xs text-[hsl(var(--foreground))] dark:text-white">
                  {derivedLength
                    ? `${derivedLength.name} - ${derivedLength.description}`
                    : "No length selected"}
                </div>
              </div>

              {/* Cars Info */}
              <div className="space-y-1">
                <div className="text-xs text-[hsl(var(--foreground-muted))] font-medium">
                  Selected Cars ({selectedCarIds.length})
                </div>
                <div className="text-xs text-[hsl(var(--foreground))] dark:text-white max-h-20 overflow-y-auto">
                  {selectedCarIds
                    .map((carId) => {
                      const car = projectCars.find((c) => c._id === carId);
                      return car
                        ? `${car.year} ${car.make} ${car.model}`
                        : carId;
                    })
                    .join(", ") || "None"}
                </div>
              </div>

              {/* Events Info */}
              {selectedEventIds.length > 0 && (
                <div className="space-y-1">
                  <div className="text-xs text-[hsl(var(--foreground-muted))] font-medium">
                    Selected Events ({selectedEventIds.length})
                  </div>
                  <div className="text-xs text-[hsl(var(--foreground))] dark:text-white max-h-20 overflow-y-auto">
                    {selectedEventIds
                      .map((eventId) => {
                        const event = projectEvents.find(
                          (e) => e.id === eventId
                        );
                        return event ? event.title : eventId;
                      })
                      .join(", ")}
                  </div>
                </div>
              )}

              {/* Generation Settings */}
              <div className="space-y-1">
                <div className="text-xs text-[hsl(var(--foreground-muted))] font-medium">
                  Settings
                </div>
                <div className="text-xs text-[hsl(var(--foreground))] dark:text-white">
                  {platform} • {tone} • {style} •{" "}
                  {findModelById(model)?.model.name || model} • temp:{" "}
                  {temperature}
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={onRefreshLLMText}
                className="w-full text-xs"
              >
                Refresh LLM Text
              </Button>
            </div>

            {/* Right Panel - Editable LLM Text */}
            <div className="space-y-2">
              <div className="text-sm font-medium text-[hsl(var(--foreground))] dark:text-white">
                Editable LLM Input
              </div>
              <div className="text-xs text-[hsl(var(--foreground-muted))]">
                Edit this text to remove verbose descriptions or add custom
                instructions. This exact text will be sent to the LLM.
              </div>
              <Textarea
                value={editableLLMText}
                onChange={(e) => onEditableLLMTextChange(e.target.value)}
                className="min-h-[300px] max-h-[400px] text-xs font-mono bg-[var(--background-primary)] border border-[hsl(var(--border-subtle))] text-[hsl(var(--foreground))] dark:text-white resize-none"
                placeholder="LLM input will appear here when you select cars and system prompt..."
              />
            </div>
          </div>
        )}
      </div>

      {/* Generate Button */}
      <Button
        onClick={onGenerate}
        disabled={
          isGenerating ||
          selectedCarIds.length === 0 ||
          !selectedSystemPromptId ||
          !selectedPrompt
        }
        variant="outline"
        className="w-full bg-[var(--background-primary)] hover:bg-black dark:bg-[var(--background-primary)] dark:hover:bg-black text-white border-[hsl(var(--border))]"
      >
        {isGenerating ? "Generating..." : "Generate Caption"}
      </Button>

      {error && (
        <p className="text-sm text-destructive-500 dark:text-destructive-400">
          {error}
        </p>
      )}
    </div>
  );
}
