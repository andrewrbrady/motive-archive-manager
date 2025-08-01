import { NextRequest, NextResponse } from "next/server";
import { verifyAuthMiddleware } from "@/lib/firebase-auth-middleware";
import {
  ContentBlock,
  TextBlock,
  ImageBlock,
  DividerBlock,
  HTMLBlock,
} from "@/components/content-studio/types";
import { dbConnect } from "@/lib/mongodb";
import { Stylesheet } from "@/models/Stylesheet";

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const authResult = await verifyAuthMiddleware(request);
    if (authResult) {
      return authResult;
    }

    // Parse request body
    const body = await request.json();
    const {
      blocks,
      template,
      metadata,
      format = "web",
      selectedStylesheetId,
      emailPlatform = "generic",
      includeCSS = true,
    } = body;

    // Validate required fields
    if (!blocks || !Array.isArray(blocks)) {
      return NextResponse.json(
        { error: "Missing or invalid blocks data" },
        { status: 400 }
      );
    }

    // Fetch stylesheet CSS if provided and user wants CSS included
    let stylesheetCSS = null;
    if (selectedStylesheetId && includeCSS) {
      try {
        stylesheetCSS = await fetchStylesheetCSS(selectedStylesheetId);
      } catch (error) {
        console.warn("Failed to fetch stylesheet CSS:", error);
        // Continue without stylesheet rather than failing the entire export
      }
    }

    // Generate HTML from blocks based on format
    const html =
      format === "email"
        ? generateEmailHTMLFromBlocks(
            blocks,
            template,
            metadata,
            stylesheetCSS,
            emailPlatform,
            includeCSS
          )
        : generateHTMLFromBlocks(blocks, template, metadata, stylesheetCSS);

    return NextResponse.json({
      success: true,
      html,
    });
  } catch (error) {
    console.error("Error exporting HTML:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Fetch stylesheet CSS content by ID
 */
async function fetchStylesheetCSS(
  stylesheetId: string
): Promise<string | null> {
  try {
    await dbConnect();

    // Find stylesheet by id field (not MongoDB _id)
    const stylesheet = await Stylesheet.findOne({ id: stylesheetId });

    if (!stylesheet) {
      console.warn(`Stylesheet with ID ${stylesheetId} not found`);
      return null;
    }

    return stylesheet.cssContent || null;
  } catch (error) {
    console.error("Error fetching stylesheet:", error);
    return null;
  }
}

/**
 * Process CSS for email compatibility (SIMPLIFIED)
 * Removes only the most problematic patterns while preserving legitimate CSS
 */
function processStylesheetForEmail(cssContent: string): string {
  if (!cssContent) return "";

  // Remove .content-studio-preview scoping
  let processedCSS = cssContent.replace(/\.content-studio-preview\s+/g, "");

  // Remove only specific properties that don't work in email (safer approach)
  processedCSS = processedCSS.replace(/^\s*transform\s*:[^;]+;/gm, "");
  processedCSS = processedCSS.replace(/^\s*animation\s*:[^;]+;/gm, "");
  processedCSS = processedCSS.replace(/^\s*transition\s*:[^;]+;/gm, "");

  // Clean up excessive whitespace left by removals
  processedCSS = processedCSS.replace(/\n\s*\n\s*\n/g, "\n\n");
  processedCSS = processedCSS.replace(/^\s*\n/gm, "");
  processedCSS = processedCSS.trim();

  return processedCSS;
}

/**
 * Process CSS specifically for SendGrid (SIMPLIFIED)
 * Minimal processing to avoid corruption while removing only truly problematic patterns
 */
function processEmailCSSForSendGrid(cssContent: string): string {
  if (!cssContent) return "";

  // Use the basic email processing first
  let processedCSS = processStylesheetForEmail(cssContent);

  // Remove only the most dangerous patterns with very specific regex
  // Use anchored patterns to avoid matching CSS properties
  processedCSS = processedCSS.replace(/^@import\s+[^;]+;/gm, ""); // Remove @import statements
  processedCSS = processedCSS.replace(/^@font-face\s*\{[^}]*\}/gm, ""); // Remove @font-face blocks

  // Remove ID selectors only when they're at the start of a line (not hex colors)
  processedCSS = processedCSS.replace(
    /^#[a-zA-Z][a-zA-Z0-9_-]*\s*\{[^}]*\}/gm,
    ""
  );

  // Remove attribute selectors only when they're complete selector blocks
  processedCSS = processedCSS.replace(
    /^\[[\w-]+[\^$*~|]?=?[^]]*\]\s*\{[^}]*\}/gm,
    ""
  );

  // Clean up excessive whitespace and empty lines left by removals
  processedCSS = processedCSS.replace(/\n\s*\n\s*\n/g, "\n\n"); // Replace multiple newlines with double newlines
  processedCSS = processedCSS.replace(/^\s*\n/gm, ""); // Remove empty lines at start
  processedCSS = processedCSS.trim(); // Remove leading/trailing whitespace

  return processedCSS;
}

/**
 * Extract CSS class definitions from stylesheet content
 * Returns a map of class names to their CSS properties
 */
// Removed extractCSSClassDefinitions - no longer needed with CSS class approach

/**
 * Generate platform-specific email HTML from content blocks
 * Supports Mailchimp, SendGrid, and generic email platforms
 *
 * FLUID-HYBRID PATTERN SUPPORT:
 * - Image blocks with email.isFullWidth=true will use the fluid-hybrid pattern
 * - Creates edge-to-edge headers that work in all email clients
 * - Outlook gets centered fixed-width version, modern clients get full-width
 * - Automatically handles table structure breaks and restoration
 */
