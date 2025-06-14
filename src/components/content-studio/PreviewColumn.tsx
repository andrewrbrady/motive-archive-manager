"use client";

import React, { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ContentBlock,
  TextBlock,
  HeadingBlock,
  ImageBlock,
  ButtonBlock,
  DividerBlock,
  SpacerBlock,
  ColumnsBlock,
} from "./types";
import { EmailHeaderState } from "./EmailHeaderConfig";

interface PreviewColumnProps {
  blocks: ContentBlock[];
  emailHeader?: EmailHeaderState;
}

/**
 * PreviewColumn - Live preview of content blocks
 *
 * Renders blocks as they would appear in the final output,
 * styled like email content with proper typography and spacing.
 * Phase 2A Performance: Added React.memo and useMemo optimizations
 */
export const PreviewColumn = React.memo<PreviewColumnProps>(
  function PreviewColumn({ blocks, emailHeader }) {
    // Performance optimization: Memoize block count and sorting
    const blockCount = useMemo(() => blocks.length, [blocks]);
    const sortedBlocks = useMemo(
      () => [...blocks].sort((a, b) => a.order - b.order),
      [blocks]
    );

    // Performance optimization: Memoize email header container styles
    const emailContainerStyle = useMemo(
      () => ({
        maxWidth: "600px",
      }),
      []
    );

    // Performance optimization: Memoize header stripe styles
    const headerStripeStyles = useMemo(() => {
      if (!emailHeader?.stripes?.enabled) return null;

      return {
        top: {
          backgroundColor: emailHeader.stripes.topColor || "#BC1F1F",
          height: emailHeader.stripes.height || "4px",
        },
        bottom: {
          backgroundColor: emailHeader.stripes.bottomColor || "#0E2D4E",
          height: emailHeader.stripes.height || "4px",
        },
      };
    }, [
      emailHeader?.stripes?.enabled,
      emailHeader?.stripes?.topColor,
      emailHeader?.stripes?.bottomColor,
      emailHeader?.stripes?.height,
    ]);

    // Performance optimization: Memoize header image styles
    const headerImageStyle = useMemo(
      () => ({
        maxHeight: emailHeader?.headerImageHeight
          ? `${emailHeader.headerImageHeight}px`
          : "100px",
        height: "auto",
        objectFit: "contain" as const,
      }),
      [emailHeader?.headerImageHeight]
    );

    return (
      <div className="h-full">
        <div className="sticky top-0 bg-background pb-4 border-b border-border/20">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Live Preview</h3>
              <p className="text-sm text-muted-foreground">
                See how your content will look
              </p>
            </div>
            {/* Debug info */}
            <div className="text-xs text-muted-foreground bg-muted/20 px-2 py-1 rounded">
              {blockCount} block{blockCount !== 1 ? "s" : ""}
            </div>
          </div>
        </div>

        <div className="mt-4">
          <Card className="min-h-[500px] bg-background border shadow-sm">
            <CardContent className="p-6">
              {/* Email-style container */}
              <div
                className="mx-auto bg-background/60 backdrop-blur-sm border border-border/20 rounded-lg shadow-sm overflow-hidden"
                style={emailContainerStyle}
              >
                {/* Email Header Preview */}
                {emailHeader?.enabled && emailHeader.headerImageUrl && (
                  <div className="border-b border-border/10">
                    {/* Top stripe if enabled */}
                    {headerStripeStyles?.top && (
                      <div style={headerStripeStyles.top} />
                    )}

                    <img
                      src={emailHeader.headerImageUrl}
                      alt={emailHeader.headerImageAlt || "Email Header"}
                      className="w-full block"
                      style={headerImageStyle}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = "none";
                        const parent = target.parentElement;
                        if (parent) {
                          parent.innerHTML = `
                          <div class="w-full h-20 bg-muted/20 border-2 border-dashed border-border/40 flex items-center justify-center text-muted-foreground">
                            <div class="text-center text-sm">
                              <div class="mb-1">🖼️</div>
                              <div>Header image failed to load</div>
                            </div>
                          </div>
                        `;
                        }
                      }}
                    />

                    {/* Bottom stripe if enabled */}
                    {headerStripeStyles?.bottom && (
                      <div style={headerStripeStyles.bottom} />
                    )}
                  </div>
                )}

                {/* Placeholder for disabled header */}
                {emailHeader?.enabled && !emailHeader.headerImageUrl && (
                  <div className="border-b border-border/10">
                    <div className="w-full h-20 bg-muted/10 border-2 border-dashed border-border/40 flex items-center justify-center text-muted-foreground">
                      <div className="text-center text-sm">
                        <div className="mb-1">🖼️</div>
                        <div>Add header image URL to see preview</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Content Blocks */}
                {blockCount === 0 ? (
                  <div className="p-12 text-center text-muted-foreground">
                    <div className="w-16 h-16 mx-auto mb-4 bg-muted/20 rounded-full flex items-center justify-center">
                      <span className="text-2xl">👁️</span>
                    </div>
                    <p>Add blocks to see your content preview</p>
                    <p className="text-xs mt-2 opacity-60">
                      Content will appear here as you create it
                    </p>
                  </div>
                ) : (
                  <div className="space-y-0">
                    {sortedBlocks.map((block) => (
                      <div key={block.id} className="relative">
                        <PreviewBlock block={block} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }
);

/**
 * PreviewBlock - Renders individual block preview
 * Phase 2A Performance: Added React.memo for prevent unnecessary re-renders
 */
interface PreviewBlockProps {
  block: ContentBlock;
}

const PreviewBlock = React.memo<PreviewBlockProps>(function PreviewBlock({
  block,
}) {
  switch (block.type) {
    case "text":
      // Check if this is a heading text block
      const textBlock = block as TextBlock;
      if (textBlock.element && textBlock.element.startsWith("h")) {
        return <HeadingBlockPreview block={textBlock} />;
      }
      return <TextBlockPreview block={textBlock} />;
    case "image":
      return <ImageBlockPreview block={block as ImageBlock} />;
    case "button":
      return <ButtonBlockPreview block={block as ButtonBlock} />;
    case "divider":
      return <DividerBlockPreview block={block as DividerBlock} />;
    case "spacer":
      return <SpacerBlockPreview block={block as SpacerBlock} />;
    case "columns":
      return <ColumnsBlockPreview block={block as ColumnsBlock} />;
    default:
      return null;
  }
});

/**
 * TextBlockPreview - Memoized text block renderer
 * Phase 2A Performance: Added React.memo and memoized style calculations
 * Rich Text Enhancement: Added support for bold and link rendering (always enabled)
 */
const TextBlockPreview = React.memo<{ block: TextBlock }>(
  function TextBlockPreview({ block }) {
    const content = block.content || "Your text will appear here...";
    const formatting = block.formatting || {};

    // Performance optimization: Memoize style calculations
    const textStyles = useMemo(
      () => ({
        fontSize: formatting.fontSize || "16px",
        fontWeight: formatting.fontWeight || "normal",
        color: formatting.color || "currentColor",
        textAlign: formatting.textAlign || "left",
        lineHeight: formatting.lineHeight || "1.6",
      }),
      [
        formatting.fontSize,
        formatting.fontWeight,
        formatting.color,
        formatting.textAlign,
        formatting.lineHeight,
      ]
    );

    // Performance optimization: Memoize rich content formatting (always enabled)
    const formattedContent = useMemo(() => {
      if (!block.richFormatting?.formattedContent) {
        return content;
      }

      let html = block.richFormatting.formattedContent;

      // Convert **bold** to <strong>bold</strong>
      html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");

      // Convert [text](url) to <a href="url">text</a>
      html = html.replace(
        /\[([^\]]+)\]\(([^)]+)\)/g,
        '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 underline">$1</a>'
      );

      // Convert line breaks to <br>
      html = html.replace(/\n/g, "<br>");

      return html;
    }, [block.richFormatting?.formattedContent, content]);

    const hasRichContent = block.richFormatting?.formattedContent;

    return (
      <div className="p-6" style={textStyles}>
        {hasRichContent ? (
          <div
            className={`whitespace-pre-wrap ${!block.content ? "text-muted-foreground italic" : "text-foreground"}`}
            dangerouslySetInnerHTML={{ __html: formattedContent }}
          />
        ) : (
          <div
            className={`whitespace-pre-wrap ${!block.content ? "text-muted-foreground italic" : "text-foreground"}`}
          >
            {content}
          </div>
        )}
      </div>
    );
  }
);

/**
 * HeadingBlockPreview - Memoized heading block renderer
 * Phase 2A Performance: Added React.memo and memoized heading style calculations
 * Rich Text Enhancement: Added support for bold and link rendering in headings (always enabled)
 */
const HeadingBlockPreview = React.memo<{ block: TextBlock }>(
  function HeadingBlockPreview({ block }) {
    const content = block.content || "Your heading will appear here...";
    const formatting = block.formatting || {};

    // Extract level from element (h1 -> 1, h2 -> 2, etc.)
    const level = block.element ? parseInt(block.element.substring(1)) : 2;

    // Performance optimization: Memoize expensive heading style calculations
    const headingStyles = useMemo(() => {
      const baseStyles = {
        fontWeight: formatting.fontWeight || "bold",
        color: formatting.color || "currentColor",
        textAlign: formatting.textAlign || "left",
        marginTop: formatting.marginTop || (level <= 2 ? "24px" : "20px"),
        marginBottom: formatting.marginBottom || (level <= 2 ? "16px" : "12px"),
      };

      switch (level) {
        case 1:
          return {
            ...baseStyles,
            fontSize: formatting.fontSize || "32px",
            lineHeight: "1.2",
          };
        case 2:
          return {
            ...baseStyles,
            fontSize: formatting.fontSize || "24px",
            lineHeight: "1.3",
          };
        case 3:
          return {
            ...baseStyles,
            fontSize: formatting.fontSize || "20px",
            lineHeight: "1.4",
          };
        case 4:
          return {
            ...baseStyles,
            fontSize: formatting.fontSize || "18px",
            lineHeight: "1.4",
          };
        case 5:
          return {
            ...baseStyles,
            fontSize: formatting.fontSize || "16px",
            lineHeight: "1.5",
          };
        case 6:
          return {
            ...baseStyles,
            fontSize: formatting.fontSize || "14px",
            lineHeight: "1.5",
          };
        default:
          return {
            ...baseStyles,
            fontSize: formatting.fontSize || "20px",
            lineHeight: "1.4",
          };
      }
    }, [
      level,
      formatting.fontWeight,
      formatting.color,
      formatting.textAlign,
      formatting.marginTop,
      formatting.marginBottom,
      formatting.fontSize,
    ]);

    const containerStyles = useMemo(
      () => ({
        marginTop: headingStyles.marginTop,
        marginBottom: headingStyles.marginBottom,
      }),
      [headingStyles.marginTop, headingStyles.marginBottom]
    );

    const elementStyles = useMemo(
      () => ({
        fontSize: headingStyles.fontSize,
        fontWeight: headingStyles.fontWeight,
        color: headingStyles.color,
        textAlign: headingStyles.textAlign,
        lineHeight: headingStyles.lineHeight,
        margin: 0,
      }),
      [
        headingStyles.fontSize,
        headingStyles.fontWeight,
        headingStyles.color,
        headingStyles.textAlign,
        headingStyles.lineHeight,
      ]
    );

    // Performance optimization: Memoize rich content formatting (always enabled)
    const formattedContent = useMemo(() => {
      if (!block.richFormatting?.formattedContent) {
        return content;
      }

      let html = block.richFormatting.formattedContent;

      // Convert **bold** to <strong>bold</strong>
      html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");

      // Convert [text](url) to <a href="url">text</a>
      html = html.replace(
        /\[([^\]]+)\]\(([^)]+)\)/g,
        '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 underline">$1</a>'
      );

      return html;
    }, [block.richFormatting?.formattedContent, content]);

    const hasRichContent = block.richFormatting?.formattedContent;

    return (
      <div className="px-6" style={containerStyles}>
        {React.createElement(
          block.element || "h2",
          {
            style: elementStyles,
            className: !block.content
              ? "text-muted-foreground italic"
              : "text-foreground",
            ...(hasRichContent
              ? { dangerouslySetInnerHTML: { __html: formattedContent } }
              : {}),
          },
          hasRichContent ? undefined : content
        )}
      </div>
    );
  }
);

/**
 * ImageBlockPreview - Memoized image block renderer
 * Phase 2A Performance: Added React.memo and memoized image URL processing
 */
const ImageBlockPreview = React.memo<{ block: ImageBlock }>(
  function ImageBlockPreview({ block }) {
    // Performance optimization: Memoize image URL processing
    const hasImage = useMemo(
      () => block.imageUrl && block.imageUrl.trim() !== "",
      [block.imageUrl]
    );

    // Performance optimization: Memoize image container styles
    const containerStyles = useMemo(
      () => ({
        textAlign: block.alignment || "center",
      }),
      [block.alignment]
    );

    // Performance optimization: Memoize image element styles
    const imageStyles = useMemo(
      () => ({
        width: block.width || "auto",
        height: block.height || "auto",
      }),
      [block.width, block.height]
    );

    return (
      <div className="p-6" style={containerStyles}>
        {hasImage ? (
          <div>
            <img
              src={block.imageUrl}
              alt={block.altText || ""}
              className="max-w-full h-auto rounded-lg border border-border/20"
              style={imageStyles}
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = "none";
                const parent = target.parentElement;
                if (parent) {
                  parent.innerHTML = `
                  <div class="bg-muted/20 border-2 border-dashed border-border/40 rounded-lg p-8 text-center text-muted-foreground">
                    <div class="text-2xl mb-2">🖼️</div>
                    <div>Image failed to load</div>
                    <div class="text-xs mt-1">${block.imageUrl}</div>
                  </div>
                `;
                }
              }}
            />

            {block.caption && (
              <p className="text-sm text-muted-foreground mt-2 italic">
                {block.caption}
              </p>
            )}
          </div>
        ) : (
          <div className="bg-muted/20 border-2 border-dashed border-border/40 rounded-lg p-8 text-center text-muted-foreground">
            <div className="text-2xl mb-2">🖼️</div>
            <div>Image URL required</div>
          </div>
        )}
      </div>
    );
  }
);

