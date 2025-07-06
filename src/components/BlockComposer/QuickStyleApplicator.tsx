"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Palette, Sparkles } from "lucide-react";
import { ContentBlock, TextBlock } from "../content-studio/types";
import { api } from "@/lib/api-client";
import { StylesheetResponse } from "@/types/stylesheet";
import { useToast } from "@/components/ui/use-toast";

interface QuickStyleApplicatorProps {
  selectedStylesheetId: string | null;
  blocks: ContentBlock[];
  onBlocksChange: (blocks: ContentBlock[]) => void;
}

/**
 * QuickStyleApplicator - Automatically applies common CSS classes to content blocks
 *
 * This component helps users quickly apply common CSS classes from their stylesheet
 * to text blocks based on content patterns and block types.
 */
export function QuickStyleApplicator({
  selectedStylesheetId,
  blocks,
  onBlocksChange,
}: QuickStyleApplicatorProps) {
  const { toast } = useToast();
  const [availableClasses, setAvailableClasses] = useState<
    Array<{
      name: string;
      description?: string;
      category?: string;
    }>
  >([]);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    if (selectedStylesheetId) {
      loadStylesheetClasses();
    } else {
      setAvailableClasses([]);
    }
  }, [selectedStylesheetId]);

  const loadStylesheetClasses = async () => {
    if (!selectedStylesheetId) return;

    try {
      const response = await api.get<StylesheetResponse>(
        `/stylesheets/${selectedStylesheetId}`
      );
      const classes = response.stylesheet.parsedCSS.classes.map((cls) => ({
        name: cls.name,
        description: cls.description,
        category: cls.category,
      }));
      setAvailableClasses(classes);
    } catch (error) {
      console.error("Failed to load stylesheet classes:", error);
    }
  };

  const applyQuickStyles = async () => {
    if (!selectedStylesheetId || availableClasses.length === 0) return;

    setApplying(true);

    try {
      const updatedBlocks = blocks.map((block) => {
        if (block.type !== "text") return block;

        const textBlock = block as TextBlock;

        // Skip if already has a CSS class assigned
        if (textBlock.cssClassName) return textBlock;

        // Auto-assign classes based on content and element type
        let suggestedClassName = null;

        const content = textBlock.content?.toLowerCase() || "";
        const element = textBlock.element || "p";

        // Look for common patterns in available classes
        const classNames = availableClasses.map((c) => c.name.toLowerCase());

        // Header detection
        if (
          element.startsWith("h") ||
          content.includes("header") ||
          content.includes("title")
        ) {
          suggestedClassName =
            classNames.find((name) => name.includes("header")) ||
            classNames.find((name) => name.includes("title")) ||
            classNames.find((name) => name.includes("intro"));
        }

        // Content/text detection
        if (
          !suggestedClassName &&
          (element === "p" || !element.startsWith("h"))
        ) {
          suggestedClassName =
            classNames.find((name) => name.includes("content")) ||
            classNames.find((name) => name.includes("text")) ||
            classNames.find((name) => name.includes("description"));
        }

        // Button/CTA detection
        if (
          !suggestedClassName &&
          (content.includes("click") ||
            content.includes("button") ||
            content.includes("cta"))
        ) {
          suggestedClassName =
            classNames.find((name) => name.includes("cta")) ||
            classNames.find((name) => name.includes("button"));
        }

        // Footer detection
        if (!suggestedClassName && content.includes("footer")) {
          suggestedClassName = classNames.find((name) =>
            name.includes("footer")
          );
        }

        if (suggestedClassName) {
          const cssClass = availableClasses.find(
            (c) => c.name.toLowerCase() === suggestedClassName
          );
          return {
            ...textBlock,
            cssClassName: cssClass?.name,
            cssClass: cssClass
              ? {
                  name: cssClass.name,
                  selector: `.${cssClass.name}`,
                  properties: {}, // Will be filled by the actual CSS
                  description: cssClass.description,
                  category: cssClass.category,
                }
              : undefined,
          };
        }

        return textBlock;
      });

      onBlocksChange(updatedBlocks);

      const appliedCount = updatedBlocks.filter(
        (block, index) =>
          block.type === "text" &&
          (block as TextBlock).cssClassName &&
          !(blocks[index] as TextBlock).cssClassName
      ).length;

      if (appliedCount > 0) {
        toast({
          title: "Styles Applied",
          description: `Applied CSS classes to ${appliedCount} text block${appliedCount !== 1 ? "s" : ""}.`,
        });
      } else {
        toast({
          title: "No Changes Made",
          description:
            "All text blocks already have CSS classes assigned or no matching classes found.",
        });
      }
    } catch (error) {
      console.error("Failed to apply quick styles:", error);
      toast({
        title: "Error",
        description: "Failed to apply CSS classes. Please try again.",
        variant: "destructive",
      });
    } finally {
      setApplying(false);
    }
  };

  const clearAllStyles = () => {
    const updatedBlocks = blocks.map((block) => {
      if (block.type === "text") {
        const textBlock = block as TextBlock;
        return {
          ...textBlock,
          cssClassName: undefined,
          cssClass: undefined,
        };
      }
      return block;
    });

    onBlocksChange(updatedBlocks);

    toast({
      title: "Styles Cleared",
      description: "Removed all CSS classes from text blocks.",
    });
  };

  if (!selectedStylesheetId || availableClasses.length === 0) {
    return null;
  }

  const textBlocksWithClasses = blocks.filter(
    (b) => b.type === "text" && (b as TextBlock).cssClassName
  ).length;

  const totalTextBlocks = blocks.filter((b) => b.type === "text").length;

  return (
    <div className="flex items-center gap-2 p-3 bg-blue-50/30 border border-blue-200 rounded-lg">
      <div className="flex items-center gap-2 flex-1">
        <Sparkles className="h-4 w-4 text-blue-600" />
        <div className="text-sm">
          <div className="font-medium text-blue-900">Quick Style Assistant</div>
          <div className="text-blue-700 text-xs">
            {totalTextBlocks > 0 ? (
              <>
                {textBlocksWithClasses}/{totalTextBlocks} text blocks styled •
                {availableClasses.length} classes available
              </>
            ) : (
              `${availableClasses.length} CSS classes available from your stylesheet`
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {textBlocksWithClasses > 0 && (
          <Button
            onClick={clearAllStyles}
            variant="outline"
            size="sm"
            className="text-xs"
          >
            Clear All
          </Button>
        )}

        <Button
          onClick={applyQuickStyles}
          disabled={applying || totalTextBlocks === 0}
          size="sm"
          className="text-xs bg-blue-600 hover:bg-blue-700"
        >
          {applying ? "Applying..." : "Auto-Apply Styles"}
        </Button>
      </div>
    </div>
  );
}