function generateEmailHTMLFromBlocks(
  blocks: ContentBlock[],
  template: any,
  metadata: any,
  stylesheetCSS: string | null = null,
  emailPlatform: string = "generic",
  includeCSS: boolean = true
): string {
  const title = metadata?.name || "Untitled Email Composition";
  const exportedAt = metadata?.exportedAt || new Date().toISOString();
  const previewText = metadata?.previewText || "";

  // Sort blocks by order
  const sortedBlocks = [...blocks].sort((a, b) => a.order - b.order);

  // Separate full-width header images from regular content
  const { headerImages, contentBlocks } = separateHeaderImages(sortedBlocks);

  // Generate HTML for header images and content blocks
  const headerHTML = headerImages
    .map((block) => generateFullWidthImageHTML(block))
    .join("\n");
  const contentHTML = generateEmailBlocksHTML(contentBlocks);

  // Generate dynamic CSS for responsive hero images
  const dynamicCSS = generateDynamicImageCSS([
    ...headerImages,
    ...contentBlocks,
  ]);

  // Process stylesheet CSS for email compatibility based on platform
  const processedStylesheetCSS = stylesheetCSS
    ? emailPlatform === "sendgrid"
      ? processEmailCSSForSendGrid(stylesheetCSS)
      : processStylesheetForEmail(stylesheetCSS)
    : "";

  // Generate platform-specific HTML
  switch (emailPlatform) {
    case "sendgrid":
      return generateSendGridHTML(
        headerImages,
        contentBlocks,
        title,
        processedStylesheetCSS,
        dynamicCSS,
        includeCSS
      );
    case "mailchimp":
      return generateMailchimpHTML(
        headerImages,
        contentBlocks,
        title,
        processedStylesheetCSS,
        dynamicCSS
      );
    default:
      return generateGenericEmailHTML(
        headerImages,
        contentBlocks,
        title,
        processedStylesheetCSS,
        dynamicCSS
      );
  }
}

/**
 * Generate SendGrid-compatible email HTML
 * Uses CSS classes like the working email structure for proper Gmail compatibility
 */
