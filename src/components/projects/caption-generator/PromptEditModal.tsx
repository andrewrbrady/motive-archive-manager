"use client";

import React, { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/use-toast";
import PromptForm, {
  PromptFormData,
  PromptFormRef,
} from "@/components/admin/PromptForm";
import type { PromptTemplate } from "./types";

interface PromptEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  isCreating: boolean;
  selectedPrompt: PromptTemplate | null;
  model: string;
  provider: string;
  temperature: number;
  clientHandle: string | null;
  onPromptSaved: (prompt: PromptTemplate) => void;
  onModelChange: (model: string) => void;
  onProviderChange: (provider: string) => void;
  onTemperatureChange: (temperature: number) => void;
  onFormValuesUpdate: (values: {
    context: string;
    tone: string;
    style: string;
    platform: string;
    model: string;
    provider: string;
    temperature: number;
  }) => void;
}

export function PromptEditModal({
  isOpen,
  onClose,
  isCreating,
  selectedPrompt,
  model,
  provider,
  temperature,
  clientHandle,
  onPromptSaved,
  onModelChange,
  onProviderChange,
  onTemperatureChange,
  onFormValuesUpdate,
}: PromptEditModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [includeClientHandle, setIncludeClientHandle] = useState(false);
  const promptFormRef = useRef<PromptFormRef>(null);

  const handleSubmit = async (formData: PromptFormData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const method = isCreating ? "POST" : "PATCH";
      const url = "/api/caption-prompts";

      // Validate and normalize the length value to ensure it's in the allowed enum
      const validLengthValues = [
        "concise",
        "standard",
        "detailed",
        "comprehensive",
      ];
      let normalizedLength = formData.length;

      // If the length value is not in the allowed enum, map it to a valid one
      if (!validLengthValues.includes(formData.length)) {
        // Map common invalid values to valid ones
        if (formData.length.includes("comprehensive")) {
          normalizedLength = "comprehensive";
        } else if (formData.length.includes("detailed")) {
          normalizedLength = "detailed";
        } else if (formData.length.includes("standard")) {
          normalizedLength = "standard";
        } else if (formData.length.includes("concise")) {
          normalizedLength = "concise";
        } else {
          // Default fallback
          normalizedLength = "standard";
        }
      }

      const payload: Record<string, any> = {
        ...formData,
        length: normalizedLength, // Use the normalized length value
        aiModel: model,
        llmProvider: provider,
        modelParams: {
          temperature: temperature || undefined,
        },
      };

      if (!isCreating && selectedPrompt) {
        payload.id = selectedPrompt._id;
      }

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save prompt");
      }

      const result = await response.json();

      // Update form values to match the saved prompt
      onFormValuesUpdate({
        context: result.prompt || "",
        tone: result.tone || "professional",
        style: result.style || "descriptive",
        platform: result.platform || "instagram",
        model: result.aiModel || "claude-3-5-sonnet-20241022",
        provider: result.llmProvider || "anthropic",
        temperature: result.modelParams?.temperature || 1.0,
      });

      onPromptSaved(result);
      onClose();

      toast({
        title: "Success",
        description: isCreating
          ? "Prompt created successfully"
          : "Prompt updated successfully",
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "An unexpected error occurred while saving the prompt."
      );

      toast({
        title: "Error",
        description:
          err instanceof Error ? err.message : "Failed to save prompt",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col w-[95vw] sm:w-full">
        <DialogHeader className="flex-shrink-0 pb-2 border-b border-[hsl(var(--border-subtle))]">
          <DialogTitle className="text-xl font-bold text-[hsl(var(--foreground))] dark:text-white">
            {isCreating
              ? "Create New Prompt Template"
              : `Edit Prompt: ${selectedPrompt?.name || "Selected Prompt"}`}
          </DialogTitle>
          <DialogDescription className="text-sm text-[hsl(var(--foreground-muted))]">
            {isCreating
              ? "Define a new reusable prompt template for caption generation."
              : "Modify the existing prompt template, including its content, parameters, and AI model."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto overflow-x-hidden pb-4">
          {/* Client handle switch */}
          {clientHandle && (
            <div className="flex items-center gap-2 mb-3">
              <Switch
                id="include-client-handle"
                checked={includeClientHandle}
                onCheckedChange={setIncludeClientHandle}
              />
              <label htmlFor="include-client-handle" className="text-sm">
                Make client handle ({clientHandle}) available to prompt
              </label>
            </div>
          )}

          {/* Render PromptForm */}
          {isOpen && (
            <PromptForm
              ref={promptFormRef}
              key={
                isCreating
                  ? "new-prompt-form"
                  : selectedPrompt?._id || "edit-prompt-form"
              }
              prompt={
                isCreating
                  ? undefined
                  : selectedPrompt
                    ? ({
                        ...selectedPrompt,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                        isDefault: false,
                        includeClientHandle: false,
                      } as any)
                    : undefined
              }
              isSubmitting={isSubmitting}
              externalAiModel={model}
              onCancel={onClose}
              onSubmit={handleSubmit}
              renderModelSelector={() => (
                <div className="space-y-3 p-3 border border-[hsl(var(--border-subtle))] rounded-lg bg-[var(--background-secondary)]">
                  <div className="flex items-center gap-1">
                    <div className="h-px bg-[hsl(var(--border-subtle))] flex-1"></div>
                    <span className="text-xs font-medium text-[hsl(var(--foreground-muted))] uppercase tracking-wide">
                      AI Model Configuration
                    </span>
                    <div className="h-px bg-[hsl(var(--border-subtle))] flex-1"></div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-[hsl(var(--foreground-muted))] uppercase tracking-wide">
                        AI Provider
                      </label>
                      <select
                        className="w-full border rounded p-2 bg-transparent text-[hsl(var(--foreground))] border-[hsl(var(--border-subtle))] text-sm"
                        value={provider}
                        onChange={(e) => {
                          const newProvider = e.target.value as any;
                          onProviderChange(newProvider);
                        }}
                      >
                        <option value="anthropic">Anthropic</option>
                        <option value="openai">OpenAI</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-[hsl(var(--foreground-muted))] uppercase tracking-wide">
                        AI Model
                      </label>
                      <select
                        className="w-full border rounded p-2 bg-transparent text-[hsl(var(--foreground))] border-[hsl(var(--border-subtle))] text-sm"
                        value={model}
                        onChange={(e) => onModelChange(e.target.value)}
                      >
                        <option value="claude-3-5-sonnet-20241022">
                          Claude 3.5 Sonnet
                        </option>
                        <option value="gpt-4o">GPT-4o</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-[hsl(var(--foreground-muted))] uppercase tracking-wide">
                      Temperature: {temperature}
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="2"
                      step="0.1"
                      value={temperature}
                      onChange={(e) =>
                        onTemperatureChange(parseFloat(e.target.value))
                      }
                      className="w-full"
                    />
                  </div>
                </div>
              )}
            />
          )}

          {error && (
            <p className="mt-3 text-sm text-destructive-500 dark:text-destructive-400 text-center">
              {error}
            </p>
          )}
        </div>

        <div className="flex-shrink-0 flex justify-end gap-3 pt-4 border-t border-[hsl(var(--border-subtle))]">
          <Button onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => promptFormRef.current?.submit()}
            disabled={isSubmitting}
          >
            {isSubmitting
              ? "Submitting..."
              : isCreating
                ? "Create Prompt"
                : "Save Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
