import React from "react";
import { ContentBlock } from "../types";
import { EmailRenderer } from "./EmailRenderer";
import { NewsArticleRenderer } from "./NewsArticleRenderer";
import { CleanRenderer } from "./CleanRenderer";
import { AccurateEmailPreview } from "../AccurateEmailPreview";
import {
  EmailContainerConfig,
  defaultEmailContainerConfig,
} from "../EmailContainerConfig";

export type PreviewMode = "clean" | "news-article" | "email";

interface RendererFactoryProps {
  mode: PreviewMode;
  blocks: ContentBlock[];
  compositionName?: string;
  frontmatter?: {
    title: string;
    subtitle: string;
    date: string;
    author: string;
    cover: string;
    status: string;
    tags: string[];
    callToAction: string;
    callToActionUrl: string;
    gallery: Array<{ id: string; src: string; alt: string }>;
  };
  selectedStylesheetId?: string | null;
  emailContainerConfig?: EmailContainerConfig;
  stylesheetData?: any; // StylesheetData from useStylesheetData hook
}

/**
 * RendererFactory - Central hub for managing different preview rendering modes
 *
 * This factory pattern keeps the main BlockComposer clean by centralizing
 * all preview mode logic and rendering strategies.
 *
 * CRITICAL FIX: Removed React.memo custom comparison to allow CSS hot-reload
 * - Individual renderer components handle their own optimization via useStylesheetData
 * - This ensures CSS content changes trigger proper re-renders
 * - Child components still use React.memo for their own optimization
 */
export function RendererFactory({
  mode,
  blocks,
  compositionName,
  frontmatter,
  selectedStylesheetId,
  emailContainerConfig,
  stylesheetData,
}: RendererFactoryProps) {
  // DEBUG: Log stylesheet data reception in RendererFactory
  console.log(`🎯 RendererFactory - Received stylesheet data:`, {
    mode,
    hasStylesheetData: !!stylesheetData,
    stylesheetId: selectedStylesheetId,
    cssContentLength: stylesheetData?.cssContent?.length || 0,
    timestamp: (stylesheetData as any)?._lastUpdated || "no timestamp",
  });
  switch (mode) {
    case "email":
      return (
        <AccurateEmailPreview
          blocks={blocks}
          containerConfig={emailContainerConfig || defaultEmailContainerConfig}
          selectedStylesheetId={selectedStylesheetId}
          stylesheetData={stylesheetData}
        />
      );

    case "news-article":
      return (
        <NewsArticleRenderer
          blocks={blocks}
          compositionName={compositionName}
          frontmatter={frontmatter}
          selectedStylesheetId={selectedStylesheetId}
          stylesheetData={stylesheetData}
        />
      );

    case "clean":
    default:
      return (
        <CleanRenderer
          blocks={blocks}
          selectedStylesheetId={selectedStylesheetId}
          stylesheetData={stylesheetData}
        />
      );
  }
}

// Export utility functions for external use
export { generateEmailHTML } from "./EmailRenderer";
