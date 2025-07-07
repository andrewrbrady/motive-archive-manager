"use client";

import React, { useMemo } from "react";
import { ContentBlock, ImageBlock, TextBlock, HTMLBlock } from "./types";
import { EmailContainerConfig } from "./EmailContainerConfig";
import { classToEmailInlineStyles } from "@/lib/css-parser";
import {
  useStylesheetData,
  getCSSClassFromStylesheet,
} from "@/hooks/useStylesheetData";
import {
  formatContent,
  getElementStylesFromStylesheet,
  hasHtmlContent,
} from "@/lib/content-formatter";

interface AccurateEmailPreviewProps {
  blocks: ContentBlock[];
  containerConfig: EmailContainerConfig;
  selectedStylesheetId?: string | null;
  stylesheetData?: any; // StylesheetData from useStylesheetData hook
}

/**
 * AccurateEmailPreview - Renders email preview that matches actual email export structure
 * Different rendering based on email platform (SendGrid, Mailchimp, Generic)
 */
export const AccurateEmailPreview: React.FC<AccurateEmailPreviewProps> = ({
  blocks,
  containerConfig,
  selectedStylesheetId,
  stylesheetData: propStylesheetData,
}) => {
  // Load stylesheet data reactively (fallback if not provided as prop)
  const { stylesheetData: hookStylesheetData, loading: stylesheetLoading } =
    useStylesheetData(selectedStylesheetId || null);

  // Use prop stylesheet data if available, otherwise use hook data
  const stylesheetData = propStylesheetData || hookStylesheetData;

  // MUST be before early return to maintain hook order
  const { headerImages, contentBlocks } = useMemo(() => {
    const header: ImageBlock[] = [];
    const content: ContentBlock[] = [];

    blocks.forEach((block) => {
      if (block.type === "image") {
        const imageBlock = block as ImageBlock;
        if (imageBlock.email?.isFullWidth) {
          header.push(imageBlock);
        } else {
          content.push(block);
        }
      } else {
        content.push(block);
      }
    });

    return {
      headerImages: header,
      contentBlocks: content.sort((a, b) => a.order - b.order),
    };
  }, [blocks]);

  // Don't render if we're loading stylesheet data OR if we have a stylesheet ID but no data
  if (selectedStylesheetId && (stylesheetLoading || !stylesheetData)) {
    return (
      <div className="email-preview">
        <div className="flex items-center justify-center p-6">
          <div className="text-muted-foreground">Loading stylesheet...</div>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    return contentBlocks.map((block) => (
      <div key={block.id} className="mb-4 last:mb-0">
        <EmailBlock
          block={block}
          containerConfig={containerConfig}
          stylesheetData={stylesheetData}
        />
      </div>
    ));
  };

  const renderHeader = () => {
    // Show header if either container header is enabled OR there are header images
    const shouldShowContainerHeader = containerConfig.headerEnabled;
    const hasHeaderImages = headerImages.length > 0;

    if (!shouldShowContainerHeader && !hasHeaderImages) {
      return null;
    }

    return (
      <div
        className="email-header"
        style={{
          backgroundColor: containerConfig.headerBackgroundColor,
          padding: hasHeaderImages ? containerConfig.headerPadding : "0",
        }}
      >
        {/* Container header (logo) - only show if enabled */}
        {shouldShowContainerHeader && containerConfig.logoUrl && (
          <div className="text-center mb-4">
            <img
              src={containerConfig.logoUrl}
              alt={containerConfig.logoAlt}
              style={{
                height: containerConfig.logoHeight,
                display: "block",
                margin: "0 auto",
              }}
            />
          </div>
        )}

        {/* Content header images - always show if they exist */}
        {headerImages.map((block) => (
          <div
            key={block.id}
            className="w-full mb-4 last:mb-0"
            style={{
              backgroundColor: block.email?.backgroundColor || "#111111",
            }}
          >
            <img
              src={block.imageUrl}
              alt={block.altText || "Header image"}
              style={{
                width: "100%",
                height: "auto",
                display: "block",
                ...(block.email?.isFullWidth && {
                  objectFit: "cover",
                  minHeight: "200px",
                }),
              }}
            />
          </div>
        ))}
      </div>
    );
  };

  const renderFooter = () => {
    if (!containerConfig.footerEnabled) return null;

    return (
      <div
        className="email-footer text-center"
        style={{
          backgroundColor: containerConfig.footerBackgroundColor,
          padding: containerConfig.footerPadding,
          color: containerConfig.textColor,
        }}
      >
        <p className="mb-2" style={{ margin: "0 0 8px 0" }}>
          {containerConfig.footerText}
        </p>
        <p className="text-sm" style={{ margin: "0", fontSize: "14px" }}>
          {containerConfig.copyrightText}
        </p>
      </div>
    );
  };

  // Render based on platform
  switch (containerConfig.platform) {
    case "sendgrid":
      return <SendGridPreview />;
    case "mailchimp":
      return <MailchimpPreview />;
    default:
      return <GenericPreview />;
  }

  function SendGridPreview() {
    return (
      <div className="content-studio-preview content-blocks-area email-preview sendgrid-preview">
        <style jsx>{`
          .email-container {
            max-width: ${containerConfig.maxWidth};
            margin: 0 auto;
            background-color: ${containerConfig.backgroundColor};
            border-radius: ${containerConfig.borderRadius};
            box-shadow: ${containerConfig.boxShadow};
            overflow: hidden;
          }
          .email-content {
            background-color: ${containerConfig.contentBackgroundColor};
            padding: ${containerConfig.contentPadding};
            color: ${containerConfig.textColor};
          }
          .email-content a {
            color: ${containerConfig.linkColor};
          }
          ${containerConfig.customCSS}
        `}</style>

        <div className="email-container">
          {renderHeader()}

          <div className="email-content">
            {contentBlocks.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <div className="text-4xl mb-4">📧</div>
                <p>Add content blocks to see your email preview</p>
              </div>
            ) : (
              renderContent()
            )}
          </div>

          {renderFooter()}
        </div>
      </div>
    );
  }

  function MailchimpPreview() {
    return (
      <div className="content-studio-preview content-blocks-area email-preview mailchimp-preview">
        <style jsx>{`
          .email-table {
            width: 100%;
            max-width: ${containerConfig.maxWidth};
            margin: 0 auto;
            background-color: ${containerConfig.backgroundColor};
            border-radius: ${containerConfig.borderRadius};
            box-shadow: ${containerConfig.boxShadow};
          }
          .email-content-cell {
            background-color: ${containerConfig.contentBackgroundColor};
            padding: ${containerConfig.contentPadding};
            color: ${containerConfig.textColor};
          }
          .email-content-cell a {
            color: ${containerConfig.linkColor};
          }
          ${containerConfig.customCSS}
        `}</style>

        <table className="email-table" cellSpacing={0} cellPadding={0}>
          <tbody>
            {/* Header - show if container header enabled OR header images exist */}
            {(containerConfig.headerEnabled || headerImages.length > 0) && (
              <tr>
                <td
                  style={{
                    backgroundColor: containerConfig.headerBackgroundColor,
                    padding:
                      headerImages.length > 0
                        ? containerConfig.headerPadding
                        : "0",
                  }}
                >
                  {/* Container header (logo) - only show if enabled */}
                  {containerConfig.headerEnabled && containerConfig.logoUrl && (
                    <div className="text-center mb-4">
                      <img
                        src={containerConfig.logoUrl}
                        alt={containerConfig.logoAlt}
                        style={{
                          height: containerConfig.logoHeight,
                          display: "block",
                          margin: "0 auto",
                        }}
                      />
                    </div>
                  )}

                  {/* Content header images - always show if they exist */}
                  {headerImages.map((block) => (
                    <div
                      key={block.id}
                      className="w-full mb-4 last:mb-0"
                      style={{
                        backgroundColor:
                          block.email?.backgroundColor || "#111111",
                      }}
                    >
                      <img
                        src={block.imageUrl}
                        alt={block.altText || "Header image"}
                        style={{
                          width: "100%",
                          height: "auto",
                          display: "block",
                          ...(block.email?.isFullWidth && {
                            objectFit: "cover",
                            minHeight: "200px",
                          }),
                        }}
                      />
                    </div>
                  ))}
                </td>
              </tr>
            )}

            {/* Content */}
            <tr>
              <td className="email-content-cell">
                {contentBlocks.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <div className="text-4xl mb-4">📧</div>
                    <p>Add content blocks to see your email preview</p>
                  </div>
                ) : (
                  renderContent()
                )}
              </td>
            </tr>

            {/* Footer */}
            {containerConfig.footerEnabled && (
              <tr>
                <td
                  style={{
                    backgroundColor: containerConfig.footerBackgroundColor,
                    padding: containerConfig.footerPadding,
                    color: containerConfig.textColor,
                    textAlign: "center",
                  }}
                >
                  <p style={{ margin: "0 0 8px 0" }}>
                    {containerConfig.footerText}
                  </p>
                  <p style={{ margin: "0", fontSize: "14px" }}>
                    {containerConfig.copyrightText}
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    );
  }

  function GenericPreview() {
    return (
      <div className="content-studio-preview content-blocks-area email-preview generic-preview">
        <div
          className="email-container"
          style={{
            maxWidth: containerConfig.maxWidth,
            margin: "0 auto",
            backgroundColor: containerConfig.backgroundColor,
            borderRadius: containerConfig.borderRadius,
            boxShadow: containerConfig.boxShadow,
            overflow: "hidden",
          }}
        >
          {renderHeader()}

          <div
            className="email-content"
            style={{
              backgroundColor: containerConfig.contentBackgroundColor,
              padding: containerConfig.contentPadding,
              color: containerConfig.textColor,
            }}
          >
            {contentBlocks.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <div className="text-4xl mb-4">📧</div>
                <p>Add content blocks to see your email preview</p>
              </div>
            ) : (
              renderContent()
            )}
          </div>

          {renderFooter()}
        </div>

        <style jsx>{`
          .email-content a {
            color: ${containerConfig.linkColor};
          }
          ${containerConfig.customCSS}
        `}</style>
      </div>
    );
  }
};

