"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, Bug, RefreshCw } from "lucide-react";
import { ContentBlock, TextBlock } from "../content-studio/types";

interface StylesheetDebuggerProps {
  selectedStylesheetId: string | null;
  blocks: ContentBlock[];
}

/**
 * StylesheetDebugger - Shows CSS injection status and block styling info
 *
 * This component helps debug why CSS styles aren't appearing by showing:
 * - Whether CSS is injected into the page
 * - Which blocks have CSS classes assigned
 * - What the actual rendered HTML looks like
 */
export function StylesheetDebugger({
  selectedStylesheetId,
  blocks,
}: StylesheetDebuggerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [debugInfo, setDebugInfo] = useState<{
    cssInjected: boolean;
    styleElement: HTMLStyleElement | null;
    classesInCSS: string[];
    blocksWithClasses: number;
    totalTextBlocks: number;
    sampleHTML: string;
  }>({
    cssInjected: false,
    styleElement: null,
    classesInCSS: [],
    blocksWithClasses: 0,
    totalTextBlocks: 0,
    sampleHTML: "",
  });

  const refreshDebugInfo = () => {
    if (!selectedStylesheetId) {
      setDebugInfo({
        cssInjected: false,
        styleElement: null,
        classesInCSS: [],
        blocksWithClasses: 0,
        totalTextBlocks: 0,
        sampleHTML: "",
      });
      return;
    }

    // Check if CSS is injected
    const styleElement = document.getElementById(
      `stylesheet-${selectedStylesheetId}`
    ) as HTMLStyleElement;
    const cssInjected = !!styleElement;

    // Extract class names from CSS content
    const classesInCSS: string[] = [];
    if (styleElement?.textContent) {
      const classMatches =
        styleElement.textContent.match(/\.([a-zA-Z][\w-]*)/g);
      if (classMatches) {
        classMatches.forEach((match) => {
          const className = match.substring(1); // Remove the dot
          if (!classesInCSS.includes(className)) {
            classesInCSS.push(className);
          }
        });
      }
    }

    // Count blocks with CSS classes
    const textBlocks = blocks.filter((b) => b.type === "text") as TextBlock[];
    const blocksWithClasses = textBlocks.filter((b) => b.cssClassName).length;

    // Get sample HTML from a styled block
    let sampleHTML = "";
    const styledBlock = textBlocks.find((b) => b.cssClassName);
    if (styledBlock) {
      // Find the actual DOM element
      const blockElements = document.querySelectorAll(
        '[data-block-type="text"]'
      );
      if (blockElements.length > 0) {
        sampleHTML = blockElements[0].outerHTML;
      }
    }

    setDebugInfo({
      cssInjected,
      styleElement,
      classesInCSS: classesInCSS.slice(0, 10), // First 10 classes
      blocksWithClasses,
      totalTextBlocks: textBlocks.length,
      sampleHTML:
        sampleHTML.substring(0, 200) + (sampleHTML.length > 200 ? "..." : ""),
    });
  };

  useEffect(() => {
    if (isOpen) {
      refreshDebugInfo();
    }
  }, [selectedStylesheetId, blocks, isOpen]);

  if (!selectedStylesheetId) {
    return null;
  }

  return (
    <div className="relative">
      <Button
        onClick={() => setIsOpen(!isOpen)}
        variant="outline"
        size="sm"
        className="text-xs"
        title="Debug CSS styling"
      >
        <Bug className="h-3 w-3 mr-1" />
        Debug CSS
      </Button>

      {isOpen && (
        <Card className="absolute top-8 right-0 w-96 z-50 bg-white border shadow-lg">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <Bug className="h-4 w-4" />
                CSS Debug Info
              </CardTitle>
              <div className="flex gap-1">
                <Button onClick={refreshDebugInfo} variant="ghost" size="sm">
                  <RefreshCw className="h-3 w-3" />
                </Button>
                <Button
                  onClick={() => setIsOpen(false)}
                  variant="ghost"
                  size="sm"
                >
                  ×
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="text-xs space-y-3">
            {/* CSS Injection Status */}
            <div>
              <div className="font-medium mb-1">CSS Injection:</div>
              <Badge
                variant={debugInfo.cssInjected ? "default" : "destructive"}
              >
                {debugInfo.cssInjected ? "✅ Injected" : "❌ Not Found"}
              </Badge>
              {debugInfo.cssInjected && (
                <div className="mt-1 text-muted-foreground">
                  Style element ID: stylesheet-{selectedStylesheetId}
                </div>
              )}
            </div>

            {/* Classes Available */}
            <div>
              <div className="font-medium mb-1">CSS Classes Available:</div>
              {debugInfo.classesInCSS.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {debugInfo.classesInCSS.map((className) => (
                    <Badge
                      key={className}
                      variant="outline"
                      className="text-xs"
                    >
                      .{className}
                    </Badge>
                  ))}
                  {debugInfo.classesInCSS.length === 10 && (
                    <span className="text-muted-foreground">...</span>
                  )}
                </div>
              ) : (
                <Badge variant="destructive">No classes found</Badge>
              )}
            </div>

            {/* Block Status */}
            <div>
              <div className="font-medium mb-1">Text Blocks:</div>
              <div className="space-y-1">
                <div>Total: {debugInfo.totalTextBlocks}</div>
                <div>With CSS classes: {debugInfo.blocksWithClasses}</div>
                <Badge
                  variant={
                    debugInfo.blocksWithClasses > 0 ? "default" : "outline"
                  }
                >
                  {debugInfo.blocksWithClasses > 0
                    ? "✅ Styled"
                    : "⚠️ No styles"}
                </Badge>
              </div>
            </div>

            {/* Sample HTML */}
            {debugInfo.sampleHTML && (
              <div>
                <div className="font-medium mb-1">Sample Block HTML:</div>
                <code className="text-xs bg-muted p-2 rounded block overflow-x-auto">
                  {debugInfo.sampleHTML}
                </code>
              </div>
            )}

            {/* Quick Fixes */}
            <div className="border-t pt-2">
              <div className="font-medium mb-1">Quick Fixes:</div>
              <div className="space-y-1 text-muted-foreground">
                {!debugInfo.cssInjected && (
                  <div>• Select a stylesheet to inject CSS</div>
                )}
                {debugInfo.cssInjected && debugInfo.blocksWithClasses === 0 && (
                  <div>• Use "Auto-Apply Styles" to assign CSS classes</div>
                )}
                {debugInfo.cssInjected && debugInfo.blocksWithClasses > 0 && (
                  <div>• Check for CSS specificity conflicts</div>
                )}
              </div>
            </div>

            {/* Force CSS Update */}
            <div className="border-t pt-2">
              <Button
                onClick={() => {
                  // Force re-render by triggering a style recalculation
                  document
                    .querySelectorAll('[data-block-type="text"]')
                    .forEach((el) => {
                      const htmlEl = el as HTMLElement;
                      htmlEl.style.display = "none";
                      htmlEl.offsetHeight; // Trigger reflow
                      htmlEl.style.display = "";
                    });

                  setTimeout(refreshDebugInfo, 100);
                }}
                variant="outline"
                size="sm"
                className="w-full text-xs"
              >
                Force Style Refresh
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
