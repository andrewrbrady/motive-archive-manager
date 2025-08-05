import React, { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ImageIcon } from "lucide-react";
import {
  ContentBlock,
  TextBlock,
  ImageBlock,
  VideoBlock,
  DividerBlock,
  ButtonBlock,
  FrontmatterBlock,
  ListBlock,
  HTMLBlock,
} from "../types";
import { classToInlineStyles } from "@/lib/css-parser";
import { formatContent, stripInlineStyles } from "@/lib/content-formatter";

interface NewsArticleRendererProps {
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
  stylesheetData?: any; // StylesheetData from useStylesheetData hook
}

/**
 * NewsArticleRenderer - Renders blocks in news article format
 *
 * Extracted from BlockComposer.tsx CleanPreview component for modularity.
 * Handles frontmatter parsing, article header, content blocks, and CTA section.
 */
export const NewsArticleRenderer = React.memo<NewsArticleRendererProps>(
  function NewsArticleRenderer({
    blocks,
    compositionName,
    frontmatter,
    selectedStylesheetId,
    stylesheetData,
  }) {
    // DEBUG: Log stylesheet data reception in NewsArticleRenderer
    console.log(`🎯 NewsArticleRenderer - Received stylesheet data:`, {
      hasStylesheetData: !!stylesheetData,
      stylesheetId: selectedStylesheetId,
      cssContentLength: stylesheetData?.cssContent?.length || 0,
      timestamp: (stylesheetData as any)?._lastUpdated || "no timestamp",
    });
    const sortedBlocks = [...blocks].sort((a, b) => a.order - b.order);

    // Function to extract frontmatter from frontmatter blocks
    const extractFrontmatterFromBlocks = (blocks: ContentBlock[]) => {
      const frontmatterBlock = blocks.find(
        (block) => block.type === "frontmatter"
      ) as FrontmatterBlock | undefined;
      return frontmatterBlock?.data || null;
    };

    // Extract frontmatter from frontmatter blocks
    const frontmatterData = extractFrontmatterFromBlocks(sortedBlocks);
    // Prioritize frontmatter from blocks over passed-in frontmatter prop
    const effectiveFrontmatter = frontmatterData || frontmatter || {};

    // Filter out frontmatter blocks from content display
    const contentBlocks = sortedBlocks.filter((block) => {
      // Remove frontmatter blocks from content display
      if (block.type === "frontmatter") {
        return false;
      }

      // Also filter out blocks with frontmatter metadata source
      if (block.metadata?.source === "frontmatter") {
        return false;
      }

      return true;
    });

    // Parse the frontmatter date
    const articleDate = effectiveFrontmatter?.date
      ? new Date(effectiveFrontmatter.date).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : new Date().toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });

    // Use frontmatter or fallback values
    const articleTitle = effectiveFrontmatter?.title || "Article Title";
    const articleSubtitle =
      effectiveFrontmatter?.subtitle ||
      contentBlocks
        .find((block) => block.type === "text")
        ?.content?.substring(0, 150) + "..." ||
      "Article subtitle or lead paragraph will appear here.";
    const articleAuthor = effectiveFrontmatter?.author || "Motive Archive";
    const articleStatus = effectiveFrontmatter?.status || "LIVE AUCTION";
    const articleTags =
      effectiveFrontmatter?.tags && effectiveFrontmatter.tags.length > 0
        ? effectiveFrontmatter.tags
        : ["porsche", "auction", "bring-a-trailer"];
    const coverImage =
      effectiveFrontmatter?.cover ||
      (contentBlocks.find((block) => block.type === "image") as ImageBlock)
        ?.imageUrl;
    const callToActionText =
      effectiveFrontmatter?.callToAction ||
      "This vehicle is now live on Bring a Trailer.";
    const callToActionUrl = effectiveFrontmatter?.callToActionUrl || "#";

    return (
      <div className="content-studio-preview content-blocks-area min-h-full bg-background">
        <article className="max-w-4xl mx-auto px-6 py-8">
          {/* Debug Info */}
          {process.env.NODE_ENV === "development" && (
            <div className="mb-4 p-2 bg-yellow-100 dark:bg-yellow-900/20 text-xs text-yellow-700 dark:text-yellow-300 rounded">
              Debug: Cover: {coverImage || "none"} | Title: {articleTitle} |
              Subtitle: {articleSubtitle} | Frontmatter:{" "}
              {frontmatterData
                ? "from frontmatter block"
                : "from props/fallback"}
            </div>
          )}

          {/* Hero Image with Status Badge */}
          {coverImage && (
            <div className="relative mb-8">
              <img
                src={coverImage}
                alt="Featured image"
                className="w-full h-64 md:h-80 object-cover rounded-lg shadow-lg"
                onError={(e) => {
                  console.error("Failed to load cover image:", coverImage);
                  e.currentTarget.style.display = "none";
                }}
              />
              {articleStatus && (
                <div className="absolute top-4 right-4">
                  <Badge
                    variant="outline"
                    className="bg-background/90 text-foreground border-border font-medium"
                  >
                    {articleStatus}
                  </Badge>
                </div>
              )}
            </div>
          )}

          {/* Article Header */}
          <header className="mb-8 border-b border-border pb-8">
            <h1 className="text-4xl font-bold text-foreground mb-4 leading-tight">
              {articleTitle}
            </h1>

            <p className="text-xl text-muted-foreground leading-relaxed mb-6">
              {articleSubtitle}
            </p>

            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
              <span>By {articleAuthor}</span>
              <span>•</span>
              <span>{articleDate}</span>
            </div>

            {/* Tags */}
            <div className="flex gap-2 flex-wrap">
              {articleTags.map((tag: string, index: number) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          </header>

          {/* Article Content */}
          <div className="prose prose-lg max-w-none dark:prose-invert">
            {contentBlocks.map((block) => (
              <NewsArticleBlock key={block.id} block={block} />
            ))}
          </div>

          {/* Call to Action */}
          {callToActionText && (
            <div className="mt-12 p-6 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-blue-900 dark:text-blue-100 font-medium mb-4">
                {callToActionText}
              </p>
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => window.open(callToActionUrl, "_blank")}
              >
                View Auction
              </Button>
            </div>
          )}
        </article>
      </div>
    );
  }
);

