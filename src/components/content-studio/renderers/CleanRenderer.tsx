import React, { useMemo } from "react";
import { ImageIcon } from "lucide-react";
import {
  ContentBlock,
  TextBlock,
  ImageBlock,
  VideoBlock,
  DividerBlock,
} from "../types";
import { classToInlineStyles } from "@/lib/css-parser";

interface CleanRendererProps {
  blocks: ContentBlock[];
  selectedStylesheetId?: string | null;
  previewMode?: "clean" | "email";
}

/**
 * CleanRenderer - Renders blocks in clean preview mode or email layout
 *
 * Extracted from BlockComposer.tsx CleanPreview component for modularity.
 * Handles both clean preview and email layout modes.
 */
export const CleanRenderer = React.memo<CleanRendererProps>(
  function CleanRenderer({
    blocks,
    selectedStylesheetId,
    previewMode = "clean",
  }) {
    const sortedBlocks = [...blocks].sort((a, b) => a.order - b.order);

    // Email Preview Mode - Separate header images from content blocks
    if (previewMode === "email") {
      const headerImages: ImageBlock[] = [];
      const contentBlocks: ContentBlock[] = [];

      let foundNonHeaderBlock = false;
      for (const block of sortedBlocks) {
        const isFullWidthImage =
          block.type === "image" && (block as ImageBlock).email?.isFullWidth;

        if (isFullWidthImage && !foundNonHeaderBlock) {
          headerImages.push(block as ImageBlock);
        } else {
          foundNonHeaderBlock = true;
          contentBlocks.push(block);
        }
      }

      return (
        <div className="min-h-full bg-background">
          {/* Full-width header images */}
          {headerImages.map((block) => (
            <div
              key={block.id}
              className="w-full"
              style={{
                backgroundColor: block.email?.backgroundColor || "#111111",
              }}
            >
              <CleanPreviewBlock block={block} previewMode={previewMode} />
            </div>
          ))}

          {/* Regular content */}
          <div
            className={`space-y-4 ${headerImages.length > 0 ? "px-6 py-6 pt-6" : "p-6"}`}
          >
            {contentBlocks.map((block) => (
              <CleanPreviewBlock
                key={block.id}
                block={block}
                previewMode={previewMode}
              />
            ))}
          </div>
        </div>
      );
    }

    // Clean Preview Mode (default)
    return (
      <div className="min-h-full bg-background">
        <div className="space-y-4 p-6">
          {sortedBlocks.map((block) => (
            <CleanPreviewBlock
              key={block.id}
              block={block}
              previewMode={previewMode}
            />
          ))}
        </div>
      </div>
    );
  }
);

/**
 * CleanPreviewBlock - Renders individual blocks in clean preview or email mode
 */
interface CleanPreviewBlockProps {
  block: ContentBlock;
  previewMode?: "clean" | "email";
}