function generateSendGridHTML(
  headerImages: any[],
  contentBlocks: any[],
  title: string,
  processedStylesheetCSS: string,
  dynamicCSS: string,
  includeCSS: boolean = true
): string {
  const headerHTML = headerImages
    .map((block) => generateSendGridImageHTML(block))
    .join("\n");
  const contentHTML = generateSendGridBlocksHTML(contentBlocks);

  // Generate clean div-based structure like the working template
  // Use the stylesheet CSS only if includeCSS is true and CSS has actual content
  const cleanCSS =
    includeCSS && processedStylesheetCSS && processedStylesheetCSS.trim()
      ? processedStylesheetCSS.trim()
      : "";

  // Default email container configuration - header disabled by default to prevent duplicate headers
  const hasHeaderImages = headerImages && headerImages.length > 0;
  const shouldShowContainerHeader = false; // Disable by default to prevent duplicate headers
  const shouldShowAnyHeader = shouldShowContainerHeader || hasHeaderImages;

  // Generate header content
  let headerContent = "";
  if (shouldShowAnyHeader) {
    headerContent = `
    <!-- Header -->
    <div class="header">`;

    // Only show company logo if container header is enabled
    if (shouldShowContainerHeader) {
      headerContent += `
      <img src="https://imagedelivery.net/veo1agD2ekS5yYAVWyZXBA/ca378627-6b5c-4c8c-088d-5a0bdb76ae00/public" alt="Motive Archive" class="logo">`;
    }

    // Always show content header images if they exist
    if (hasHeaderImages) {
      headerContent += `
      ${headerHTML}`;
    }

    headerContent += `
    </div>`;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <style>
    ${cleanCSS || ""}
  </style>
</head>
<body>
  <div class="email-container">${headerContent}

    <!-- Content -->
    <div class="content">
      ${contentHTML}
    </div>
  </div>
</body>
</html>`;
}

/**
 * Generate Mailchimp-compatible email HTML
 * Full table-based structure for maximum compatibility
 */
function generateMailchimpHTML(
  headerImages: any[],
  contentBlocks: any[],
  title: string,
  processedStylesheetCSS: string,
  dynamicCSS: string
): string {
  const headerHTML = headerImages
    .map((block) => generateFullWidthImageHTML(block))
    .join("\n");
  const contentHTML = generateEmailBlocksHTML(contentBlocks);
  const previewText = ""; // Preview text for email
  const exportedAt = new Date().toISOString();

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="x-apple-disable-message-reformatting">
    <meta name="color-scheme" content="light dark">
    <meta name="supported-color-schemes" content="light dark">
    <title>${escapeHtml(title)}</title>
    <!--[if mso]>
    <noscript>
        <xml>
            <o:OfficeDocumentSettings>
                <o:PixelsPerInch>96</o:PixelsPerInch>
            </o:OfficeDocumentSettings>
        </xml>
    </noscript>
    <![endif]-->
    <style type="text/css">
        /* Reset and base styles */
        body, table, td, p, a, li, blockquote { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
        table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
        img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
        
        /* Media queries for responsive design */
        @media screen and (max-width: 600px) {
            .mobile-stack { display: block !important; width: 100% !important; }
            .mobile-center { text-align: center !important; }
            .mobile-padding { padding: 20px !important; }
            
            /* Force proper heading sizes on mobile - Gmail override */
            h1, h1 * { font-size: 24px !important; line-height: 30px !important; }
            h2, h2 * { font-size: 28px !important; line-height: 34px !important; }
            h3, h3 * { font-size: 18px !important; line-height: 24px !important; }
            p, p * { font-size: 16px !important; line-height: 24px !important; }
            
            /* Gmail-specific heading overrides with higher specificity */
            td h1 { font-size: 24px !important; line-height: 30px !important; }
            td h2 { font-size: 28px !important; line-height: 34px !important; }
            td h3 { font-size: 18px !important; line-height: 24px !important; }
            
            /* Force font weight to ensure visibility */
            h1, h2, h3 { font-weight: bold !important; }
            
            /* Additional Gmail-specific overrides */
            .mobile-font-size { font-size: 28px !important; line-height: 34px !important; }
            
            /* Ensure tables scale on mobile */
            table[role="presentation"] { width: 100% !important; }
            
            /* Force images to scale */
            img { max-width: 100% !important; width: auto !important; height: auto !important; }
            
            /* Mobile-specific hero image sizing - natural height with side cropping */
            .responsive-hero-image { 
                height: auto !important; 
                min-height: 100px !important; 
                object-fit: cover !important; 
                object-position: center !important;
            }
        }
        
        ${dynamicCSS}
        
        /* Custom stylesheet CSS */
        ${processedStylesheetCSS}
        
        /* Dark mode styles */
        @media (prefers-color-scheme: dark) {
            .dark-bg { background-color: #1a1a1a !important; }
            .dark-text { color: #ffffff !important; }
            .dark-link { color: #4a9eff !important; }
        }
    </style>
</head>
<body style="margin: 0; padding: 0; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; background-color: #f4f4f4;">
    ${previewText ? `<div style="display: none; max-height: 0; overflow: hidden;">${escapeHtml(previewText)}</div>` : ""}
    
    <!-- Full-width header images (if any) -->
    ${headerHTML}
    
    <!-- Main container table -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f4f4f4;">
        <tr>
            <td align="center" style="padding: ${headerHTML.trim() ? "0" : "20px"} 0 20px 0;">
                <!-- Email content table -->
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="background-color: #ffffff; margin: 0 auto; max-width: 600px;" class="dark-bg">
                    <tr>
                        <td style="padding: ${headerHTML.trim() ? "30px 30px 40px 30px" : "40px 30px"};" class="mobile-padding">
                            ${contentHTML}
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;
}

/**
 * Generate generic email HTML (fallback)
 * Uses the original Mailchimp structure as a base
 */
function generateGenericEmailHTML(
  headerImages: any[],
  contentBlocks: any[],
  title: string,
  processedStylesheetCSS: string,
  dynamicCSS: string
): string {
  const headerHTML = headerImages
    .map((block) => generateFullWidthImageHTML(block))
    .join("\n");
  const contentHTML = generateEmailBlocksHTML(contentBlocks);

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(title)}</title>
    <style>
        /* Generic email styles */
        body { margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4; }
        table { border-collapse: collapse; }
        img { max-width: 100%; height: auto; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
        .content { padding: 20px; }
        
        ${processedStylesheetCSS}
        ${dynamicCSS}
    </style>
</head>
<body>
    ${headerHTML}
    <div class="container">
        <div class="content">
            ${contentHTML}
        </div>
    </div>
</body>
</html>`;
}

/**
 * Generate SendGrid-specific image HTML
 * Simplified structure for SendGrid compatibility
 */
function generateSendGridImageHTML(block: any): string {
  const altText = block.altText || "";
  const linkUrl = block.linkUrl?.trim();
  const hasLink = linkUrl && linkUrl.length > 0;

  // Use CSS classes for styling like the working email
  const finalImageClasses = generateEmailClasses("", block);

  const imageTag = `<img src="${escapeHtml(block.imageUrl)}" alt="${escapeHtml(altText)}"${finalImageClasses ? ` class="${finalImageClasses}"` : ""}>`;

  const wrappedImage = hasLink
    ? `<a href="${escapeHtml(linkUrl)}" target="_blank">${imageTag}</a>`
    : imageTag;

  return `${wrappedImage}
    ${block.caption ? `<p style="text-align:center;font-size:14px;color:#666;margin:10px 0 0;">${escapeHtml(block.caption)}</p>` : ""}`;
}

// Removed generateSendGridBasicImageHTML - replaced with CSS class-based approach

/**
 * Generate SendGrid-specific blocks HTML with CSS classes
 * Clean structure that matches the working email format
 */
function generateSendGridBlocksHTML(blocks: any[]): string {
  return blocks
    .map((block) => {
      switch (block.type) {
        case "html": {
          const htmlBlock = block as HTMLBlock;
          const content = htmlBlock.content || "";
          const customClasses = generateEmailClasses("", block);

          // For SendGrid, include HTML content directly with optional CSS classes
          return `<div${customClasses ? ` class="${customClasses}"` : ""}>${content}</div>`;
        }
        case "text": {
          const textBlock = block as TextBlock;
          const element = textBlock.element || "p";
          const customClasses = generateEmailClasses("", block);

          // Process rich formatting if available, otherwise use raw content
          let processedContent = textBlock.content || "";
          if (textBlock.richFormatting?.formattedContent) {
            processedContent = textBlock.richFormatting.formattedContent;
          }

          // Apply basic formatting - convert markdown to HTML
          processedContent = processedContent
            .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
            .replace(
              /\[([^\]]+)\]\(([^)]+)\)/g,
              '<a href="$2" style="color: #0066cc; text-decoration: underline;" class="dark-link">$1</a>'
            )
            .replace(/\n/g, "<br>");

          // Don't escape HTML if it contains formatting tags, otherwise escape it
          const hasHtmlTags = /<[^>]+>/.test(processedContent);
          const finalContent = hasHtmlTags
            ? processedContent
            : escapeHtml(processedContent);

          return `<${element}${customClasses ? ` class="${customClasses}"` : ""}>${finalContent}</${element}>`;
        }
        case "list": {
          const listBlock = block as any;
          const items = listBlock.items || [];
          const customClasses = generateEmailClasses("", block);

          if (items.length === 0) {
            return `<div${customClasses ? ` class="${customClasses}"` : ""} style="color: #666; font-style: italic;">Empty list</div>`;
          }

          const listItems = items
            .map(
              (item: string) =>
                `<li style="margin-bottom: 8px;">${escapeHtml(item)}</li>`
            )
            .join("");

          return `<ul${customClasses ? ` class="${customClasses}"` : ""} style="margin: 16px 0; padding-left: 20px; list-style-type: disc;">${listItems}</ul>`;
        }
        case "image":
          return generateSendGridImageHTML(block);
        case "divider": {
          const dividerClasses = generateEmailClasses("", block);
          return `<hr${dividerClasses ? ` class="${dividerClasses}"` : ""} style="border:none;border-top:1px solid #ddd;margin:30px 0;">`;
        }
        case "video": {
          const videoClasses = generateEmailClasses("", block);
          return `<div${videoClasses ? ` class="${videoClasses}"` : ""} style="margin:20px 0;">
            <p><strong>Video:</strong> ${escapeHtml(block.title || "Video Content")}</p>
            <p><a href="${escapeHtml(block.videoUrl)}" target="_blank" style="color: #0066cc;">Watch Video</a></p>
          </div>`;
        }
        default: {
          const defaultClasses = generateEmailClasses("", block);
          return `<div${defaultClasses ? ` class="${defaultClasses}"` : ""}>${escapeHtml(block.content || "")}</div>`;
        }
      }
    })
    .join("\n");
}