/**
 * EmailBlock - Renders individual content blocks for email preview
 */
interface EmailBlockProps {
  block: ContentBlock;
  containerConfig: EmailContainerConfig;
  stylesheetData: any; // StylesheetData from useStylesheetData
}

const EmailBlock: React.FC<EmailBlockProps> = ({
  block,
  containerConfig,
  stylesheetData,
}) => {
  const customStyles = useMemo(() => {
    // Get updated CSS class data from current stylesheet
    const currentCSSClass = getCSSClassFromStylesheet(
      stylesheetData,
      block.cssClassName
    );

    if (currentCSSClass) {
      return classToEmailInlineStyles(
        currentCSSClass,
        containerConfig.platform
      );
    }
    return {};
  }, [stylesheetData, block.cssClassName, containerConfig.platform]);

  switch (block.type) {
    case "html": {
      const htmlBlock = block as HTMLBlock;
      const content = htmlBlock.content || "<p>No HTML content provided</p>";

      return (
        <div
          style={{
            margin: "20px 0",
            fontFamily: "inherit",
            lineHeight: "inherit",
            ...customStyles,
          }}
          className={`html-block ${block.cssClassName || ""}`}
          data-block-type="html"
          data-block-id={htmlBlock.id}
          dangerouslySetInnerHTML={{ __html: content }}
        />
      );
    }

    case "list": {
      const listBlock = block as any;
      const items = listBlock.items || [];

      if (items.length === 0) {
        return (
          <div
            style={{
              color: "#666",
              fontStyle: "italic",
              margin: "20px 0",
              ...customStyles,
            }}
            className={block.cssClassName || ""}
          >
            Empty list
          </div>
        );
      }

      return (
        <ul
          style={{
            margin: "20px 0",
            paddingLeft: "40px",
            listStyleType: "disc",
            color: "#333",
            fontSize: "16px",
            lineHeight: "1.6",
            ...customStyles,
          }}
          className={block.cssClassName || ""}
        >
          {items.map((item: string, index: number) => (
            <li
              key={index}
              style={{
                marginBottom: "10px",
              }}
            >
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
        const sourceContent =
          textBlock.richFormatting?.formattedContent || content;

        // Use smart content formatting that preserves HTML tags
        return formatContent(sourceContent, {
          preserveHtml: true,
          emailMode: true,
          emailPlatform: containerConfig.platform,
          linkColor: containerConfig.linkColor,
          stylesheetData: stylesheetData,
        });
      }, [
        textBlock.richFormatting?.formattedContent,
        content,
        containerConfig.linkColor,
        containerConfig.platform,
        stylesheetData,
        contentHasHtml,
      ]);

      const element = textBlock.element || "p";
      const isHeading = element.startsWith("h");

      // Get global element styles from stylesheet (KEY FIX!)
      const globalElementStyles = useMemo(() => {
        const styles = getElementStylesFromStylesheet(
          element,
          stylesheetData,
          true // emailMode = true
        );
        console.log(`- Global element styles for ${element}:`, styles);
        return styles;
      }, [element, stylesheetData]);

      // FIXED: Handle HTML content vs plain text content differently
      if (contentHasHtml) {
        // Content contains HTML tags - formatContent already applied styles to those tags
        // Use a generic div wrapper to avoid nested elements
        const defaultStyles = {
          color: containerConfig.textColor,
          margin: "0 0 16px 0",
          ...customStyles,
        };

        console.log("- Using DIV wrapper for HTML content");
        console.log("- Custom styles:", customStyles);

        return (
          <div
            style={defaultStyles}
            className={textBlock.cssClassName || ""}
            dangerouslySetInnerHTML={{ __html: formattedContent }}
          />
        );
      } else {
        // Content is plain text - apply global element styles to wrapper element
        const defaultStyles = {
          color: containerConfig.textColor,
          margin: "0 0 16px 0",
          ...(isHeading && {
            fontWeight: "bold",
            lineHeight: "1.3",
          }),
          ...globalElementStyles, // Apply global element styles!
          ...customStyles,
        };

        console.log(`- Using ${element.toUpperCase()} wrapper for plain text`);
        console.log("- Combined styles:", defaultStyles);

        return React.createElement(element, {
          style: defaultStyles,
          className: textBlock.cssClassName || "",
          dangerouslySetInnerHTML: { __html: formattedContent },
        });
      }
    }

    case "image": {
      const imageBlock = block as ImageBlock;
      if (!imageBlock.imageUrl) {
        return (
          <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-300 rounded">
            <div className="text-2xl mb-2">🖼️</div>
            <p>Image will appear here</p>
          </div>
        );
      }

      // Get global img styles from stylesheet
      const globalImgStyles = useMemo(() => {
        return getElementStylesFromStylesheet(
          "img",
          stylesheetData,
          true // emailMode = true
        );
      }, [stylesheetData]);

      const imageStyles = {
        maxWidth: "100%",
        height: "auto",
        display: "block",
        margin: "0 auto",
        borderRadius: "4px",
        ...globalImgStyles, // Apply global img styles!
        ...customStyles,
      };

      return (
        <div className="text-center">
          <img
            src={imageBlock.imageUrl}
            alt={imageBlock.altText || "Email image"}
            style={imageStyles}
            className={imageBlock.cssClassName || ""}
          />
          {imageBlock.caption && (
            <p
              className="text-sm text-gray-600 mt-2"
              style={{ fontSize: "12px", margin: "8px 0 0 0" }}
            >
              {imageBlock.caption}
            </p>
          )}
        </div>
      );
    }

    case "video": {
      const videoBlock = block as any;
      const videoUrl = videoBlock.url || videoBlock.videoUrl;
      const videoTitle = videoBlock.title || videoBlock.videoTitle || "Video";

      if (!videoUrl) {
        return (
          <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-300 rounded">
            <div className="text-2xl mb-2">🎥</div>
            <p>Video will appear here</p>
          </div>
        );
      }

      return (
        <div className="text-center">
          <div
            className="bg-gray-100 border-2 border-dashed border-gray-300 rounded p-8"
            style={{
              backgroundColor: "#f0f0f0",
              padding: "40px",
              borderRadius: "8px",
              border: "2px solid #ddd",
            }}
          >
            <div className="text-2xl mb-3">🎥</div>
            <h3 className="font-bold mb-2" style={{ margin: "0 0 8px 0" }}>
              {videoTitle}
            </h3>
            <p
              className="text-sm text-gray-600"
              style={{ margin: "0", fontSize: "14px" }}
            >
              Click to watch video
            </p>
            <div className="mt-4">
              <a
                href={videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                style={{
                  backgroundColor: containerConfig.linkColor,
                  color: "#ffffff",
                  padding: "8px 16px",
                  borderRadius: "4px",
                  textDecoration: "none",
                  display: "inline-block",
                }}
              >
                Watch Video
              </a>
            </div>
          </div>
        </div>
      );
    }

    case "divider": {
      return (
        <hr
          style={{
            border: "none",
            borderTop: "1px solid #ddd",
            margin: "30px 0",
            ...customStyles,
          }}
          className={block.cssClassName || ""}
        />
      );
    }

    case "button": {
      const buttonBlock = block as any;
      const buttonText = buttonBlock.text || buttonBlock.buttonText || "Button";
      const buttonUrl = buttonBlock.url || buttonBlock.buttonUrl || "#";

      return (
        <div className="text-center">
          <a
            href={buttonUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              backgroundColor: containerConfig.linkColor,
              color: "#ffffff",
              padding: "12px 24px",
              borderRadius: "4px",
              textDecoration: "none",
              display: "inline-block",
              fontWeight: "bold",
              ...customStyles,
            }}
            className={buttonBlock.cssClassName || ""}
          >
            {buttonText}
          </a>
        </div>
      );
    }

    case "spacer": {
      const spacerBlock = block as any;
      const height = spacerBlock.height || "20px";

      return (
        <div
          style={{
            height,
            ...customStyles,
          }}
          className={block.cssClassName || ""}
        />
      );
    }

    default:
      return (
        <div className="text-center py-4 text-gray-500">
          <p>Unsupported block type: {block.type}</p>
        </div>
      );
  }
};
