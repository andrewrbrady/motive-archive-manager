"use client";

import React, { useCallback, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Type, Image, Heading, GripVertical, Minus } from "lucide-react";

import { BlockContent } from "./BlockContent";
import { ContentBlock, ContentBlockType } from "./types";

/**
 * BlockEditor - Individual block editor component
 * Phase 1 Performance: Extracted from BlockComposer.tsx for better maintainability
 * PHASE 3B+ PERFORMANCE FIX: Simplified implementation prioritizing drag functionality
 */
interface BlockEditorProps {
  block: ContentBlock;
  blocks: ContentBlock[];
  index: number;
  total: number;
  isDragging: boolean;
  isActive: boolean;
  onUpdate: (updates: Partial<ContentBlock>) => void;
  onRemove: () => void;
  onMove: (direction: "up" | "down") => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDragOver: () => void;
  onSetActive: () => void;
  onBlocksChange: (blocks: ContentBlock[]) => void;
}

function BlockEditor({
  block,
  blocks,
  index,
  total,
  isDragging,
  isActive,
  onUpdate,
  onRemove,
  onMove,
  onDragStart,
  onDragEnd,
  onDragOver,
  onSetActive,
  onBlocksChange,
}: BlockEditorProps) {
  const getBlockIcon = (type: ContentBlockType) => {
    switch (type) {
      case "text":
        return <Type className="h-4 w-4" />;
      case "image":
        // eslint-disable-next-line jsx-a11y/alt-text
        return <Image className="h-4 w-4" />;
      case "heading":
        return <Heading className="h-4 w-4" />;
      case "divider":
        return <Minus className="h-4 w-4" />;
      default:
        return <Type className="h-4 w-4" />;
    }
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("text/plain", block.id);
    e.dataTransfer.effectAllowed = "move";
    onDragStart();
  };

  const handleDragEnd = () => {
    onDragEnd();
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    onDragOver();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    // The actual reordering logic is handled by the parent component
    // We just need to prevent default to allow the drop
  };

  return (
    <div
      className={`relative group transition-all duration-200 ease-out ${
        isDragging ? "opacity-50 scale-[0.98] z-50" : ""
      }`}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <Card
        className={`bg-transparent border transition-all duration-200 cursor-pointer relative ${
          isDragging
            ? "border-primary shadow-lg"
            : isActive
              ? "border-blue-500 shadow-md bg-blue-50/10"
              : "border-border/40 hover:border-border/60"
        }`}
        onClick={onSetActive}
      >
        {/* Hover-Only Controls Overlay */}
        <div className="absolute top-2 right-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
          <div className="flex items-center space-x-1 bg-black/70 backdrop-blur-sm rounded-md p-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onMove("up");
              }}
              disabled={index === 0}
              className="h-6 w-6 p-0 text-white hover:bg-white/20 disabled:opacity-50"
              title="Move up"
            >
              ↑
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onMove("down");
              }}
              disabled={index === total - 1}
              className="h-6 w-6 p-0 text-white hover:bg-white/20 disabled:opacity-50"
              title="Move down"
            >
              ↓
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              className="h-6 w-6 p-0 text-white hover:bg-red-500/20"
              title="Remove block"
            >
              ×
            </Button>
          </div>
        </div>

        <CardContent>
          <BlockContent
            block={block}
            blocks={blocks}
            onUpdate={onUpdate}
            onBlocksChange={onBlocksChange}
          />
        </CardContent>
      </Card>

      {/* Full-Height Drag Handle - Right Edge */}
      <div
        className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-r from-transparent to-muted/30 hover:to-muted/50 rounded-r-lg flex items-center justify-center cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-all duration-150 z-10"
        draggable
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        title="Drag to reorder block"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
    </div>
  );
}

export { BlockEditor };
