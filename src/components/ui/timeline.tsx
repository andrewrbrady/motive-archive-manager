"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface TimelineItem {
  id: string;
  title: string;
  startDay: number;
  endDay: number;
  onUpdate: (startDay: number, endDay: number) => void;
}

interface TimelineProps {
  items: TimelineItem[];
  maxDays: number;
  onReorder: (fromIndex: number, toIndex: number) => void;
}

export function Timeline({ items, maxDays, onReorder }: TimelineProps) {
  const [draggingIndex, setDraggingIndex] = React.useState<number | null>(null);

  const handleDragStart = (index: number) => {
    setDraggingIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggingIndex === null || draggingIndex === index) return;
  };

  const handleDrop = (e: React.DragEvent, toIndex: number) => {
    e.preventDefault();
    if (draggingIndex === null || draggingIndex === toIndex) return;
    onReorder(draggingIndex, toIndex);
    setDraggingIndex(null);
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm font-medium">Timeline</div>
        <div className="text-sm text-muted-foreground">{maxDays} days</div>
      </div>
      <div className="space-y-2">
        {items.map((item, index) => (
          <div
            key={item.id}
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDrop={(e) => handleDrop(e, index)}
            className={cn(
              "relative flex items-center p-2 rounded-lg border cursor-move",
              draggingIndex === index && "opacity-50"
            )}
          >
            <div className="flex-1">
              <div className="text-sm font-medium">{item.title}</div>
              <div className="text-sm text-muted-foreground">
                Day {item.startDay} - {item.endDay}
              </div>
            </div>
            <div
              className="absolute left-0 h-2 bg-primary rounded"
              style={{
                width: `${((item.endDay - item.startDay) / maxDays) * 100}%`,
                left: `${(item.startDay / maxDays) * 100}%`,
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
