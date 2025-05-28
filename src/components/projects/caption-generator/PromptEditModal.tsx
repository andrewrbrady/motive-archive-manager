"use client";

import React, { useRef, useState, useMemo } from "react";
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
import { llmProviders, ProviderId } from "@/lib/llmProviders";
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
  provider: ProviderId;
  temperature: number;
  clientHandle: string | null;
  onPromptSaved: (prompt: PromptTemplate) => void;
  onModelChange: (model: string) => void;
  onProviderChange: (provider: ProviderId) => void;
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
  currentFormValues?: {
    context: string;
    platform: string;
    tone: string;
    style: string;
  };
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
  currentFormValues,
}: PromptEditModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [includeClientHandle, setIncludeClientHandle] = useState(false);
  const promptFormRef = useRef<PromptFormRef>(null);

  // Memoize the prompt object to prevent unnecessary re-renders
  const memoizedPrompt = useMemo(() => {
    if (isCreating || !selectedPrompt) return undefined;

    return {
      ...selectedPrompt,
      platform: currentFormValues?.platform || selectedPrompt.platform,
      tone: currentFormValues?.tone || selectedPrompt.tone,
      style: currentFormValues?.style || selectedPrompt.style,
      prompt: currentFormValues?.context || selectedPrompt.prompt,
      length: selectedPrompt.length,
      aiModel: model,
      llmProvider: provider,
      modelParams: {
        temperature: temperature,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      isDefault: false,
      includeClientHandle: false,
    } as any;
  }, [
    isCreating,
    selectedPrompt,
    currentFormValues,
    model,
    provider,
    temperature,
  ]);

  const handleSubmit = async (formData: PromptFormData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const promptData = {
        ...formData,
        aiModel: model,
        llmProvider: provider,
        modelParams: {
          temperature: temperature,
        },
      };

      const url = isCreating ? "/api/caption-prompts" : "/api/caption-prompts";
      const method = isCreating ? "POST" : "PATCH";

      const body = isCreating
        ? promptData
        : { id: selectedPrompt?._id, ...promptData };

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save prompt");
      }

      const savedPrompt = await response.json();

      const promptTemplate: PromptTemplate = {
        _id: savedPrompt._id || selectedPrompt?._id || "",
        name: promptData.name,
        prompt: promptData.prompt,
        aiModel: promptData.aiModel,
        llmProvider: promptData.llmProvider,
        platform: promptData.platform,
        tone: promptData.tone,
        style: promptData.style,
        length: promptData.length,
        modelParams: promptData.modelParams,
      };

      onPromptSaved(promptTemplate);
    } catch (err) {
      console.error("PromptEditModal handleSubmit error:", err);
      setError(
        err instanceof Error ? err.message : "An unknown error occurred"
      );
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
              prompt={memoizedPrompt}
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
                          const newProvider = e.target.value as ProviderId;
                          onProviderChange(newProvider);
                          // Auto-select appropriate model for the provider
                          const providerModels =
                            llmProviders[newProvider]?.models || [];
                          if (!providerModels.some((m) => m.id === model)) {
                            onModelChange(providerModels[0]?.id || "");
                          }
                        }}
                      >
                        {Object.values(llmProviders)
                          .filter((p) => p.models.length > 0)
                          .map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
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
                        {(llmProviders[provider]?.models || []).map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-[hsl(var(--foreground-muted))] uppercase tracking-wide">
                      Temperature: {temperature}
                    </label>
                    <div className="relative">
                      <input
                        type="range"
                        min="0"
                        max="2"
                        step="0.1"
                        value={temperature}
                        onChange={(e) =>
                          onTemperatureChange(parseFloat(e.target.value))
                        }
                        className="w-full h-2 bg-gradient-to-r from-blue-500 via-purple-500 to-red-500 rounded-lg appearance-none cursor-pointer slider"
                        style={{
                          background: `linear-gradient(to right, 
                            #3b82f6 0%, 
                            #8b5cf6 ${(temperature / 2) * 100}%, 
                            #ef4444 100%)`,
                        }}
                      />
                      <style jsx>{`
                        .slider::-webkit-slider-thumb {
                          appearance: none;
                          height: 20px;
                          width: 20px;
                          border-radius: 50%;
                          background: #ffffff;
                          border: 2px solid #3b82f6;
                          cursor: pointer;
                          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
                        }
                        .slider::-moz-range-thumb {
                          height: 20px;
                          width: 20px;
                          border-radius: 50%;
                          background: #ffffff;
                          border: 2px solid #3b82f6;
                          cursor: pointer;
                          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
                        }
                      `}</style>
                    </div>
                    <div className="flex justify-between text-xs text-[hsl(var(--foreground-muted))]">
                      <span>Conservative</span>
                      <span>Balanced</span>
                      <span>Creative</span>
                    </div>
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