/**
 * ButtonBlockPreview - Memoized button block renderer
 * Phase 2A Performance: Added React.memo and memoized button styles
 */
const ButtonBlockPreview = React.memo<{ block: ButtonBlock }>(
  function ButtonBlockPreview({ block }) {
    // Performance optimization: Memoize button content processing
    const buttonContent = useMemo(() => {
      const hasContent = block.text && block.text.trim() !== "";
      return {
        text: hasContent ? block.text : "Button Text",
        hasContent,
      };
    }, [block.text]);

    // Performance optimization: Memoize button styles
    const buttonStyles = useMemo(
      () => ({
        backgroundColor: block.backgroundColor || "#007bff",
        color: block.textColor || "#ffffff",
        borderRadius: block.borderRadius || "6px",
        padding: block.padding || "12px 24px",
      }),
      [
        block.backgroundColor,
        block.textColor,
        block.borderRadius,
        block.padding,
      ]
    );

    return (
      <div className="p-6 text-center">
        <Button
          variant="default"
          className="inline-flex items-center px-6 py-3 rounded-lg font-medium"
          style={buttonStyles}
          disabled={true} // Disabled in preview
        >
          {buttonContent.text}
          {!buttonContent.hasContent && (
            <span className="ml-1 opacity-50">(empty)</span>
          )}
        </Button>
        {block.url && (
          <div className="text-xs text-muted-foreground mt-2 font-mono">
            → {block.url}
          </div>
        )}
      </div>
    );
  }
);

