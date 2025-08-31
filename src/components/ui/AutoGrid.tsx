"use client";

import React from "react";
import { cn } from "@/lib/utils";

type ColSpec = string | { cols: string };

interface AutoGridProps {
  children: React.ReactNode;
  zoomLevel?: number; // 1..5 typical
  colsMap: Record<number, ColSpec>; // supports string or { cols }
  baseCols?: string; // default base grid cols
  gap?: string; // tailwind gap class e.g., "gap-4"
  className?: string;
}

export function AutoGrid({
  children,
  zoomLevel,
  colsMap,
  baseCols = "grid grid-cols-1",
  gap = "gap-4",
  className,
}: AutoGridProps) {
  const raw = (zoomLevel && colsMap[zoomLevel]) ? colsMap[zoomLevel] : colsMap[3];
  const cols = typeof raw === "string" ? raw : raw?.cols || "";
  const gridClass = cn(baseCols, cols, gap, className);

  return <div className={gridClass}>{children}</div>;
}

export default AutoGrid;
