/**
 * Content Formatter Utility
 *
 * Handles smart content formatting that preserves HTML tags while still
 * processing markdown-style formatting for text content.
 */

interface FormatContentOptions {
  preserveHtml?: boolean;
  emailMode?: boolean;
  emailPlatform?: string;
  linkColor?: string;
  stylesheetData?: any; // Add stylesheet data for HTML tag styling
}

/**
 * Formats content with smart HTML preservation and markdown-style formatting
 *
 * Features:
 * - Preserves existing HTML tags (p, img, div, span, etc.)
 * - Applies CSS styles to HTML tags from stylesheets
 * - Applies markdown-style formatting (**bold**, [link](url)) to plain text
 * - Handles newlines appropriately based on context
 * - Email-safe formatting when needed
 */
export function formatContent(
  content: string,
  options: FormatContentOptions = {}
): string {
  if (!content || content.trim() === "") {
    return "";
  }

  const {
    preserveHtml = true,
    emailMode = false,
    emailPlatform = "generic",
    linkColor = "#1e40af",
    stylesheetData = null,
  } = options;

  // Debug logging removed

  let html = content;

  // If preserveHtml is enabled, check if content contains HTML tags
  const hasHtmlTags = preserveHtml && /<[^>]+>/g.test(html);
  // Debug logging removed

  if (hasHtmlTags) {
    // Content has HTML tags - preserve them and only format text nodes
    html = formatMixedContent(html, options);
  } else {
    // Content is plain text - apply full markdown-style formatting
    html = formatPlainTextContent(html, options);
  }

  // Debug logging removed

  return html;
}

/**
 * Formats mixed content that contains HTML tags
 * Preserves HTML structure while formatting text nodes
 */
function formatMixedContent(
  content: string,
  options: FormatContentOptions
): string {
  // Split content into HTML tags and text nodes
  const parts = content.split(/(<[^>]+>)/g);

  // Debug logging removed

  const processedParts = parts.map((part, index) => {
    // If this part is an HTML tag, apply CSS styles if available
    if (part.match(/^<[^>]+>$/)) {
      return applyHtmlTagStyles(part, options);
    }

    // If this is a text node with content, apply markdown-style formatting
    if (part.trim()) {
      return formatTextNode(part, options);
    }

    // If this is whitespace with newlines, convert newlines to <br>
    if (part.includes("\n")) {
      return part.replace(/\n/g, "<br>");
    }

    return part;
  });

  return processedParts.join("");
}

/**
 * Applies CSS styles to HTML tags based on stylesheet data
 */
function applyHtmlTagStyles(
  htmlTag: string,
  options: FormatContentOptions
): string {
  const { stylesheetData, emailMode = false } = options;

  // Debug logging removed

  if (
    !stylesheetData ||
    !stylesheetData.parsedCSS ||
    !stylesheetData.parsedCSS.globalStyles
  ) {
    return htmlTag;
  }

  // Extract tag name from HTML tag
  const tagMatch = htmlTag.match(/^<(\w+)(?:\s|>)/);
  if (!tagMatch) {
    return htmlTag;
  }

  const tagName = tagMatch[1].toLowerCase();
  const globalStyles = stylesheetData.parsedCSS.globalStyles;

  // Check if we have styles for this tag
  if (!globalStyles[tagName]) {
    return htmlTag;
  }

  try {
    // Parse the CSS properties for this tag
    const cssProperties = JSON.parse(globalStyles[tagName]);

    // Convert CSS properties to inline styles
    const inlineStyles = convertCSSPropertiesToInline(cssProperties, emailMode);

    if (!inlineStyles) {
      return htmlTag;
    }

    // Apply the styles to the HTML tag
    return applyInlineStylesToTag(htmlTag, inlineStyles);
  } catch (error) {
    console.warn(`Failed to apply styles to ${tagName} tag:`, error);
    return htmlTag;
  }
}

/**
 * Converts CSS properties object to inline style string
 */
function convertCSSPropertiesToInline(
  cssProperties: { [key: string]: string },
  emailMode: boolean
): string {
  const styleEntries = Object.entries(cssProperties)
    .filter(([property, value]) => {
      // Skip properties that don't work in email if in email mode
      if (emailMode) {
        const emailUnsafeProperties = [
          "transform",
          "animation",
          "transition",
          "box-shadow",
        ];
        return !emailUnsafeProperties.includes(property);
      }
      return true;
    })
    .map(([property, value]) => `${property}: ${value}`)
    .filter(Boolean);

  return styleEntries.join("; ");
}

/**
 * Applies inline styles to an HTML tag
 */
function applyInlineStylesToTag(htmlTag: string, inlineStyles: string): string {
  if (!inlineStyles) {
    return htmlTag;
  }

  // Check if the tag is self-closing
  const isSelfClosing =
    htmlTag.endsWith("/>") ||
    htmlTag.match(
      /^<(img|br|hr|input|meta|link|area|base|col|embed|source|track|wbr)(\s[^>]*)?\/?>$/i
    );

  if (isSelfClosing) {
    // For self-closing tags, add style attribute before the closing >
    return htmlTag.replace(/(\s*\/?>)$/, ` style="${inlineStyles}"$1`);
  } else {
    // For opening tags, add style attribute before the closing >
    return htmlTag.replace(/(>)$/, ` style="${inlineStyles}"$1`);
  }
}

