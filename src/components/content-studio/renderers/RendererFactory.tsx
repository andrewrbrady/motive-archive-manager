import React from "react";
import { ContentBlock } from "../types";
import { EmailRenderer } from "./EmailRenderer";
import { NewsArticleRenderer } from "./NewsArticleRenderer";
import { CleanRenderer } from "./CleanRenderer";

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
}

/**
 * RendererFactory - Central hub for managing different preview rendering modes
 *
 * This factory pattern keeps the main BlockComposer clean by centralizing
 * all preview mode logic and rendering strategies.
 */
export function RendererFactory({
  mode,
  blocks,
  compositionName,
  frontmatter,
  selectedStylesheetId,
}: RendererFactoryProps) {
  switch (mode) {
    case "email":
      return (
        <CleanRenderer
          blocks={blocks}
          selectedStylesheetId={selectedStylesheetId}
          previewMode="email"
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
}

// Export utility functions for external use
export { generateEmailHTML } from "./EmailRenderer";
