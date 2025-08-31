"use client";

import React, { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ToolbarRowProps {
  left?: ReactNode;
  right?: ReactNode;
  className?: string;
}

export function ToolbarRow({ left, right, className }: ToolbarRowProps) {
  return (
    <div className={cn("py-2", className)}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">{left}</div>
        <div className="flex items-center gap-2">{right}</div>
      </div>
    </div>
  );
}

export default ToolbarRow;