/**
 * Formats a text node (content between HTML tags)
 */
function formatTextNode(text: string, options: FormatContentOptions): string {
  let formatted = text;

  // Apply markdown-style formatting
  formatted = applyMarkdownFormatting(formatted, options);

  // Only convert newlines to <br> if this text node doesn't contain block-level context
  // (i.e., it's likely inline text that needs line break preservation)
  if (!options.emailMode || options.emailPlatform !== "sendgrid") {
    formatted = formatted.replace(/\n/g, "<br>");
  }

  return formatted;
}

/**
 * Formats plain text content (no HTML tags)
 */
function formatPlainTextContent(
  content: string,
  options: FormatContentOptions
): string {
  let html = content;

  // Apply markdown-style formatting
  html = applyMarkdownFormatting(html, options);

  // Handle newlines - convert to <br> for plain text
  html = html.replace(/\n/g, "<br>");

  return html;
}

/**
 * Applies markdown-style formatting to text
 */
function applyMarkdownFormatting(
  text: string,
  options: FormatContentOptions
): string {
  let formatted = text;

  // Convert **bold** to <strong>bold</strong>
  formatted = formatted.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");

  // Convert *italic* to <em>italic</em>
  formatted = formatted.replace(/\*([^*]+)\*/g, "<em>$1</em>");

  // Convert [text](url) to <a href="url">text</a>
  const linkStyle = options.emailMode
    ? `style="color: ${options.linkColor}; text-decoration: underline;"`
    : 'class="text-blue-600 hover:text-blue-800 underline"';

  formatted = formatted.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    `<a href="$2" target="_blank" rel="noopener noreferrer" ${linkStyle}>$1</a>`
  );

  return formatted;
}

/**
 * Sanitizes content for email platforms with strict requirements
 */
export function sanitizeForEmail(
  content: string,
  platform: string = "generic"
): string {
  let sanitized = content;

  switch (platform) {
    case "sendgrid":
      // SendGrid is strict about certain properties
      // Remove potentially problematic attributes
      sanitized = sanitized.replace(/style="[^"]*transform[^"]*"/gi, "");
      sanitized = sanitized.replace(/style="[^"]*animation[^"]*"/gi, "");
      break;

    case "mailchimp":
      // Mailchimp-specific sanitization if needed
      break;

    default:
      // Generic email sanitization
      break;
  }

  return sanitized;
}

/**
 * Extracts plain text from formatted content (strips HTML tags)
 */
export function extractPlainText(formattedContent: string): string {
  return formattedContent
    .replace(/<[^>]+>/g, "") // Remove HTML tags
    .replace(/&nbsp;/g, " ") // Convert &nbsp; to spaces
    .replace(/&amp;/g, "&") // Convert &amp; to &
    .replace(/&lt;/g, "<") // Convert &lt; to <
    .replace(/&gt;/g, ">") // Convert &gt; to >
    .trim();
}

/**
 * Checks if content contains HTML tags
 */
export function hasHtmlContent(content: string): boolean {
  return /<[^>]+>/g.test(content);
}

/**
 * Validates HTML content for basic structure
 */
export function validateHtmlStructure(content: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check for unclosed tags
  const openTags = content.match(/<(\w+)[^>]*>/g) || [];
  const closeTags = content.match(/<\/(\w+)>/g) || [];

  if (openTags.length !== closeTags.length) {
    errors.push("Mismatched opening and closing tags");
  }

  // Check for self-closing tags that are properly formed
  const selfClosingTags = ["img", "br", "hr", "input", "meta", "link"];
  const invalidSelfClosing = content.match(
    /<(img|br|hr|input|meta|link)[^>]*>[^<]*<\/\1>/gi
  );

  if (invalidSelfClosing) {
    errors.push("Self-closing tags should not have closing tags");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Get CSS styles for an HTML element from stylesheet data
 * This allows preview components to apply global element styles to their wrapper elements
 */
export function getElementStylesFromStylesheet(
  elementName: string,
  stylesheetData: any,
  emailMode: boolean = false
): React.CSSProperties {
  if (
    !stylesheetData ||
    !stylesheetData.parsedCSS ||
    !stylesheetData.parsedCSS.globalStyles
  ) {
    return {};
  }

  const globalStyles = stylesheetData.parsedCSS.globalStyles;
  const elementKey = elementName.toLowerCase();

  if (!globalStyles[elementKey]) {
    return {};
  }

  try {
    // Parse the CSS properties for this element
    const cssProperties = JSON.parse(globalStyles[elementKey]);

    // Convert to React CSS properties
    const reactStyles: React.CSSProperties = {};

    Object.entries(cssProperties).forEach(([property, value]) => {
      // Skip properties that don't work in email if in email mode
      if (emailMode) {
        const emailUnsafeProperties = [
          "transform",
          "animation",
          "transition",
          "box-shadow",
        ];
        if (emailUnsafeProperties.includes(property)) {
          return;
        }
      }

      // Convert CSS property names to camelCase for React
      const camelCaseProperty = property.replace(/-([a-z])/g, (match, letter) =>
        letter.toUpperCase()
      );

      reactStyles[camelCaseProperty as keyof React.CSSProperties] =
        value as any;
    });

    return reactStyles;
  } catch (error) {
    console.warn(`Failed to parse styles for ${elementName}:`, error);
    return {};
  }
}