const CleanPreviewBlock = React.memo<CleanPreviewBlockProps>(
  function CleanPreviewBlock({ block, previewMode = "clean" }) {
    const customStyles = useMemo(() => {
      if (block.cssClass) {
        return classToInlineStyles(block.cssClass);
      }
      return {};
    }, [block.cssClass]);

    switch (block.type) {
      case "text": {
        const textBlock = block as TextBlock;
        const content = textBlock.content || "Your text will appear here...";

        const formattedContent = useMemo(() => {
          if (!textBlock.richFormatting?.formattedContent) {
            return content;
          }

          let html = textBlock.richFormatting.formattedContent;
          html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
          html = html.replace(
            /\[([^\]]+)\]\(([^)]+)\)/g,
            '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 underline">$1</a>'
          );
          html = html.replace(/\n/g, "<br>");
          return html;
        }, [textBlock.richFormatting?.formattedContent, content]);

        const hasRichContent = textBlock.richFormatting?.formattedContent;
        const textClass = !textBlock.content
          ? "text-muted-foreground italic"
          : "text-foreground";

        // Get default classes based on element type and preview mode
        const getElementClasses = (element: string) => {
          switch (element) {
            case "h1":
              return "text-3xl font-bold mb-4 mt-6";
            case "h2":
              return "text-2xl font-bold mb-3 mt-5";
            case "h3":
              return "text-xl font-bold mb-2 mt-4";
            case "h4":
              return "text-lg font-bold mb-2 mt-3";
            case "h5":
              return "text-base font-bold mb-1 mt-2";
            case "h6":
              return "text-sm font-bold mb-1 mt-2";
            case "p":
            default:
              return "mb-4 leading-relaxed";
          }
        };

        const elementType = textBlock.element || "p"; // Fallback to "p" if element is undefined
        const defaultClasses = getElementClasses(elementType);
        const finalClassName = textBlock.cssClassName
          ? `${textBlock.cssClassName} ${textClass}`
          : `${defaultClasses} ${textClass}`;

        // For headings, don't add line breaks; for paragraphs, add them
        const processedContent =
          elementType === "p"
            ? formattedContent
            : formattedContent.replace(/<br>/g, " ");

        return React.createElement(
          textBlock.element || "p", // Fallback to "p" if element is undefined
          {
            className: finalClassName,
            style: customStyles,
            ...(hasRichContent
              ? { dangerouslySetInnerHTML: { __html: processedContent } }
              : {}),
          },
          hasRichContent ? undefined : content
        );
      }

      case "image": {
        const imageBlock = block as ImageBlock;
        if (!imageBlock.imageUrl) {
          return (
            <div className="flex items-center justify-center h-48 bg-muted rounded border-2 border-dashed border-muted-foreground/25">
              <div className="text-center text-muted-foreground">
                <ImageIcon className="h-12 w-12 mx-auto mb-2" />
                <p className="text-sm">No image selected</p>
              </div>
            </div>
          );
        }

        const imageContainerClass = imageBlock.cssClassName
          ? imageBlock.cssClassName
          : "mb-4";

        const imageClass = "w-full h-auto rounded";

        const captionClass =
          "text-sm text-muted-foreground mt-2 text-center italic";

        return (
          <div className={imageContainerClass}>
            <img
              src={imageBlock.imageUrl}
              alt={imageBlock.altText || "Content image"}
              style={customStyles}
              className={imageClass}
            />
            {imageBlock.caption && (
              <p className={captionClass}>{imageBlock.caption}</p>
            )}
          </div>
        );
      }

      case "video": {
        const videoBlock = block as VideoBlock;
        if (!videoBlock.url || !videoBlock.embedId) {
          return (
            <div className="flex items-center justify-center h-48 bg-muted rounded border-2 border-dashed border-muted-foreground/25">
              <div className="text-center text-muted-foreground">
                <ImageIcon className="h-12 w-12 mx-auto mb-2" />
                <p className="text-sm">Video not configured</p>
              </div>
            </div>
          );
        }

        // Generate embed URL
        const getEmbedUrl = () => {
          if (videoBlock.platform === "youtube") {
            return `https://www.youtube.com/embed/${videoBlock.embedId}`;
          } else if (videoBlock.platform === "vimeo") {
            return `https://player.vimeo.com/video/${videoBlock.embedId}`;
          }
          return "";
        };

        const embedUrl = getEmbedUrl();
        if (!embedUrl) {
          return (
            <div className="flex items-center justify-center h-48 bg-muted rounded border-2 border-dashed border-muted-foreground/25">
              <div className="text-center text-muted-foreground">
                <ImageIcon className="h-12 w-12 mx-auto mb-2" />
                <p className="text-sm">Unsupported video platform</p>
              </div>
            </div>
          );
        }

        const videoContainerClass = videoBlock.cssClassName
          ? videoBlock.cssClassName
          : "mb-4";

        const aspectRatioClass =
          videoBlock.aspectRatio === "16:9"
            ? "aspect-video"
            : videoBlock.aspectRatio === "4:3"
              ? "aspect-[4/3]"
              : "aspect-square";

        const alignmentStyle = {
          textAlign: videoBlock.alignment || "center",
        };

        return (
          <div className={videoContainerClass} style={alignmentStyle}>
            <div className={`relative w-full ${aspectRatioClass}`}>
              <iframe
                src={embedUrl}
                title={videoBlock.title || "Video"}
                className="w-full h-full rounded"
                style={customStyles}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
            {videoBlock.title && (
              <p className="text-sm text-muted-foreground mt-2 text-center italic">
                {videoBlock.title}
              </p>
            )}
          </div>
        );
      }

      case "divider": {
        const dividerBlock = block as DividerBlock;
        return (
          <div
            className={
              dividerBlock.cssClassName
                ? dividerBlock.cssClassName
                : "my-8 border-t border-border"
            }
            style={customStyles}
          />
        );
      }

      case "frontmatter": {
        // Frontmatter blocks are handled separately in news article mode
        // and should not be rendered in the content flow
        return null;
      }

      default:
        return null;
    }
  }
);