// Removed generateSendGridBasicBlocksHTML - replaced with CSS class-based approach

/**
 * Separate full-width header images from regular content blocks
 * Header images are those at the beginning that are full-width
 */
function separateHeaderImages(blocks: ContentBlock[]): {
  headerImages: ImageBlock[];
  contentBlocks: ContentBlock[];
} {
  const headerImages: ImageBlock[] = [];
  const contentBlocks: ContentBlock[] = [];

  let foundNonHeaderBlock = false;

  for (const block of blocks) {
    const isFullWidthImage =
      block.type === "image" && (block as ImageBlock).email?.isFullWidth;

    if (isFullWidthImage && !foundNonHeaderBlock) {
      // This is a header image at the beginning
      headerImages.push(block as ImageBlock);
    } else {
      // This is regular content (or a full-width image not at the beginning)
      foundNonHeaderBlock = true;
      contentBlocks.push(block);
    }
  }

  return { headerImages, contentBlocks };
}

/**
 * Generate standalone full-width image HTML for email headers
 */
function generateFullWidthImageHTML(block: ImageBlock): string {
  const altText = block.altText || "";
  const outlookWidth = block.email?.outlookWidth || "600";
  const maxWidth = block.email?.maxWidth || "1200";
  const backgroundColor = block.email?.backgroundColor || "#111111";
  const minHeight = block.email?.minHeight || "300";
  const useCenterCrop = block.email?.useCenterCrop || false;

  const linkUrl = block.linkUrl?.trim();
  const linkTarget = block.linkTarget || "_blank";
  const hasLink = linkUrl && linkUrl.length > 0;

  // If center crop is enabled, use background-image approach for modern clients
  if (useCenterCrop) {
    const responsiveImageCell = `
            <!--[if !mso]><!-->
            <td align="center" style="padding: 0;">
                <img src="${escapeHtml(block.imageUrl)}" 
                     alt="${escapeHtml(altText)}"
                     width="100%"
                     class="responsive-hero-image responsive-hero-${block.id}"
                     style="display: block; width: 100%; max-width: ${maxWidth}px; height: auto; border: 0; outline: none; text-decoration: none; margin: 0; padding: 0;">
            </td>
            <!--<![endif]-->`;

    const outlookFallbackCell = `
            <!--[if (gte mso 9)|(IE)]>
            <td align="center">
                <img src="${escapeHtml(block.imageUrl)}" 
                     width="${outlookWidth}"
                     style="display:block;width:100%;max-width:${outlookWidth}px;height:auto;border:0;outline:none;text-decoration:none;margin:0 auto;padding:0;" 
                     alt="${escapeHtml(altText)}">
            </td>
            <![endif]-->`;

    const content = hasLink
      ? `
            ${responsiveImageCell}
            ${outlookFallbackCell}`
      : `${responsiveImageCell}${outlookFallbackCell}`;

    const wrappedContent = hasLink
      ? `
            <a href="${escapeHtml(linkUrl)}" target="${linkTarget}" style="color: inherit; text-decoration: none; display: block;">
                ${content}
            </a>`
      : content;

    return `<!-- FULL-WIDTH EMAIL HEADER (CENTER CROP) -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="min-width:100%;width:100%;">
    <tr>
        <td align="center" bgcolor="${backgroundColor}" style="padding:0;" mc:edit="header_image_${block.id}">
            
            <!--[if (gte mso 9)|(IE)]>
            <table role="presentation" width="${outlookWidth}" align="center" cellpadding="0" cellspacing="0" border="0">
                <tr>
            <![endif]-->
            
            ${wrappedContent}${
              block.caption
                ? `
            <!--[if (gte mso 9)|(IE)]></tr><tr><td align="center" style="padding: 8px 20px 0; font-family: Arial, sans-serif; font-size: 14px; line-height: 20px; color: #666666; font-style: italic;"><![endif]-->
            <!--[if !mso]><!-->
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:${maxWidth}px;">
                <tr>
                    <td align="center" style="padding: 8px 20px 0; font-family: Arial, sans-serif; font-size: 14px; line-height: 20px; color: #666666; font-style: italic;">
                        ${escapeHtml(block.caption)}
                    </td>
                </tr>
            </table>
            <!--<![endif]-->`
                : ""
            }
            
            <!--[if (gte mso 9)|(IE)]></tr></table><![endif]-->
        </td>
    </tr>
</table>`;
  }

  // Original approach for non-center-crop images
  const imageTag = `<img src="${escapeHtml(block.imageUrl)}" 
                 width="${outlookWidth}"
                 style="display:block;width:100%;max-width:${maxWidth}px;height:auto;border:0;outline:none;text-decoration:none;margin:0;padding:0;" 
                 alt="${escapeHtml(altText)}">`;

  const wrappedImage = hasLink
    ? `<a href="${escapeHtml(linkUrl)}" target="${linkTarget}" style="color: inherit; text-decoration: none;">${imageTag}</a>`
    : imageTag;

  return `<!-- FULL-WIDTH EMAIL HEADER -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="min-width:100%;width:100%;">
    <tr>
        <td align="center" bgcolor="${backgroundColor}" style="padding:0;" mc:edit="header_image_${block.id}">
            
            <!--[if (gte mso 9)|(IE)]>
            <table role="presentation" width="${outlookWidth}" align="center" cellpadding="0" cellspacing="0" border="0">
                <tr><td align="center">
            <![endif]-->
            
            <!-- Full-width header image for modern clients -->
            ${wrappedImage}${
              block.caption
                ? `
            <!--[if (gte mso 9)|(IE)]></td></tr><tr><td align="center" style="padding: 8px 20px 0; font-family: Arial, sans-serif; font-size: 14px; line-height: 20px; color: #666666; font-style: italic;"><![endif]-->
            <!--[if !mso]><!-->
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:${maxWidth}px;">
                <tr>
                    <td align="center" style="padding: 8px 20px 0; font-family: Arial, sans-serif; font-size: 14px; line-height: 20px; color: #666666; font-style: italic;">
                        ${escapeHtml(block.caption)}
                    </td>
                </tr>
            </table>
            <!--<![endif]-->`
                : ""
            }
            
            <!--[if (gte mso 9)|(IE)]></td></tr></table><![endif]-->
        </td>
    </tr>
</table>`;
}

