#!/usr/bin/env node

/**
 * Test Content Formatter - Test if formatContent applies styles to HTML tags
 */

// Copy the formatContent function from src/lib/content-formatter.ts
function formatContent(content, options = {}) {
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

  let html = content;

  // If preserveHtml is enabled, check if content contains HTML tags
  const hasHtmlTags = preserveHtml && /<[^>]+>/g.test(html);

  if (hasHtmlTags) {
    // Content has HTML tags - preserve them and only format text nodes
    html = formatMixedContent(html, options);
  } else {
    // Content is plain text - apply full markdown-style formatting
    html = formatPlainTextContent(html, options);
  }

  return html;
}

/**
 * Formats mixed content that contains HTML tags
 * Preserves HTML structure while formatting text nodes
 */
function formatMixedContent(content, options) {
  // Split content into HTML tags and text nodes
  const parts = content.split(/(<[^>]+>)/g);

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
function applyHtmlTagStyles(htmlTag, options) {
  const { stylesheetData, emailMode = false } = options;

  console.log(`🔍 Processing HTML tag: ${htmlTag}`);

  if (
    !stylesheetData ||
    !stylesheetData.parsedCSS ||
    !stylesheetData.parsedCSS.globalStyles
  ) {
    console.log(`❌ No stylesheet data available for ${htmlTag}`);
    return htmlTag;
  }

  // Extract tag name from HTML tag
  const tagMatch = htmlTag.match(/^<(\w+)(?:\s|>)/);
  if (!tagMatch) {
    console.log(`❌ Could not extract tag name from ${htmlTag}`);
    return htmlTag;
  }

  const tagName = tagMatch[1].toLowerCase();
  const globalStyles = stylesheetData.parsedCSS.globalStyles;

  console.log(`📋 Tag name: ${tagName}`);
  console.log(`📋 Available global styles: ${Object.keys(globalStyles)}`);

  // Check if we have styles for this tag
  if (!globalStyles[tagName]) {
    console.log(`❌ No styles found for ${tagName}`);
    return htmlTag;
  }

  try {
    // Parse the CSS properties for this tag
    const cssProperties = JSON.parse(globalStyles[tagName]);
    console.log(`✅ CSS properties for ${tagName}:`, cssProperties);

    // Convert CSS properties to inline styles
    const inlineStyles = convertCSSPropertiesToInline(cssProperties, emailMode);
    console.log(`✅ Inline styles: ${inlineStyles}`);

    if (!inlineStyles) {
      console.log(`❌ No inline styles generated for ${tagName}`);
      return htmlTag;
    }

    // Apply the styles to the HTML tag
    const styledTag = applyInlineStylesToTag(htmlTag, inlineStyles);
    console.log(`✅ Styled tag: ${styledTag}`);
    return styledTag;
  } catch (error) {
    console.warn(`❌ Failed to apply styles to ${tagName} tag:`, error);
    return htmlTag;
  }
}

/**
 * Converts CSS properties object to inline style string
 */
function convertCSSPropertiesToInline(cssProperties, emailMode) {
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
function applyInlineStylesToTag(htmlTag, inlineStyles) {
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
 * Formats text nodes
 */
function formatTextNode(text, options) {
  let formatted = text;

  // Apply markdown-style formatting
  formatted = applyMarkdownFormatting(formatted, options);

  // Only convert newlines to <br> if this text node doesn't contain block-level context
  if (!options.emailMode || options.emailPlatform !== "sendgrid") {
    formatted = formatted.replace(/\n/g, "<br>");
  }

  return formatted;
}

/**
 * Formats plain text content (no HTML tags)
 */
function formatPlainTextContent(content, options) {
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
function applyMarkdownFormatting(text, options) {
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

// Test the formatContent function
function testFormatContent() {
  console.log("🔍 Testing formatContent function...\n");

  // Create test stylesheet data
  const testStylesheetData = {
    parsedCSS: {
      globalStyles: {
        p: '{"margin-bottom":"100px","color":"#333","font-size":"16px","line-height":"1.6"}',
        img: '{"max-width":"100% !important","width":"100% !important","height":"auto !important","display":"block !important","margin-bottom":"40px !important"}',
      },
    },
  };

  // Test 1: Plain text content (should not apply HTML tag styles)
  console.log("📋 Test 1: Plain text content");
  const plainText = "This is plain text content.";
  const formattedPlainText = formatContent(plainText, {
    preserveHtml: true,
    emailMode: false,
    stylesheetData: testStylesheetData,
  });
  console.log("Input:", plainText);
  console.log("Output:", formattedPlainText);
  console.log("");

  // Test 2: HTML paragraph content (should apply p styles)
  console.log("📋 Test 2: HTML paragraph content");
  const htmlParagraph = "<p>This is a paragraph with HTML tags.</p>";
  const formattedHtmlParagraph = formatContent(htmlParagraph, {
    preserveHtml: true,
    emailMode: false,
    stylesheetData: testStylesheetData,
  });
  console.log("Input:", htmlParagraph);
  console.log("Output:", formattedHtmlParagraph);
  console.log("");

  // Test 3: HTML image content (should apply img styles)
  console.log("📋 Test 3: HTML image content");
  const htmlImage = '<img src="test.jpg" alt="Test image">';
  const formattedHtmlImage = formatContent(htmlImage, {
    preserveHtml: true,
    emailMode: false,
    stylesheetData: testStylesheetData,
  });
  console.log("Input:", htmlImage);
  console.log("Output:", formattedHtmlImage);
  console.log("");

  // Test 4: Mixed content with HTML tags
  console.log("📋 Test 4: Mixed content with HTML tags");
  const mixedContent =
    'Here is some text <p>with a paragraph</p> and <img src="test.jpg" alt="image"> in between.';
  const formattedMixedContent = formatContent(mixedContent, {
    preserveHtml: true,
    emailMode: false,
    stylesheetData: testStylesheetData,
  });
  console.log("Input:", mixedContent);
  console.log("Output:", formattedMixedContent);
  console.log("");

  // Test 5: No stylesheet data
  console.log("📋 Test 5: No stylesheet data");
  const noStylesheetContent = "<p>This should not have styles applied.</p>";
  const formattedNoStylesheet = formatContent(noStylesheetContent, {
    preserveHtml: true,
    emailMode: false,
    stylesheetData: null,
  });
  console.log("Input:", noStylesheetContent);
  console.log("Output:", formattedNoStylesheet);
  console.log("");

  console.log("✅ formatContent testing completed!");
}

// Run the test
testFormatContent();
