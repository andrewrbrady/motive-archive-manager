import React, { useMemo } from "react";
import { ImageIcon } from "lucide-react";
import {
  ContentBlock,
  TextBlock,
  ImageBlock,
  VideoBlock,
  DividerBlock,
  HTMLBlock,
} from "../types";
import {
  classToInlineStyles,
  classToEmailInlineStyles,
} from "@/lib/css-parser";
import {
  useStylesheetData,
  getCSSClassFromStylesheet,
} from "@/hooks/useStylesheetData";
import {
  formatContent,
  getElementStylesFromStylesheet,
  hasHtmlContent,
} from "@/lib/content-formatter";

interface CleanRendererProps {
  blocks: ContentBlock[];
  selectedStylesheetId?: string | null;
  previewMode?: "clean" | "email";
  emailPlatform?: string;
}

/**
 * CleanRenderer - Renders blocks in clean preview mode or email layout
 *
 * Extracted from BlockComposer.tsx CleanPreview component for modularity.
 * Handles both clean preview and email layout modes.
 * Updated for CSS preview reactivity - now properly reacts to stylesheet changes.
 */
export const CleanRenderer = React.memo<CleanRendererProps>(
  function CleanRenderer({
    blocks,
    selectedStylesheetId,
    previewMode = "clean",
    emailPlatform = "generic",
  }) {
    // Load stylesheet data reactively
    const { stylesheetData, loading: stylesheetLoading } = useStylesheetData(
      selectedStylesheetId || null
    );

    // DEBUG: CleanRenderer successfully loading stylesheet data

    const sortedBlocks = useMemo(
      () => [...blocks].sort((a, b) => a.order - b.order),
      [blocks]
    );

    // Don't render if we're loading stylesheet data OR if we have a stylesheet ID but no data
    if (selectedStylesheetId && (stylesheetLoading || !stylesheetData)) {
      console.log("🎯 CleanRenderer: Waiting for stylesheet data...");
      return (
        <div className="content-studio-preview content-blocks-area min-h-full bg-background">
          <div className="flex items-center justify-center p-6">
            <div className="text-muted-foreground">Loading stylesheet...</div>
          </div>
        </div>
      );
    }

    // Email Preview Mode - Separate header images from content blocks
    if (previewMode === "email") {
      const { headerImages, contentBlocks } = useMemo(() => {
        const header: ImageBlock[] = [];
        const content: ContentBlock[] = [];

        let foundNonHeaderBlock = false;
        for (const block of sortedBlocks) {
          const isFullWidthImage =
            block.type === "image" && (block as ImageBlock).email?.isFullWidth;

          if (isFullWidthImage && !foundNonHeaderBlock) {
            header.push(block as ImageBlock);
          } else {
            foundNonHeaderBlock = true;
            content.push(block);
          }
        }

        return {
          headerImages: header,
          contentBlocks: content,
        };
      }, [sortedBlocks]);

      return (
        <div className="content-studio-preview content-blocks-area min-h-full bg-background">
          {/* Full-width header images */}
          {headerImages.map((block) => (
            <div
              key={block.id}
              className="w-full"
              style={{
                backgroundColor: block.email?.backgroundColor || "#111111",
              }}
            >
              <CleanPreviewBlock
                block={block}
                stylesheetData={stylesheetData}
                previewMode={previewMode}
                emailPlatform={emailPlatform}
              />
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
                stylesheetData={stylesheetData}
                previewMode={previewMode}
                emailPlatform={emailPlatform}
              />
            ))}
          </div>
        </div>
      );
    }

    // Regular Clean Preview Mode
    return (
      <div className="content-studio-preview content-blocks-area min-h-full bg-background">
        <div className="space-y-4 p-6">
          {sortedBlocks.map((block) => (
            <CleanPreviewBlock
              key={block.id}
              block={block}
              stylesheetData={stylesheetData}
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
 * Updated for CSS preview reactivity - now uses stylesheetData for proper updates
 */
interface CleanPreviewBlockProps {
  block: ContentBlock;
  stylesheetData: any; // StylesheetData from useStylesheetData
  previewMode?: "clean" | "email";
  emailPlatform?: string;
}

const CleanPreviewBlock = React.memo<CleanPreviewBlockProps>(
  function CleanPreviewBlock({
    block,
    stylesheetData,
    previewMode = "clean",
    emailPlatform = "generic",
  }) {
    // CleanPreviewBlock now properly receives stylesheet data
    const customStyles = useMemo(() => {
      // Get updated CSS class data from current stylesheet
      const currentCSSClass = getCSSClassFromStylesheet(
        stylesheetData,
        block.cssClassName
      );

      if (currentCSSClass) {
        // Use processed CSS for email mode
        return previewMode === "email"
          ? classToEmailInlineStyles(currentCSSClass, emailPlatform)
          : classToInlineStyles(currentCSSClass);
      }
      return {};
    }, [stylesheetData, block.cssClassName, previewMode, emailPlatform]);

    switch (block.type) {
      case "html": {
        const htmlBlock = block as HTMLBlock;
        const content = htmlBlock.content || "<p>No HTML content provided</p>";

        return (
          <div
            className={`html-block ${htmlBlock.cssClassName || ""}`}
            style={customStyles}
            dangerouslySetInnerHTML={{ __html: content }}
            data-block-type="html"
            data-block-id={htmlBlock.id}
          />
        );
      }

      case "list": {
        const listBlock = block as import("../types").ListBlock;
        const items = listBlock.items || [];

        if (items.length === 0) {
          return (
            <div className="text-muted-foreground italic">Empty list block</div>
          );
        }

        return (
          <ul
            className={`list-disc pl-6 space-y-2 ${listBlock.cssClassName || ""}`}
            style={customStyles}
          >
            {items.map((item, idx) => (
              <li key={idx} className="text-foreground">
                {item}
              </li>
            ))}
          </ul>
        );
      }

      case "text": {
        const textBlock = block as TextBlock;
        const content = textBlock.content || "Your text will appear here...";

        // Determine if content contains HTML tags
        const contentHasHtml = useMemo(() => {
          const sourceContent =
            textBlock.richFormatting?.formattedContent || content;
          return hasHtmlContent(sourceContent);
        }, [textBlock.richFormatting?.formattedContent, content]);

        const formattedContent = useMemo(() => {
          // Use richFormatting.formattedContent if available, otherwise use regular content
          const sourceContent =
            textBlock.richFormatting?.formattedContent || content;

          console.log("🔍 CleanRenderer Debug:");
          console.log("- Source content:", sourceContent);
          console.log("- Content has HTML:", contentHasHtml);
          console.log("- Stylesheet data available:", !!stylesheetData);
          if (stylesheetData) {
            console.log(
              "- Global styles:",
              stylesheetData.parsedCSS?.globalStyles
            );
          }

          // Use smart content formatting that preserves HTML tags and applies styles
          const formatted = formatContent(sourceContent, {
            preserveHtml: true,
            emailMode: previewMode === "email",
            emailPlatform: emailPlatform,
            stylesheetData: stylesheetData,
          });

          console.log("- Formatted content:", formatted);
          return formatted;
        }, [
          textBlock.richFormatting?.formattedContent,
          content,
          previewMode,
          emailPlatform,
          stylesheetData,
          contentHasHtml,
        ]);

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

        const elementType = textBlock.element || "p";
        const defaultClasses = getElementClasses(elementType);

        // FIXED: Handle HTML content vs plain text content differently
        if (contentHasHtml) {
          // Content contains HTML tags - formatContent already applied styles to those tags
          // Use a generic wrapper div to avoid nested elements
          const finalClassName = textBlock.cssClassName
            ? `${textBlock.cssClassName} ${textClass}`
            : textClass;

          // For headings, don't add line breaks; for paragraphs, add them
          const processedContent =
            elementType === "p"
              ? formattedContent
              : formattedContent.replace(/<br>/g, " ");

          console.log("- Using DIV wrapper for HTML content");
          console.log("- Final className:", finalClassName);
          console.log("- Custom styles:", customStyles);

          return (
            <div
              className={finalClassName}
              style={customStyles}
              dangerouslySetInnerHTML={{ __html: processedContent }}
            />
          );
        } else {
          // Content is plain text - apply global element styles to wrapper element
          const finalClassName = textBlock.cssClassName
            ? `${textBlock.cssClassName} ${textClass}`
            : `${defaultClasses} ${textClass}`;

          // Get global element styles from stylesheet
          const globalElementStyles = useMemo(() => {
            const styles = getElementStylesFromStylesheet(
              elementType,
              stylesheetData,
              previewMode === "email"
            );
            console.log(`- Global element styles for ${elementType}:`, styles);
            return styles;
          }, [elementType, stylesheetData, previewMode]);

          // Combine CSS class styles with global element styles
          const combinedStyles = useMemo(() => {
            const combined = { ...globalElementStyles, ...customStyles };
            console.log("- Combined styles:", combined);
            return combined;
          }, [globalElementStyles, customStyles]);

          // For headings, don't add line breaks; for paragraphs, add them
          const processedContent =
            elementType === "p"
              ? formattedContent
              : formattedContent.replace(/<br>/g, " ");

          console.log(
            `- Using ${elementType.toUpperCase()} wrapper for plain text`
          );
          console.log("- Final className:", finalClassName);

          return React.createElement(elementType, {
            className: finalClassName,
            style: combinedStyles,
            dangerouslySetInnerHTML: { __html: processedContent },
          });
        }
      }

      case "image": {
        const imageBlock = block as ImageBlock;
        const hasImage =
          imageBlock.imageUrl && imageBlock.imageUrl.trim() !== "";
        const isFullWidthEmail = imageBlock.email?.isFullWidth;

        if (!hasImage) {
          return (
            <div className="flex items-center justify-center h-32 bg-muted/20 border-2 border-dashed border-border/40 rounded-lg">
              <div className="text-center text-muted-foreground">
                <ImageIcon className="h-8 w-8 mx-auto mb-2" />
                <p>No image selected</p>
              </div>
            </div>
          );
        }

        // Get global img styles from stylesheet (this is the key fix for images!)
        const globalImgStyles = useMemo(() => {
          return getElementStylesFromStylesheet(
            "img",
            stylesheetData,
            previewMode === "email"
          );
        }, [stylesheetData, previewMode]);

        const imageStyle = {
          width: imageBlock.width || "100%",
          height: imageBlock.height || "auto",
          objectFit: "cover" as const,
          ...globalImgStyles,
          ...customStyles,
        };

        if (isFullWidthEmail) {
          return (
            <img
              src={imageBlock.imageUrl}
              alt={imageBlock.altText || "Full-width image"}
              style={imageStyle}
              className={`w-full block ${imageBlock.cssClassName || ""}`}
            />
          );
        }

        return (
          <div className="text-center">
            <img
              src={imageBlock.imageUrl}
              alt={imageBlock.altText || "Image"}
              style={imageStyle}
              className={`inline-block max-w-full h-auto ${imageBlock.cssClassName || ""}`}
            />
          </div>
        );
      }

      case "video": {
        const videoBlock = block as VideoBlock;
        const hasVideo =
          videoBlock.url && videoBlock.embedId && videoBlock.platform;

        if (!hasVideo) {
          return (
            <div className="flex items-center justify-center h-32 bg-muted/20 border-2 border-dashed border-border/40 rounded-lg">
              <div className="text-center text-muted-foreground">
                <div className="text-2xl mb-2">🎥</div>
                <p>No video URL provided</p>
              </div>
            </div>
          );
        }

        const getEmbedUrl = () => {
          if (videoBlock.platform === "youtube") {
            return `https://www.youtube.com/embed/${videoBlock.embedId}`;
          } else if (videoBlock.platform === "vimeo") {
            return `https://player.vimeo.com/video/${videoBlock.embedId}`;
          }
          return "";
        };

        const aspectRatioClass =
          videoBlock.aspectRatio === "16:9"
            ? "aspect-video"
            : videoBlock.aspectRatio === "4:3"
              ? "aspect-[4/3]"
              : "aspect-square";

        return (
          <div className="text-center">
            <div className={`${aspectRatioClass} max-w-full mx-auto`}>
              <iframe
                src={getEmbedUrl()}
                className="w-full h-full rounded-lg"
                style={customStyles}
                frameBorder="0"
                allowFullScreen
              />
            </div>
          </div>
        );
      }

      case "divider": {
        const dividerBlock = block as DividerBlock;
        const dividerStyle = {
          height: dividerBlock.thickness || "1px",
          backgroundColor: dividerBlock.color || "#e5e7eb",
          margin: dividerBlock.margin || "20px 0",
          ...customStyles,
        };

        return <hr className="border-0" style={dividerStyle} />;
      }

      default:
        return null;
    }
  }
);