/**
 * Generate email HTML for all blocks with smart table management
 * Handles full-width images that break out of the main content table
 */
function generateEmailBlocksHTML(blocks: ContentBlock[]): string {
  const blockHTMLParts = [];
  let needsTableReopen = false;

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    const isImageBlock = block.type === "image";
    const isFullWidthImage =
      isImageBlock && (block as ImageBlock).email?.isFullWidth;

    if (isFullWidthImage && !needsTableReopen) {
      // This full-width image will close the main table
      needsTableReopen = true;
    } else if (!isFullWidthImage && needsTableReopen) {
      // We need to reopen the main table for regular content
      // This is handled in the image block HTML generation
      needsTableReopen = false;
    }

    blockHTMLParts.push(generateEmailBlockHTML(block));
  }

  return blockHTMLParts.join("\n");
}

/**
 * Generate email-compatible HTML for a single block
 */
function generateEmailBlockHTML(block: ContentBlock): string {
  switch (block.type) {
    case "html": {
      const htmlBlock = block as HTMLBlock;
      const content = htmlBlock.content || "";
      const customClasses = generateEmailClasses("", block);

      // For email, we need to be careful with HTML content
      // Wrap it in a table structure for email compatibility
      return `<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 20px;">
        <tr>
            <td mc:edit="html_block_${block.id}">
                <div${customClasses ? ` class="${customClasses}"` : ""}>${content}</div>
            </td>
        </tr>
      </table>`;
    }

    case "text": {
      const textBlock = block as TextBlock;
      const content = textBlock.content || "";

      // Process rich formatting if available
      let processedContent = content;
      if (textBlock.richFormatting?.formattedContent) {
        processedContent = textBlock.richFormatting.formattedContent;
      }

      // Apply basic formatting
      processedContent = processedContent
        .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
        .replace(
          /\[([^\]]+)\]\(([^)]+)\)/g,
          '<a href="$2" style="color: #0066cc; text-decoration: underline;" class="dark-link">$1</a>'
        )
        .replace(/\n/g, "<br>");

      const element = textBlock.element || "p";

      // Email-safe default styles based on element type
      let defaultStyles = "";
      let defaultClasses = "";
      switch (element) {
        case "h1":
          defaultStyles =
            "margin: 0 0 20px 0; font-family: Arial, sans-serif; font-size: 28px; line-height: 34px; font-weight: bold; color: #333333";
          defaultClasses = "dark-text mobile-font-size";
          break;
        case "h2":
          defaultStyles =
            "margin: 0 0 18px 0; font-family: Arial, sans-serif; font-size: 32px; line-height: 38px; font-weight: bold; color: #333333";
          defaultClasses = "dark-text mobile-font-size";
          break;
        case "h3":
          defaultStyles =
            "margin: 0 0 16px 0; font-family: Arial, sans-serif; font-size: 20px; line-height: 26px; font-weight: bold; color: #333333";
          defaultClasses = "dark-text mobile-font-size";
          break;
        default: // p
          defaultStyles =
            "margin: 0 0 16px 0; font-family: Arial, sans-serif; font-size: 16px; line-height: 24px; color: #333333";
          defaultClasses = "dark-text";
      }

      // Generate custom CSS classes for the div wrapper
      const customClasses = generateEmailClasses("", block);

      // Merge default styles with block styles for the text element
      const finalStyles = mergeEmailStyles(defaultStyles, block.styles || {});

      // Don't escape HTML if it contains formatting tags
      const hasHtmlTags = /<[^>]+>/.test(processedContent);
      const finalContent = hasHtmlTags
        ? processedContent
        : escapeHtml(processedContent);

      // If custom classes exist, wrap in div with those classes
      if (customClasses) {
        return `<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 20px;">
          <tr>
              <td mc:edit="text_block_${block.id}">
                  <div class="${customClasses}">
                      <${element} style="${finalStyles}" class="${defaultClasses}">${finalContent}</${element}>
                  </div>
              </td>
          </tr>
      </table>`;
      } else {
        return `<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 20px;">
          <tr>
              <td mc:edit="text_block_${block.id}">
                  <${element} style="${finalStyles}" class="${defaultClasses}">${finalContent}</${element}>
              </td>
          </tr>
      </table>`;
      }
    }

    case "image": {
      const imageBlock = block as ImageBlock;
      const altText = imageBlock.altText || "";
      const alignment = imageBlock.alignment || "center";
      const width = imageBlock.width === "100%" ? "540" : imageBlock.width;

      // Email-specific properties
      const isFullWidth = imageBlock.email?.isFullWidth || false;
      const outlookWidth = imageBlock.email?.outlookWidth || "600";
      const maxWidth = imageBlock.email?.maxWidth || "1200";
      const backgroundColor = imageBlock.email?.backgroundColor || "#111111";

      // If this is a full-width email image, use the fluid-hybrid pattern
      if (isFullWidth) {
        const linkUrl = imageBlock.linkUrl?.trim();
        const linkTarget = imageBlock.linkTarget || "_blank";
        const hasLink = linkUrl && linkUrl.length > 0;
        const minHeight = imageBlock.email?.minHeight || "300";
        const useCenterCrop = imageBlock.email?.useCenterCrop || false;

        let wrappedImage;

        if (useCenterCrop) {
          // Use responsive full-width image with mobile-adaptive height
          const responsiveImageContent = `
            <!--[if !mso]><!-->
            <img src="${escapeHtml(imageBlock.imageUrl)}" 
                 alt="${escapeHtml(altText)}"
                 width="100%"
                 class="responsive-hero-image responsive-hero-${imageBlock.id}"
                 style="display: block; width: 100%; max-width: ${maxWidth}px; height: auto; border: 0; outline: none; text-decoration: none; margin: 0; padding: 0;">
            <!--<![endif]-->
            
            <!--[if (gte mso 9)|(IE)]>
            <img src="${escapeHtml(imageBlock.imageUrl)}" 
                 width="${outlookWidth}"
                 style="display:block;width:100%;max-width:${outlookWidth}px;height:auto;border:0;outline:none;text-decoration:none;margin:0 auto;padding:0;" 
                 alt="${escapeHtml(altText)}">
            <![endif]-->`;

          wrappedImage = hasLink
            ? `<a href="${escapeHtml(linkUrl)}" target="${linkTarget}" style="color: inherit; text-decoration: none; display: block;">${responsiveImageContent}</a>`
            : responsiveImageContent;
        } else {
          // Original image tag approach
          const imageTag = `<img src="${escapeHtml(imageBlock.imageUrl)}" 
                   width="${outlookWidth}"
                   style="display:block;width:100%;max-width:${maxWidth}px;height:auto;border:0;outline:none;text-decoration:none;margin:0;padding:0;" 
                   alt="${escapeHtml(altText)}">`;

          wrappedImage = hasLink
            ? `<a href="${escapeHtml(linkUrl)}" target="${linkTarget}" style="color: inherit; text-decoration: none;">${imageTag}</a>`
            : imageTag;
        }

        return `
    </td>
</tr>
</table>

<!-- FULL-WIDTH IMAGE SECTION (Fluid-Hybrid Pattern) -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="min-width:100%;width:100%;">
    <tr>
        <td align="center" bgcolor="${backgroundColor}" style="padding:0;" mc:edit="fullwidth_image_${block.id}">
            
            <!--[if (gte mso 9)|(IE)]>
            <table role="presentation" width="${outlookWidth}" align="center" cellpadding="0" cellspacing="0" border="0">
                <tr><td align="center">
            <![endif]-->
            
            <!-- Full-width image for modern clients -->
            ${wrappedImage}${
              imageBlock.caption
                ? `
            <!--[if (gte mso 9)|(IE)]></td></tr><tr><td align="center" style="padding: 8px 20px 0; font-family: Arial, sans-serif; font-size: 14px; line-height: 20px; color: #666666; font-style: italic;"><![endif]-->
            <!--[if !mso]><!-->
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:${maxWidth}px;">
                <tr>
                    <td align="center" style="padding: 8px 20px 0; font-family: Arial, sans-serif; font-size: 14px; line-height: 20px; color: #666666; font-style: italic;">
                        ${escapeHtml(imageBlock.caption)}
                    </td>
                </tr>
            </table>
            <!--<![endif]-->`
                : ""
            }
            
            <!--[if (gte mso 9)|(IE)]></td></tr></table><![endif]-->
        </td>
    </tr>
</table>

<!-- Resume main content table -->
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="background-color: #ffffff; margin: 0 auto; max-width: 600px;" class="dark-bg">
    <tr>
        <td style="padding: 40px 30px;" class="mobile-padding">`;
      }

      // Standard image block (non-full-width)
      // Convert percentage width to pixels (assuming 540px max content width)
      let pixelWidth = width;
      if (typeof width === "string" && width.includes("%")) {
        const percentage = parseInt(width.replace("%", ""));
        pixelWidth = Math.round((540 * percentage) / 100).toString();
      }

      const alignStyle =
        alignment === "center"
          ? "center"
          : alignment === "right"
            ? "right"
            : "left";

      const linkUrl = imageBlock.linkUrl?.trim();
      const linkTarget = imageBlock.linkTarget || "_blank";
      const hasLink = linkUrl && linkUrl.length > 0;

      // Default image styles and apply block styles
      const defaultImageStyles =
        "display: block; max-width: 100%; height: auto; border: 0; outline: none; text-decoration: none";
      const finalImageStyles = mergeEmailStyles(
        defaultImageStyles,
        block.styles || {}
      );
      const finalImageClasses = generateEmailClasses("", block);

      const imageTag = `<img src="${escapeHtml(imageBlock.imageUrl)}" 
                     alt="${escapeHtml(altText)}" 
                     width="${pixelWidth}" 
                     style="${finalImageStyles}"${finalImageClasses ? ` class="${finalImageClasses}"` : ""}>`;

      const wrappedImage = hasLink
        ? `<a href="${escapeHtml(linkUrl)}" target="${linkTarget}" style="color: inherit; text-decoration: none;">${imageTag}</a>`
        : imageTag;

      return `<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 20px;">
        <tr>
            <td align="${alignStyle}" mc:edit="image_block_${block.id}">
                ${wrappedImage}
                ${imageBlock.caption ? `<p style="margin: 8px 0 0 0; font-family: Arial, sans-serif; font-size: 14px; line-height: 20px; color: #666666; text-align: ${alignStyle}; font-style: italic;">${escapeHtml(imageBlock.caption)}</p>` : ""}
            </td>
        </tr>
    </table>`;
    }

    case "list": {
      const listBlock = block as any;
      const items = listBlock.items || [];
      const customClasses = generateEmailClasses("", block);

      if (items.length === 0) {
        return `<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 20px;">
          <tr>
              <td mc:edit="list_block_${block.id}">
                  <div${customClasses ? ` class="${customClasses}"` : ""} style="color: #666; font-style: italic;">Empty list</div>
              </td>
          </tr>
        </table>`;
      }

      const listItems = items
        .map(
          (item: string) =>
            `<li style="margin-bottom: 8px; font-family: Arial, sans-serif; font-size: 16px; line-height: 24px; color: #333333;" class="dark-text">${escapeHtml(item)}</li>`
        )
        .join("");

      return `<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 20px;">
        <tr>
            <td mc:edit="list_block_${block.id}">
                <ul${customClasses ? ` class="${customClasses}"` : ""} style="margin: 0 0 16px 0; padding-left: 20px; list-style-type: disc;">${listItems}</ul>
            </td>
        </tr>
      </table>`;
    }

    case "divider": {
      const dividerBlock = block as DividerBlock;
      const thickness = dividerBlock.thickness || "1px";
      const color = dividerBlock.color || "#e1e4e8";
      const margin = dividerBlock.margin || "24px";

      // Default divider styles and apply block styles
      const defaultDividerStyles = `border-top: ${thickness} solid ${color}; font-size: 1px; line-height: 1px`;
      const finalDividerStyles = mergeEmailStyles(
        defaultDividerStyles,
        block.styles || {}
      );
      const finalDividerClasses = generateEmailClasses("", block);

      return `<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: ${margin} 0;">
        <tr>
            <td mc:edit="divider_block_${block.id}">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                    <tr>
                        <td style="${finalDividerStyles}"${finalDividerClasses ? ` class="${finalDividerClasses}"` : ""}>&nbsp;</td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>`;
    }

    default:
      return `<!-- Unsupported block type: ${block.type} -->`;
  }
}

