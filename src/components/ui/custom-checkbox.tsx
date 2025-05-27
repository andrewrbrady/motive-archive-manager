"use client";

import React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface CustomCheckboxProps {
  id: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
  className?: string;
  disabled?: boolean;
}

export function CustomCheckbox({
  id,
  checked,
  onCheckedChange,
  label,
  className = "",
  disabled = false,
}: CustomCheckboxProps) {
  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        className="h-4 w-4 data-[state=checked]:bg-foreground data-[state=checked]:border-foreground data-[state=checked]:text-background"
      />
      <Label
        htmlFor={id}
        className="text-xs font-medium text-[hsl(var(--foreground-muted))] uppercase tracking-wide cursor-pointer select-none"
      >
        {label}
      </Label>
    </div>
  );
}
