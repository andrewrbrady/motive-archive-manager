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
}

/**
 * RendererFactory - Central hub for managing different preview rendering modes
 *
 * This factory pattern keeps the main BlockComposer clean by centralizing
 * all preview mode logic and rendering strategies.
 *
 * HOT-RELOAD OPTIMIZATION:
 * - Uses React.memo to prevent unnecessary re-renders
 * - Only re-renders when blocks, mode, or other props actually change
 * - CSS updates are handled by individual renderer components
 */
export const RendererFactory = React.memo<RendererFactoryProps>(
  function RendererFactory({
    mode,
    blocks,
    compositionName,
    frontmatter,
    selectedStylesheetId,
    emailContainerConfig,
  }) {
    switch (mode) {
      case "email":
        return (
          <AccurateEmailPreview
            blocks={blocks}
            containerConfig={
              emailContainerConfig || defaultEmailContainerConfig
            }
            selectedStylesheetId={selectedStylesheetId}
          />
        );

      case "news-article":
        return (
          <NewsArticleRenderer
            blocks={blocks}
            compositionName={compositionName}
            frontmatter={frontmatter}
            selectedStylesheetId={selectedStylesheetId}
          />
        );

      case "clean":
      default:
        return (
          <CleanRenderer
            blocks={blocks}
            selectedStylesheetId={selectedStylesheetId}
          />
        );
    }
  },
  // Custom comparison function to optimize re-renders
  (prevProps, nextProps) => {
    // Only re-render if these specific props change
    return (
      prevProps.mode === nextProps.mode &&
      prevProps.blocks === nextProps.blocks &&
      prevProps.compositionName === nextProps.compositionName &&
      prevProps.selectedStylesheetId === nextProps.selectedStylesheetId &&
      JSON.stringify(prevProps.frontmatter) ===
        JSON.stringify(nextProps.frontmatter) &&
      JSON.stringify(prevProps.emailContainerConfig) ===
        JSON.stringify(nextProps.emailContainerConfig)
    );
  }
);

// Export utility functions for external use
export { generateEmailHTML } from "./EmailRenderer";