/**
 * Generate HTML from content blocks (original web version)
 */
function generateHTMLFromBlocks(
  blocks: ContentBlock[],
  template: any,
  metadata: any,
  stylesheetCSS: string | null = null
): string {
  const title = metadata?.name || "Untitled Composition";
  const exportedAt = metadata?.exportedAt || new Date().toISOString();

  // Sort blocks by order
  const sortedBlocks = [...blocks].sort((a, b) => a.order - b.order);

  // Generate HTML for each block
  const blockHTML = sortedBlocks
    .map((block) => generateBlockHTML(block))
    .join("\n");

  // Process stylesheet CSS for email compatibility
  const processedStylesheetCSS = stylesheetCSS
    ? processStylesheetForEmail(stylesheetCSS)
    : "";

  // Create complete HTML document
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(title)}</title>
    <meta name="generator" content="Motive Archive Manager Content Studio">
    <meta name="exported" content="${exportedAt}">
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background-color: #fff;
        }
        
        h1, h2, h3, h4, h5, h6 {
            margin-top: 24px;
            margin-bottom: 16px;
            font-weight: 600;
            line-height: 1.25;
        }
        
        h1 { font-size: 2em; }
        h2 { font-size: 1.5em; }
        h3 { font-size: 1.25em; }
        h4 { font-size: 1em; }
        h5 { font-size: 0.875em; }
        h6 { font-size: 0.85em; }
        
        p {
            margin-bottom: 16px;
        }
        
        img {
            max-width: 100%;
            height: auto;
            display: block;
        }
        
        .image-center {
            margin: 0 auto;
        }
        
        .image-left {
            margin-right: auto;
        }
        
        .image-right {
            margin-left: auto;
        }
        
        hr {
            border: none;
            border-top: 1px solid #e1e4e8;
            margin: 24px 0;
        }
        
        .block {
            margin-bottom: 16px;
        }
        
        strong {
            font-weight: 600;
        }
        
        a {
            color: #0366d6;
            text-decoration: none;
        }
        
        a:hover {
            text-decoration: underline;
        }
        
        ul, ol {
            margin-bottom: 16px;
            padding-left: 20px;
        }
        
        li {
            margin-bottom: 8px;
        }
        
        /* Custom stylesheet CSS */
        ${processedStylesheetCSS}
    </style>
