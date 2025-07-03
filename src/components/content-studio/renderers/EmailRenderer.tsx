import React from "react";
import {
  ContentBlock,
  TextBlock,
  ImageBlock,
  DividerBlock,
  FrontmatterBlock,
} from "../types";

interface EmailRendererProps {
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
}

/**
 * EmailRenderer - Generates HTML email templates using the Motive Archive format
 *
 * This component takes content blocks and converts them into email-compatible HTML
 * with inline styles for maximum email client compatibility.
 */
export function EmailRenderer({
  blocks,
  compositionName,
  frontmatter,
}: EmailRendererProps) {
  // Email template styles (inline for compatibility)
  const emailStyles = {
    reset: `*{margin:0;padding:0;box-sizing:border-box;}`,
    body: `
      font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Oxygen,Ubuntu,Cantarell,sans-serif;
      line-height:1.6;
      color:#333;
      background:#f5f5f5;
      padding:20px;
    `,
    container: `
      max-width:600px;
      margin:0 auto;
      background:#fff;
      border-radius:8px;
      box-shadow:0 4px 6px rgba(0,0,0,.1);
      overflow:hidden;
    `,
    content: `padding:10px 30px;`,
    image: `max-width:100%!important;width:100%!important;height:auto!important;display:block!important;`,
    header: `margin:0;padding:0;text-align:center;`,
    h1: `font-size:36px;color:#2c2c2c;font-weight:600;margin:0 0 30px;line-height:1.2;`,
    h2: `font-size:30px;font-weight:700;color:#1a1a1a;margin:0;text-transform:uppercase;`,
    h3: `font-size:24px;font-weight:700;color:#1a1a1a;margin:0 0 15px;`,
    p: `font-size:16px;color:#666;margin:0 0 20px;line-height:1.6;`,
    quote: `
      background:#f8f9fa;
      border-left:4px solid #1a224e;
      padding:25px 30px;
      margin:40px 0;
      font-style:italic;
      color:#444;
      font-size:24px;
      line-height:1.4;
    `,
    cta: `
      background:#1a224e;
      color:#fff;
      padding:50px 30px;
      text-align:center;
      margin:50px 0;
    `,
    ctaButton: `
      background:#1a224e;
      color:#fff;
      padding:20px 50px;
      text-decoration:none;
      font-weight:700;
      font-size:16px;
      border-radius:30px;
      display:inline-block;
    `,
    footer: `text-align:center;padding:30px;color:#999;font-size:14px;`,
  };

  // Helper function to convert blocks to email HTML
  const renderEmailBlock = (block: ContentBlock): string => {
    switch (block.type) {
      case "text": {
        const textBlock = block as TextBlock;
        const content = textBlock.content || "";
        const element = textBlock.element || "p";

        // Apply email-specific styling based on element type
        let style = "";
        switch (element) {
          case "h1":
            style = emailStyles.h1;
            break;
          case "h2":
            style = emailStyles.h2;
            break;
          case "h3":
            style = emailStyles.h3;
            break;
          case "p":
          default:
            style = emailStyles.p;
            break;
        }

        // Process rich formatting
        let processedContent = content;
        if (textBlock.richFormatting?.formattedContent) {
          processedContent = textBlock.richFormatting.formattedContent
            .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
            .replace(
              /\[([^\]]+)\]\(([^)]+)\)/g,
              '<a href="$2" style="color:#1a224e;text-decoration:underline;">$1</a>'
            )
            .replace(/\n/g, "<br>");
        }

        return `<${element} style="${style}">${processedContent}</${element}>`;
      }

      case "image": {
        const imageBlock = block as ImageBlock;
        if (!imageBlock.imageUrl) return "";

        const caption = imageBlock.caption
          ? `<p style="text-align:center;font-size:14px;color:#666;margin:10px 0 0;">${imageBlock.caption}</p>`
          : "";

        return `
          <div style="margin:20px 0;">
            <img src="${imageBlock.imageUrl}" 
                 alt="${imageBlock.altText || ""}" 
                 style="${emailStyles.image}" />
            ${caption}
          </div>
        `;
      }

      case "divider": {
        return `<hr style="border:none;border-top:1px solid #ddd;margin:30px 0;">`;
      }

      case "frontmatter": {
        // Frontmatter doesn't render directly in email body
        return "";
      }

      default:
        return "";
    }
  };

  // Filter out frontmatter blocks for content rendering
  const contentBlocks = blocks.filter((block) => block.type !== "frontmatter");

  // Generate the complete email HTML
  const generateEmailHTML = (): string => {
    const blockHTML = contentBlocks.map(renderEmailBlock).join("\n");

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${frontmatter?.title || compositionName || "Motive Archive Email"}</title>
  <style>
    ${emailStyles.reset}
    body{${emailStyles.body}}
    .email-container{${emailStyles.container}}
    .content{${emailStyles.content}}
    .header{${emailStyles.header}}
    img{${emailStyles.image}}
    .cta-section{${emailStyles.cta}}
    .cta-button{${emailStyles.ctaButton}}
    .footer{${emailStyles.footer}}

    /* Dark mode support */
    @media (prefers-color-scheme:dark){
      .email-container{background:#1a1a1a!important;color:#fff!important;}
      .content{color:#fff!important;}
    }

    /* Mobile responsive */
    @media (max-width:600px){
      body{padding:0!important;}
      .email-container{width:100%!important;border-radius:0!important;}
      .content{padding:20px!important;}
      h1{font-size:28px!important;}
      h2{font-size:24px!important;}
      p{font-size:14px!important;}
    }
  </style>
</head>
<body>
  <div class="email-container">
    <!-- Header -->
    <div class="header">
      <img src="https://imagedelivery.net/veo1agD2ekS5yYAVWyZXBA/ca378627-6b5c-4c8c-088d-5a0bdb76ae00/public" alt="Motive Archive" class="logo">
    </div>

    <!-- Content -->
    <div class="content">
      ${blockHTML}
      
      ${
        frontmatter?.callToAction
          ? `
      <!-- CTA Section -->
      <div class="cta-section">
        <h2 style="${emailStyles.h2}color:#fff;">${frontmatter.callToAction}</h2>
        ${
          frontmatter.callToActionUrl
            ? `
        <a href="${frontmatter.callToActionUrl}" class="cta-button" style="${emailStyles.ctaButton}">
          GET STARTED
        </a>
        `
            : ""
        }
      </div>
      `
          : ""
      }
    </div>

    <!-- Footer -->
    <div class="footer">
      <p>The Collector's Resource</p>
      <p>© 2024 Motive Archive. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `.trim();
  };

  // Return both the HTML string and a preview component
  return {
    html: generateEmailHTML(),
    preview: (
      <div className="email-preview bg-gray-100 p-4 rounded-lg">
        <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Email content rendered as React components for preview */}
          <div className="p-6 space-y-4">
            {contentBlocks.map((block, idx) => (
              <div
                key={block.id || idx}
                dangerouslySetInnerHTML={{
                  __html: renderEmailBlock(block),
                }}
              />
            ))}
          </div>
        </div>
      </div>
    ),
  };
}

// Export email generation utility
export function generateEmailHTML(
  blocks: ContentBlock[],
  compositionName?: string,
  frontmatter?: any
): string {
  const renderer = EmailRenderer({ blocks, compositionName, frontmatter });
  return renderer.html;
}
