"use client";

import React, { ReactNode } from "react";

interface ToolbarRowProps {
  left?: ReactNode;
  right?: ReactNode;
  children?: ReactNode;
  className?: string;
}

// Lightweight shared toolbar row to keep padding/spacing consistent
export function ToolbarRow({ left, right, children, className }: ToolbarRowProps) {
  const base = "py-2"; // minimal, consistent vertical padding
  const cls = [base, className].filter(Boolean).join(" ");

  if (left || right) {
    return (
      <div className={cls}>
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2 min-w-0">{left}</div>
          <div className="flex items-center gap-2">{right}</div>
        </div>
      </div>
    );
  }

  return (
    <div className={cls}>
      <div className="flex items-center justify-end gap-2 w-full">{children}</div>
    </div>
  );
}

