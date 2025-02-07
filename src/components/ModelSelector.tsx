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
import type { ModelType } from "@/types/models";

interface ModelSelectorProps {
  value: ModelType;
  onChange: (value: ModelType) => void;
}

export function ModelSelector({ value, onChange }: ModelSelectorProps) {
  return (
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
  );
}

export type { ModelSelectorProps };
