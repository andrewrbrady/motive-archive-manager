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
    <div className={cn("space-y-2", className)}>
      <Input
        placeholder="What should we focus on? (optional)"
        value={focus}
        onChange={(e) => onFocusChange?.(e.target.value)}
        className="w-full"
      />
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Select a model" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="claude-3-5-sonnet-20241022">
            Claude 3.5 Sonnet
          </SelectItem>
          <SelectItem value="gpt-4o-mini">GPT-4 Mini</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

export type { ModelSelectorProps };
