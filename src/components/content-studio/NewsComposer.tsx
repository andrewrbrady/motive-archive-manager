"use client";

import React, { useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Download, FileText, Plus } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

import {
  BaseComposer,
  BaseComposerProps,
  PreviewRenderProps,
  ExportButtonsProps,
  SpecializedControlsProps,
} from "./BaseComposer";
import { SelectedCopy, LoadedComposition } from "./types";
import { RendererFactory } from "./renderers/RendererFactory";
import { useContentExport } from "@/hooks/useContentExport";

// Remove the composer type and render props from the base props
interface NewsComposerProps
  extends Omit<
    BaseComposerProps,
    | "composerType"
    | "renderPreview"
    | "renderExportButtons"
    | "renderSpecializedControls"
    | "onLoadCopy"
    | "onLoadComposition"
    | "onCompositionSaved"
  > {
  // Load functionality
  onLoadCopy?: (copies: SelectedCopy[]) => void;
  onLoadComposition?: (composition: LoadedComposition) => void;
  onCreateNewWithCopy?: (copies: SelectedCopy[]) => void;
  onCompositionSaved?: (composition: LoadedComposition) => void;
}

/**
 * NewsComposer - Specialized composer for news article content
 *
 * This component extends BaseComposer with news-specific functionality:
 * - News article preview mode with frontmatter display
 * - MDX export with frontmatter preservation
 * - Frontmatter block management and editing
 * - Article structure tools (title, subtitle, meta info)
 * - CSS editor support for article styling
 */
export function NewsComposer(props: NewsComposerProps) {
  const { toast } = useToast();

  // Export functionality
  const { exportToMDX } = useContentExport();

  // News preview modes
  const supportedPreviewModes = [
    { value: "clean", label: "Clean" },
    { value: "news-article", label: "News Article" },
  ];

  // News preview renderer
  const renderPreview = useCallback((previewProps: PreviewRenderProps) => {
    return (
      <RendererFactory
        mode={previewProps.previewMode as any}
        blocks={previewProps.blocks}
        compositionName={previewProps.compositionName}
        frontmatter={previewProps.frontmatter}
        selectedStylesheetId={previewProps.selectedStylesheetId}
        stylesheetData={previewProps.stylesheetData}
      />
    );
  }, []);

  // News export buttons
  const renderExportButtons = useCallback(
    (exportProps: ExportButtonsProps) => {
      return (
        <>
          <Button
            onClick={() =>
              exportToMDX(exportProps.blocks, exportProps.compositionName)
            }
            variant="outline"
            size="sm"
            className="bg-background border-border/40 hover:bg-muted/20 shadow-sm"
          >
            <Download className="h-4 w-4 mr-2" />
            Export MDX
          </Button>
        </>
      );
    },
    [exportToMDX]
  );

  // News-specific controls
  const renderSpecializedControls = useCallback(
    (controlsProps: SpecializedControlsProps) => {
      return (
        <>
          {/* News Article Tools - Show only in news-article preview mode */}
          {controlsProps.previewMode === "news-article" && (
            <div className="space-y-3 p-4 border border-blue-200 rounded-lg bg-blue-50/30">
              <h4 className="text-sm font-semibold text-blue-900 mb-2">
                News Article Tools
              </h4>
              <div className="flex gap-2 items-start">
                <Button
                  onClick={() => {
                    // Add frontmatter blocks functionality
                    // This would be handled by the frontmatter operations hook
                    toast({
                      title: "Article Structure",
                      description: "Adding article structure blocks...",
                    });
                  }}
                  variant="outline"
                  size="sm"
                  className="bg-background border-border/40 hover:bg-muted/20"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Article Structure
                </Button>
                <div className="text-xs text-blue-700 flex items-center max-w-md">
                  Adds editable title, subtitle, meta info, and content sections
                  to your article. Each section becomes an editable block.
                </div>
              </div>
            </div>
          )}

          {/* Frontmatter Preview - Show current frontmatter data */}
          {controlsProps.frontmatter &&
            Object.keys(controlsProps.frontmatter).length > 0 && (
              <div className="space-y-2 p-3 border border-gray-200 rounded-lg bg-gray-50/30">
                <h4 className="text-sm font-semibold text-gray-900 mb-2">
                  Article Frontmatter
                </h4>
                <div className="text-xs text-gray-700 space-y-1">
                  {Object.entries(controlsProps.frontmatter).map(
                    ([key, value]) => (
                      <div key={key} className="flex gap-2">
                        <span className="font-medium">{key}:</span>
                        <span className="text-gray-600">
                          {typeof value === "string"
                            ? value
                            : JSON.stringify(value)}
                        </span>
                      </div>
                    )
                  )}
                </div>
              </div>
            )}
        </>
      );
    },
    [toast]
  );

  return (
    <BaseComposer
      {...props}
      composerType="news"
      renderPreview={renderPreview}
      renderExportButtons={renderExportButtons}
      renderSpecializedControls={renderSpecializedControls}
      onLoadCopy={props.onLoadCopy}
      onLoadComposition={props.onLoadComposition}
      onCreateNewWithCopy={props.onCreateNewWithCopy}
      onCompositionSaved={props.onCompositionSaved}
      defaultPreviewMode="clean"
      supportedPreviewModes={supportedPreviewModes}
      supportsCSSEditor={true}
      supportsEmailContainer={false}
      supportsFrontmatter={true}
    />
  );
}
