"use client";

import React, { useMemo } from "react";
import {
  ContentBlock,
  ImageBlock,
  TextBlock,
  HTMLBlock,
  ButtonBlock,
} from "./types";
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
  stripInlineStyles,
  applyStylesheetAsInlineStyles,
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
    // Remove extra wrapper margins so spacing mirrors exported HTML (table td padding)
    return contentBlocks.map((block) => (
      <EmailBlock
        key={block.id}
        block={block}
        containerConfig={containerConfig}
        stylesheetData={stylesheetData}
      />
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
          <div className="text-center">
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
            className="w-full"
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
      <div className="content-studio-preview content-blocks-area email-preview sendgrid-preview accurate-email-preview">
        {/* Use table-based structure like the actual SendGrid export */}
        <table
          role="presentation"
          cellSpacing={0}
          cellPadding={0}
          style={{ width: "100%", backgroundColor: "#f4f4f4" }}
        >
          <tbody>
            <tr>
              <td align="center" style={{ padding: "20px" }}>
                <table
                  role="presentation"
                  cellSpacing={0}
                  cellPadding={0}
                  style={{
                    backgroundColor: "#ffffff",
                    margin: "0 auto",
                    width: "100%",
                    maxWidth: "600px",
                  }}
                >
                  <tbody>
                    {/* Header */}
                    {(containerConfig.headerEnabled ||
                      headerImages.length > 0) && (
                      <tr>
                        <td style={{ padding: "0" }}>{renderHeader()}</td>
                      </tr>
                    )}

                    {/* Content */}
                    <tr>
                      <td style={{ padding: "20px" }}>
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
                        <td>{renderFooter()}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }

  function MailchimpPreview() {
    return (
      <div className="content-studio-preview content-blocks-area email-preview mailchimp-preview accurate-email-preview">
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
    // DEBUG: Log what we're receiving for debugging
    React.useEffect(() => {
      console.log(`🔍 AccurateEmailPreview DEBUG:`, {
        hasStylesheetData: !!stylesheetData,
        stylesheetId: selectedStylesheetId,
        cssContentLength: stylesheetData?.cssContent?.length || 0,
        cssContentSample:
          stylesheetData?.cssContent?.substring(0, 200) || "No CSS",
        containerPlatform: containerConfig.platform,
      });

      // Also check if StylesheetInjector has created any style elements
      const stylesheetElements = document.querySelectorAll(
        'style[id^="stylesheet-"]'
      );
      console.log(
        `📊 Found ${stylesheetElements.length} stylesheet elements in DOM:`,
        Array.from(stylesheetElements).map((el) => ({
          id: el.id,
          contentLength: el.textContent?.length || 0,
          contentSample: el.textContent?.substring(0, 100) || "No content",
        }))
      );
    }, [stylesheetData, selectedStylesheetId, containerConfig]);

    return (
      <div className="content-studio-preview content-blocks-area email-preview generic-preview accurate-email-preview">
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
      const styles = classToEmailInlineStyles(
        currentCSSClass,
        containerConfig.platform
      );

      // DEBUG: Log CSS class application
      console.log(`🎨 CSS Class Applied for ${block.type} block:`, {
        blockId: block.id,
        cssClassName: block.cssClassName,
        cssClassFound: !!currentCSSClass,
        stylesApplied: styles,
        platform: containerConfig.platform,
        stylesheetDataAvailable: !!stylesheetData,
        totalStylesheetClasses: stylesheetData?.classes?.length || 0,
      });

      return styles;
    }
    return {};
  }, [stylesheetData, block.cssClassName, containerConfig.platform]);

  // Standard spacing for all blocks (honor global blockSpacing override)
  const getBlockSpacing = (defaultBottom: string = "12px") => {
    const bottom = containerConfig.blockSpacing || defaultBottom;
    return {
      paddingTop: "0px",
      paddingBottom: bottom,
    };
  };

  switch (block.type) {
    case "html": {
      const htmlBlock = block as HTMLBlock;
      const rawContent = htmlBlock.content || "<p>No HTML content provided</p>";
      const spacing = getBlockSpacing("12px");

      return (
        <table
          role="presentation"
          cellSpacing={0}
          cellPadding={0}
          style={{ width: "100%" }}
        >
          <tbody>
            <tr>
              <td style={spacing}>
                <div
                  className={`html-block ${block.cssClassName || ""}`}
                  style={{
                    fontFamily: "inherit",
                    lineHeight: "inherit",
                    ...customStyles,
                  }}
                  data-block-type="html"
                  data-block-id={htmlBlock.id}
                  dangerouslySetInnerHTML={{ __html: rawContent }}
                />
              </td>
            </tr>
          </tbody>
        </table>
      );
    }

    case "list": {
      const listBlock = block as any;
      const items = listBlock.items || [];
      const spacing = getBlockSpacing("12px");

      if (items.length === 0) {
        return (
          <table
            role="presentation"
            cellSpacing={0}
            cellPadding={0}
            style={{ width: "100%" }}
          >
            <tbody>
              <tr>
                <td style={spacing}>
                  <div
                    style={{
                      color: "#666",
                      fontStyle: "italic",
                      ...customStyles,
                    }}
                    className={block.cssClassName || ""}
                  >
                    Empty list
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        );
      }

      return (
        <table
          role="presentation"
          cellSpacing={0}
          cellPadding={0}
          style={{ width: "100%" }}
        >
          <tbody>
            <tr>
              <td style={spacing}>
                <ul
                  style={{
                    margin: "0",
                    paddingLeft: "40px",
                    listStyleType: "disc",
                    ...customStyles,
                  }}
                  className={block.cssClassName || ""}
                  data-block-type="list"
                >
                  {items.map((item: string, index: number) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </td>
            </tr>
          </tbody>
        </table>
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

      // CRITICAL FIX: Strip inline styles and rely on CSS injection + wrapper styling
      const processedContent = useMemo(() => {
        return stripInlineStyles(formattedContent);
      }, [formattedContent]);

      // FIXED: Apply CSS class styles as inline styles with proper precedence
      const elementStyles = useMemo(() => {
        // Base container styles
        const baseStyles: React.CSSProperties = {
          // Fallback color if no CSS class or formatting provides it
          color: containerConfig.textColor,
        };

        // Include text alignment from block formatting (only if not defined in CSS class)
        const blockFormatting = textBlock.formatting || {};
        const formattingStyles: React.CSSProperties = {};

        // Only apply block formatting if the CSS class doesn't already define these properties
        if (!customStyles.textAlign && blockFormatting.textAlign) {
          formattingStyles.textAlign = blockFormatting.textAlign as any;
        }
        if (!customStyles.fontSize && blockFormatting.fontSize) {
          formattingStyles.fontSize = blockFormatting.fontSize;
        }
        if (!customStyles.fontWeight && blockFormatting.fontWeight) {
          formattingStyles.fontWeight = blockFormatting.fontWeight;
        }
        if (!customStyles.color && blockFormatting.color) {
          formattingStyles.color = blockFormatting.color;
        }
        if (!customStyles.lineHeight && blockFormatting.lineHeight) {
          formattingStyles.lineHeight = blockFormatting.lineHeight;
        }

        // CRITICAL: CSS classes take PRECEDENCE over block formatting
        // This ensures CSS classes are never overridden by block formatting
        const finalStyles = {
          ...baseStyles, // Base fallbacks
          ...formattingStyles, // Block formatting (only for properties not in CSS class)
          ...customStyles, // CSS class styles - HIGHEST PRIORITY
          margin: "0", // Remove margins, use table cell padding instead
        };

        return finalStyles;
      }, [
        customStyles,
        textBlock.formatting,
        containerConfig.textColor,
        element,
        textBlock.cssClassName,
      ]);

      const spacing = getBlockSpacing("12px");

      return (
        <table
          role="presentation"
          cellSpacing={0}
          cellPadding={0}
          style={{ width: "100%" }}
        >
          <tbody>
            <tr>
              <td style={spacing}>
                {textBlock.cssClassName ? (
                  // If has CSS class, use wrapper structure
                  <div
                    className=""
                    data-block-type="text"
                    data-block-id={textBlock.id}
                  >
                    <div
                      className={`${textBlock.cssClassName} whitespace-pre-wrap`}
                      style={elementStyles}
                      data-element={element}
                      dangerouslySetInnerHTML={{ __html: processedContent }}
                      data-css-class={textBlock.cssClassName}
                    />
                  </div>
                ) : (
                  // If no CSS class, use the proper HTML element (h1, h2, p, etc.)
                  React.createElement(element, {
                    style: elementStyles,
                    className: "whitespace-pre-wrap",
                    "data-block-type": "text",
                    "data-element": element,
                    "data-block-id": textBlock.id,
                    dangerouslySetInnerHTML: { __html: processedContent },
                  })
                )}
              </td>
            </tr>
          </tbody>
        </table>
      );
    }

    case "image": {
      const imageBlock = block as ImageBlock;
      const spacing = getBlockSpacing("12px");

      if (!imageBlock.imageUrl) {
        return (
          <table
            role="presentation"
            cellSpacing={0}
            cellPadding={0}
            style={{ width: "100%" }}
          >
            <tbody>
              <tr>
                <td style={spacing}>
                  <div
                    style={{
                      textAlign: "center",
                      padding: "20px",
                      color: "#666",
                      border: "2px dashed #ccc",
                    }}
                  >
                    <div style={{ fontSize: "24px", marginBottom: "8px" }}>
                      🖼️
                    </div>
                    <p style={{ margin: "0" }}>Image will appear here</p>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
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

      const alignment = imageBlock.alignment || "center";
      const alignStyle =
        alignment === "center"
          ? "center"
          : alignment === "right"
            ? "right"
            : "left";
      const linkUrl = imageBlock.linkUrl?.trim();
      const hasLink = linkUrl && linkUrl.length > 0;

      // Apply CSS class styles as inline styles for images to match export behavior
      const imageStyles = {
        display: "block",
        maxWidth: "100%",
        height: "auto",
        border: "0",
        outline: "none",
        textDecoration: "none",
        ...customStyles, // CSS class styles applied as inline styles
      };

      const imageTag = (
        <img
          src={imageBlock.imageUrl}
          alt={imageBlock.altText || "Email image"}
          style={imageStyles}
          className={imageBlock.cssClassName || ""}
          data-block-type="image"
        />
      );

      const wrappedImage = hasLink ? (
        <a
          href={linkUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "inherit", textDecoration: "none" }}
        >
          {imageTag}
        </a>
      ) : (
        imageTag
      );

      const imageContent = (
        <div style={{ textAlign: alignStyle }}>
          {wrappedImage}
          {imageBlock.caption && (
            <p
              style={{
                textAlign: alignStyle,
                fontSize: "14px",
                color: "#666",
                margin: "8px 0 0 0",
                fontStyle: "italic",
              }}
            >
              {imageBlock.caption}
            </p>
          )}
        </div>
      );

      return (
        <table
          role="presentation"
          cellSpacing={0}
          cellPadding={0}
          style={{ width: "100%" }}
        >
          <tbody>
            <tr>
              <td style={spacing}>{imageContent}</td>
            </tr>
          </tbody>
        </table>
      );
    }

    case "video": {
      const videoBlock = block as any;
      const videoUrl = videoBlock.url || videoBlock.videoUrl;
      const videoTitle = videoBlock.title || videoBlock.videoTitle || "Video";
      const spacing = getBlockSpacing("12px");

      if (!videoUrl) {
        return (
          <table
            role="presentation"
            cellSpacing={0}
            cellPadding={0}
            style={{ width: "100%" }}
          >
            <tbody>
              <tr>
                <td style={spacing}>
                  <div
                    style={{
                      textAlign: "center",
                      padding: "20px",
                      color: "#666",
                      border: "2px dashed #ccc",
                    }}
                  >
                    <div style={{ fontSize: "24px", marginBottom: "8px" }}>
                      🎥
                    </div>
                    <p style={{ margin: "0" }}>Video will appear here</p>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        );
      }

      const videoContent = (
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              backgroundColor: "#f0f0f0",
              padding: "40px",
              borderRadius: "8px",
              border: "2px solid #ddd",
            }}
          >
            <div style={{ fontSize: "24px", marginBottom: "12px" }}>🎥</div>
            <h3 style={{ margin: "0 0 8px 0", fontWeight: "bold" }}>
              {videoTitle}
            </h3>
            <p
              style={{ margin: "0 0 16px 0", fontSize: "14px", color: "#666" }}
            >
              Click to watch video
            </p>
            <a
              href={videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                backgroundColor: containerConfig.linkColor,
                color: "#ffffff",
                padding: "8px 16px",
                borderRadius: "4px",
                textDecoration: "none",
                display: "inline-block",
                fontWeight: "500",
                ...customStyles,
              }}
            >
              Watch Video
            </a>
          </div>
        </div>
      );

      return (
        <table
          role="presentation"
          cellSpacing={0}
          cellPadding={0}
          style={{ width: "100%" }}
        >
          <tbody>
            <tr>
              <td style={spacing}>{videoContent}</td>
            </tr>
          </tbody>
        </table>
      );
    }

    case "divider": {
      const dividerBlock = block as any;
      const thickness = dividerBlock.thickness || "1px";
      const color = dividerBlock.color || "#e1e4e8";
      const spacing = getBlockSpacing("24px");

      return (
        <table
          role="presentation"
          cellSpacing={0}
          cellPadding={0}
          style={{ width: "100%" }}
        >
          <tbody>
            <tr>
              <td style={spacing}>
                <hr
                  style={{
                    border: "none",
                    borderTop: `${thickness} solid ${color}`,
                    height: "1px",
                    fontSize: "1px",
                    lineHeight: "1px",
                    margin: "0",
                    ...customStyles,
                  }}
                  className={block.cssClassName || ""}
                />
              </td>
            </tr>
          </tbody>
        </table>
      );
    }

    case "button": {
      const buttonBlock = block as ButtonBlock;
      const buttonText = buttonBlock.text || "Button";
      const buttonUrl = buttonBlock.url || "#";

      const buttonContent = (
        <div style={{ textAlign: "center" }}>
          <a
            href={buttonUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              backgroundColor:
                buttonBlock.backgroundColor || containerConfig.linkColor,
              color: buttonBlock.textColor || "#ffffff",
              padding: buttonBlock.padding || "12px 24px",
              borderRadius: buttonBlock.borderRadius || "4px",
              textDecoration: "none",
              display: "inline-block",
              fontWeight: "500",
              fontSize: "14px",
              ...customStyles,
            }}
            className={buttonBlock.cssClassName || ""}
          >
            {buttonText}
          </a>
        </div>
      );

      return (
        <table
          role="presentation"
          cellSpacing={0}
          cellPadding={0}
          style={{ width: "100%" }}
        >
          <tbody>
            <tr>
              <td style={getBlockSpacing("24px")}>{buttonContent}</td>
            </tr>
          </tbody>
        </table>
      );
    }

    case "spacer": {
      const spacerBlock = block as any;
      const height = spacerBlock.height || "20px";

      const spacerContent = (
        <div
          style={{
            height,
            fontSize: "1px",
            lineHeight: "1px",
            ...customStyles,
          }}
          className={block.cssClassName || ""}
        >
          &nbsp;
        </div>
      );

      return (
        <table
          role="presentation"
          cellSpacing={0}
          cellPadding={0}
          style={{ width: "100%" }}
        >
          <tbody>
            <tr>
              <td style={getBlockSpacing("0px")}>{spacerContent}</td>
            </tr>
          </tbody>
        </table>
      );
    }

    default: {
      const defaultContent = (
        <div style={{ textAlign: "center", padding: "16px", color: "#666" }}>
          <p style={{ margin: "0" }}>Unsupported block type: {block.type}</p>
        </div>
      );
      return (
        <table
          role="presentation"
          cellSpacing={0}
          cellPadding={0}
          style={{ width: "100%" }}
        >
          <tbody>
            <tr>
              <td style={getBlockSpacing("12px")}>{defaultContent}</td>
            </tr>
          </tbody>
        </table>
      );
    }
  }
};