</head>
<body>
    <div class="content">
        ${blockHTML}
    </div>
</body>
</html>`;

  return html;
}

/**
 * Generate HTML for a single block (original web version)
 */
function generateBlockHTML(block: ContentBlock): string {
  switch (block.type) {
    case "html": {
      const htmlBlock = block as HTMLBlock;
      const content = htmlBlock.content || "";
      const styles = generateInlineStyles(block.styles || {});

      // For web export, we can include HTML content directly
      return `<div class="block html-block"${styles}>${content}</div>`;
    }

    case "text": {
      const textBlock = block as TextBlock;
      const content = textBlock.content || "";

      // Process rich formatting if available
      let processedContent = content;
      if (textBlock.richFormatting?.formattedContent) {
        processedContent = textBlock.richFormatting.formattedContent;
      }

      // Apply basic formatting
      processedContent = processedContent
        .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
        .replace(
          /\[([^\]]+)\]\(([^)]+)\)/g,
          '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
        )
        .replace(/\n/g, "<br>");

      const element = textBlock.element || "p";
      const styles = generateInlineStyles(block.styles || {});

      // Don't escape HTML if it contains formatting tags, otherwise escape it
      const hasHtmlTags = /<[^>]+>/.test(processedContent);
      const finalContent = hasHtmlTags
        ? processedContent
        : escapeHtml(processedContent);

      return `<${element} class="block"${styles}>${finalContent}</${element}>`;
    }

    case "image": {
      const imageBlock = block as ImageBlock;
      const altText = imageBlock.altText || "";
      const alignment = imageBlock.alignment || "center";
      const width = imageBlock.width || "100%";
      const styles = generateInlineStyles({
        width,
        ...block.styles,
      });

      const linkUrl = imageBlock.linkUrl?.trim();
      const linkTarget = imageBlock.linkTarget || "_blank";
      const hasLink = linkUrl && linkUrl.length > 0;

      const imageTag = `<img src="${escapeHtml(imageBlock.imageUrl)}" 
             alt="${escapeHtml(altText)}" 
             class="image-${alignment}"${styles}>`;

      const wrappedImage = hasLink
        ? `<a href="${escapeHtml(linkUrl)}" target="${linkTarget}" rel="noopener noreferrer">${imageTag}</a>`
        : imageTag;

      return `<div class="block">
        ${wrappedImage}
      </div>`;
    }

    case "list": {
      const listBlock = block as any;
      const items = listBlock.items || [];
      const styles = generateInlineStyles(block.styles || {});

      if (items.length === 0) {
        return `<div class="block"${styles} style="color: #666; font-style: italic;">Empty list</div>`;
      }

      const listItems = items
        .map((item: string) => `<li>${escapeHtml(item)}</li>`)
        .join("");

      return `<ul class="block"${styles}>${listItems}</ul>`;
    }

    case "divider": {
      const dividerBlock = block as DividerBlock;
      const thickness = dividerBlock.thickness || "1px";
      const color = dividerBlock.color || "#e1e4e8";
      const margin = dividerBlock.margin || "24px";

      const styles = generateInlineStyles({
        borderTop: `${thickness} solid ${color}`,
        margin: `${margin} 0`,
        ...block.styles,
      });

      return `<hr class="block"${styles}>`;
    }

    default:
      return `<!-- Unsupported block type: ${block.type} -->`;
  }
}

/**
 * Generate inline styles from style object
 */
function generateInlineStyles(styles: Record<string, any>): string {
  if (!styles || Object.keys(styles).length === 0) {
    return "";
  }

  const styleString = Object.entries(styles)
    .map(([key, value]) => {
      // Convert camelCase to kebab-case
      const kebabKey = key.replace(/([A-Z])/g, "-$1").toLowerCase();
      return `${kebabKey}: ${value}`;
    })
    .join("; ");

  return ` style="${styleString}"`;
}

/**
 * Merge default styles with block styles for email compatibility
 */
function mergeEmailStyles(
  defaultStyles: string,
  blockStyles: Record<string, any>
): string {
  if (!blockStyles || Object.keys(blockStyles).length === 0) {
    return defaultStyles;
  }

  // Parse existing style string into object
  const existing: Record<string, string> = {};
  if (defaultStyles) {
    defaultStyles.split(";").forEach((rule) => {
      const [property, value] = rule.split(":").map((s) => s.trim());
      if (property && value) {
        existing[property] = value;
      }
    });
  }

  // Add block styles, overriding defaults
  Object.entries(blockStyles).forEach(([key, value]) => {
    // Convert camelCase to kebab-case
    const kebabKey = key.replace(/([A-Z])/g, "-$1").toLowerCase();
    existing[kebabKey] = value;
  });

  // Convert back to style string
  return Object.entries(existing)
    .map(([key, value]) => `${key}: ${value}`)
    .join("; ");
}

/**
 * Generate CSS class attribute with block CSS classes
 */
function generateEmailClasses(
  defaultClasses: string,
  block: ContentBlock
): string {
  const classes = [defaultClasses];

  if (block.cssClassName) {
    classes.push(block.cssClassName);
  }

  return classes.filter(Boolean).join(" ");
}

// Removed generateInlineStylesFromClasses - no longer needed with CSS class approach

/**
 * Escape HTML special characters
 */
/**
 * Generate dynamic CSS for responsive hero images with custom mobile heights
 */
function generateDynamicImageCSS(blocks: ContentBlock[]): string {
  const imageBlocks = blocks.filter((block) => {
    if (block.type !== "image") return false;
    const imageBlock = block as ImageBlock;
    return imageBlock.email?.isFullWidth && imageBlock.email?.useCenterCrop;
  }) as ImageBlock[];

  if (imageBlocks.length === 0) return "";

  const mobileCSSRules = imageBlocks
    .map((block) => {
      const mobileHeight = block.email?.mobileMinHeight || "100";
      return `.responsive-hero-${block.id} { 
        height: auto !important; 
        min-height: ${mobileHeight}px !important; 
        object-fit: cover !important; 
        object-position: center !important; 
      }`;
    })
    .join("\n            ");

  return `
        @media screen and (max-width: 600px) {
            ${mobileCSSRules}
        }`;
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };

  return text.replace(/[&<>"']/g, (m) => map[m]);
}