/**
 * NewsArticleBlock - Renders individual blocks in news article mode
 */
interface NewsArticleBlockProps {
  block: ContentBlock;
}

const NewsArticleBlock = React.memo<NewsArticleBlockProps>(
  function NewsArticleBlock({ block }) {
    const customStyles = useMemo(() => {
      if (block.cssClass) {
        return classToInlineStyles(block.cssClass);
      }
      return {};
    }, [block.cssClass]);

    switch (block.type) {
      case "html": {
        const htmlBlock = block as HTMLBlock;
        const rawContent =
          htmlBlock.content || "<p>No HTML content provided</p>";

        // CRITICAL FIX: Strip inline styles and rely on CSS injection
        const content = useMemo(() => {
          const strippedContent = stripInlineStyles(rawContent);
          console.log(
            "🧹 NewsArticleRenderer - Stripped inline styles (using CSS injection):"
          );
          console.log("- Original:", rawContent.substring(0, 200) + "...");
          console.log("- Stripped:", strippedContent.substring(0, 200) + "...");
          return strippedContent;
        }, [rawContent]);

        return (
          <div
            className={`html-block mb-6 ${htmlBlock.cssClassName || ""}`}
            style={customStyles}
            dangerouslySetInnerHTML={{ __html: content }}
          />
        );
      }

      case "list": {
        const listBlock = block as ListBlock;
        const items = listBlock.items || [];

        if (items.length === 0) {
          return (
            <div className="text-muted-foreground italic">Empty list block</div>
          );
        }

        return (
          <ul
            className={`list-disc pl-6 space-y-2 mb-6 ${listBlock.cssClassName || ""}`}
            style={customStyles}
          >
            {items.map((item, idx) => (
              <li key={idx} className="text-muted-foreground">
                {item}
              </li>
            ))}
          </ul>
        );
      }

      case "text": {
        const textBlock = block as TextBlock;
        const content = textBlock.content || "Your text will appear here...";

        const formattedContent = useMemo(() => {
          // Use richFormatting.formattedContent if available, otherwise use regular content
          const sourceContent =
            textBlock.richFormatting?.formattedContent || content;

          // Use smart content formatting that preserves HTML tags
          return formatContent(sourceContent, {
            preserveHtml: true,
            emailMode: false,
            stylesheetData: null, // NewsArticleRenderer doesn't use stylesheet data
          });
        }, [textBlock.richFormatting?.formattedContent, content]);
        const textClass = !textBlock.content
          ? "text-muted-foreground italic"
          : "text-foreground";

        // Get default classes based on element type for news article mode
        const getElementClasses = (element: string) => {
          switch (element) {
            case "h1":
              return "text-3xl font-bold mb-6 mt-8 text-foreground";
            case "h2":
              return "text-2xl font-bold mb-4 mt-6 text-foreground border-b border-border pb-2";
            case "h3":
              return "text-xl font-bold mb-3 mt-5 text-foreground";
            case "h4":
              return "text-lg font-bold mb-2 mt-4 text-foreground";
            case "h5":
              return "text-base font-bold mb-2 mt-3 text-foreground";
            case "h6":
              return "text-sm font-bold mb-1 mt-2 text-foreground";
            case "p":
            default:
              return "mb-4 leading-relaxed text-muted-foreground text-base";
          }
        };

        const elementType = textBlock.element || "p";
        const defaultClasses = getElementClasses(elementType);
        const finalClassName = textBlock.cssClassName
          ? `${textBlock.cssClassName} ${textClass}`
          : `${defaultClasses} ${textClass}`;

        // For headings, don't add line breaks; for paragraphs, add them
        const processedContent =
          elementType === "p"
            ? formattedContent
            : formattedContent.replace(/<br>/g, " ");

        return React.createElement(textBlock.element || "p", {
          className: finalClassName,
          style: customStyles,
          dangerouslySetInnerHTML: { __html: processedContent },
        });
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

        const imageContainerClass = "mb-8 mt-6";
        const imageClass = "w-full h-auto rounded-lg shadow-lg";
        const captionClass =
          "text-sm text-muted-foreground mt-3 text-center italic font-light";

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
            <div className="flex items-center justify-center h-48 bg-muted rounded border-2 border-dashed border-muted-foreground/25 my-8">
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
            <div className="flex items-center justify-center h-48 bg-muted rounded border-2 border-dashed border-muted-foreground/25 my-8">
              <div className="text-center text-muted-foreground">
                <ImageIcon className="h-12 w-12 mx-auto mb-2" />
                <p className="text-sm">Unsupported video platform</p>
              </div>
            </div>
          );
        }

        const videoContainerClass = "mb-8 mt-6";
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
            <div
              className={`relative w-full ${aspectRatioClass} max-w-4xl mx-auto`}
            >
              <iframe
                src={embedUrl}
                title={videoBlock.title || "Video"}
                className="w-full h-full rounded-lg shadow-lg"
                style={customStyles}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
            {videoBlock.title && (
              <p className="text-sm text-muted-foreground mt-3 text-center italic font-light">
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

      case "button": {
        const buttonBlock = block as ButtonBlock;
        const buttonText = buttonBlock.text || "Button";
        const buttonUrl = buttonBlock.url || "#";

        const buttonStyle = {
          backgroundColor: buttonBlock.backgroundColor || "#007bff",
          color: buttonBlock.textColor || "#ffffff",
          padding: buttonBlock.padding || "12px 24px",
          borderRadius: buttonBlock.borderRadius || "6px",
          textDecoration: "none",
          display: "inline-block",
          fontWeight: "500",
          fontSize: "14px",
          border: "none",
          cursor: "pointer",
          ...customStyles,
        };

        return (
          <div className="text-center my-6">
            <button
              className={buttonBlock.cssClassName || ""}
              style={buttonStyle}
              disabled={true} // Disabled in preview
            >
              {buttonText}
            </button>
            {buttonUrl && buttonUrl !== "#" && (
              <div className="text-xs text-muted-foreground mt-2 font-mono">
                → {buttonUrl}
              </div>
            )}
          </div>
        );
      }

      default:
        return null;
    }
  }
);
