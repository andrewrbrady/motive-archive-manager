"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ModelType =
  | "gpt-4o-mini"
  | "deepseek-chat"
  | "deepseek-reasoner"
  | "claude-3-5-sonnet";

interface ModelSelectorProps {
  selectedModel: ModelType;
  onModelChange: (model: ModelType) => void;
  className?: string;
}

export function ModelSelector({
  selectedModel,
  onModelChange,
  className,
}: ModelSelectorProps) {
  const models: { id: ModelType; label: string; description: string }[] = [
    {
      id: "gpt-4o-mini",
      label: "GPT-4 Mini",
      description: "OpenAI's GPT-4 optimized model",
    },
    {
      id: "claude-3-5-sonnet",
      label: "Claude 3.5 Sonnet",
      description: "Anthropic's Claude 3.5 Sonnet model",
    },
    {
      id: "deepseek-chat",
      label: "DeepSeek Chat",
      description: "DeepSeek's V3 chat model",
    },
    {
      id: "deepseek-reasoner",
      label: "DeepSeek Reasoner",
      description: "DeepSeek's R1 reasoning model",
    },
  ];

  return (
    <div className={cn("space-y-4", className)}>
      <div className="text-sm font-medium text-text-secondary mb-2">
        Select AI Model
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        {models.map((model) => (
          <Button
            key={model.id}
            variant={selectedModel === model.id ? "default" : "secondary"}
            className="w-full justify-start text-left"
            onClick={() => onModelChange(model.id)}
          >
            <div className="flex flex-col items-start">
              <span className="font-medium">{model.label}</span>
              <span className="text-xs text-text-tertiary">
                {model.description}
              </span>
            </div>
          </Button>
        ))}
      </div>
    </div>
  );
}