/**
 * DividerBlockPreview - Memoized divider block renderer
 * Phase 2A Performance: Added React.memo and memoized divider styles
 */
const DividerBlockPreview = React.memo<{ block: DividerBlock }>(
  function DividerBlockPreview({ block }) {
    // Performance optimization: Memoize divider container styles
    const containerStyles = useMemo(
      () => ({
        margin: block.margin || "20px 0",
      }),
      [block.margin]
    );

    // Performance optimization: Memoize divider line styles
    const lineStyles = useMemo(
      () => ({
        height: block.thickness || "1px",
        backgroundColor: block.color || "#e5e7eb",
      }),
      [block.thickness, block.color]
    );

    return (
      <div className="px-6" style={containerStyles}>
        <hr className="border-0" style={lineStyles} />
      </div>
    );
  }
);

/**
 * SpacerBlockPreview - Memoized spacer block renderer
 * Phase 2A Performance: Added React.memo and memoized spacer styles
 */
const SpacerBlockPreview = React.memo<{ block: SpacerBlock }>(
  function SpacerBlockPreview({ block }) {
    // Performance optimization: Memoize spacer styles and content
    const spacerHeight = useMemo(() => block.height || "20px", [block.height]);
    const spacerStyles = useMemo(
      () => ({ height: spacerHeight }),
      [spacerHeight]
    );

    return (
      <div
        style={spacerStyles}
        className="w-full bg-muted/10 flex items-center justify-center text-xs text-muted-foreground border-t border-b border-dashed border-border/30"
      >
        Spacer ({spacerHeight})
      </div>
    );
  }
);

/**
 * ColumnsBlockPreview - Memoized columns block renderer
 * Phase 2A Performance: Added React.memo and memoized column layout styles
 */
const ColumnsBlockPreview = React.memo<{ block: ColumnsBlock }>(
  function ColumnsBlockPreview({ block }) {
    // Performance optimization: Memoize grid layout styles
    const gridStyles = useMemo(
      () => ({
        gridTemplateColumns: `repeat(${block.columnCount}, 1fr)`,
        gap: block.gap || "16px",
      }),
      [block.columnCount, block.gap]
    );

    return (
      <div className="p-6">
        <div className="grid gap-4" style={gridStyles}>
          {block.columns.map((column, columnIndex) => (
            <div
              key={columnIndex}
              className="bg-muted/20 border-2 border-dashed border-border/40 rounded-lg p-4 text-center text-muted-foreground min-h-[100px] flex items-center justify-center"
            >
              <div>
                <div className="text-lg mb-1">📋</div>
                <div className="text-xs">Column {columnIndex + 1}</div>
                <div className="text-xs">{column.length} blocks</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }
);
