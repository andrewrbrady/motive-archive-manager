"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

export type ModelType = "claude-3-5-sonnet-20241022" | "gpt-4o-mini";

interface ModelSelectorProps {
  value: ModelType;
  onChange: (value: ModelType) => void;
  className?: string;
  focus?: string;
  onFocusChange?: (focus: string) => void;
}

export function ModelSelector({
  value,
  onChange,
  className,
  focus = "",
  onFocusChange,
}: ModelSelectorProps) {
  return (
    <div className={cn("relative", className)}>
      {onFocusChange && (
        <Input
          placeholder="What should we focus on? (optional)"
          value={focus}
          onChange={(e) => onFocusChange?.(e.target.value)}
          className="w-full mb-1"
        />
      )}
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full h-6 text-xs">
          <SelectValue placeholder="Select a model" />
        </SelectTrigger>
        <SelectContent align="end" className="z-50">
          <SelectItem value="claude-3-5-sonnet-20241022" className="text-xs">
            Claude 3.5 Sonnet
          </SelectItem>
          <SelectItem value="gpt-4o-mini" className="text-xs">
            GPT-4 Mini
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

export type { ModelSelectorProps };
