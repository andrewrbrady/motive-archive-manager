"use client";

import { useEffect, useState, useRef } from "react";
import { useStylesheetData } from "@/hooks/useStylesheetData";

interface StylesheetInjectorProps {
  selectedStylesheetId: string | null;
}

/**
 * StylesheetInjector - Injects selected stylesheet CSS content into the page
 *
 * This component loads the full CSS content from the selected stylesheet
 * and injects it into the page head so all CSS classes are available globally.
 * This enables users' CSS classes (.email-container, .header, etc.) to work
 * throughout the content editor and preview.
 *
 * OPTIMIZED FOR CSS HOT-RELOAD:
 * - Updates existing <style> elements instead of removing/re-adding them
 * - Preserves component state during CSS updates
 * - Prevents unnecessary DOM manipulation and browser reflow
 * - Uses useRef to track style elements for efficient updates
 */
// Helper function to scope CSS very specifically to prevent any page layout conflicts
const scopeCSS = (css: string): string => {
  // FIXED: Remove CSS comments first to prevent them from being parsed as selectors
  const cssWithoutComments = css.replace(/\/\*[\s\S]*?\*\//g, "");

  return cssWithoutComments.replace(
    /([^{]+)\{([^}]+)\}/g,
    (match, selector, declarations) => {
      const trimmedSelector = selector.trim();

      // Skip empty selectors
      if (!trimmedSelector) {
        return "";
      }

      // FIXED: More precise dangerous selector detection
      // Only skip selectors that are EXACTLY these dangerous selectors or start with them as element selectors
      const dangerousSelectors = [
        "body",
        "html",
        "nav",
        "header",
        "footer",
        "*",
        "main",
        "section", // This should only match element selector "section", not class names like ".cta-section"
      ];

      const shouldSkip = dangerousSelectors.some((dangerous) => {
        // Only skip if it's exactly the dangerous selector (element selector)
        // or if it starts with the dangerous selector followed by a space or other CSS combinator
        return (
          trimmedSelector === dangerous ||
          trimmedSelector.startsWith(dangerous + " ") ||
          trimmedSelector.startsWith(dangerous + ":") ||
          trimmedSelector.startsWith(dangerous + "[") ||
          trimmedSelector.startsWith(dangerous + ">") ||
          trimmedSelector.startsWith(dangerous + "+") ||
          trimmedSelector.startsWith(dangerous + "~")
        );
      });

      if (shouldSkip) {
        console.warn(`Skipping dangerous CSS selector: ${trimmedSelector}`);
        return "";
      }

      // Handle CSS classes
      if (trimmedSelector.startsWith(".")) {
        // ENHANCED: Boost specificity for important properties and add !important
        const enhancedDeclarations = declarations
          .trim()
          .replace(/color\s*:\s*([^;]+);?/g, "color: $1 !important;")
          .replace(/background\s*:\s*([^;]+);?/g, "background: $1 !important;")
          .replace(
            /background-color\s*:\s*([^;]+);?/g,
            "background-color: $1 !important;"
          )
          .replace(
            /border-color\s*:\s*([^;]+);?/g,
            "border-color: $1 !important;"
          )
          .replace(/text-align\s*:\s*([^;]+);?/g, "text-align: $1 !important;")
          .replace(/padding\s*:\s*([^;]+);?/g, "padding: $1 !important;")
          .replace(/margin\s*:\s*([^;]+);?/g, "margin: $1 !important;");

        // SIMPLIFIED: Use more targeted but simpler selectors that match the actual DOM structure
        const targetedSelectors = [
          // Target the html-block wrapper directly (this is where cssClassName is applied)
          `.content-studio-preview .html-block${trimmedSelector}`,
          // Target within email preview
          `.email-preview .html-block${trimmedSelector}`,
          // Target within clean preview
          `.clean-preview .html-block${trimmedSelector}`,
          // Target within data-block-type containers
          `[data-block-type="html"] .html-block${trimmedSelector}`,
          // Direct targeting for maximum compatibility
          `.html-block${trimmedSelector}`,
        ];

        console.log(
          `✅ CSS Injection: Processing ${trimmedSelector} with simplified selectors`
        );
        return `${targetedSelectors.join(", ")} { ${enhancedDeclarations} }`;
      }

      // CRITICAL FIX: Handle mixed descendant selectors like .content img, .cta-section a, etc.
      // These are class selectors with element descendants (more comprehensive pattern)
      const isMixedDescendantSelector =
        /^\.[\w-]+(\s+[a-zA-Z][a-zA-Z0-9]*)+$/.test(trimmedSelector) ||
        /^\.[\w-]+\s+\.[\w-]+\s+[a-zA-Z][a-zA-Z0-9]*$/.test(trimmedSelector);

      if (isMixedDescendantSelector) {
        // Handle selectors like ".content img", ".cta-section a", etc.
        const enhancedDeclarations = declarations
          .trim()
          .split(";")
          .map((prop: string) => {
            const trimmedProp = prop.trim();
            if (!trimmedProp) return "";
            if (trimmedProp.includes("!important")) {
              return trimmedProp;
            }
            return `${trimmedProp} !important`;
          })
          .filter(Boolean)
          .join("; ");

        // Create scoped selectors for mixed descendant selectors
        const scopedSelectors = [
          // ULTRA HIGH SPECIFICITY - Target within preview containers with multiple class combinations
          `.content-studio-preview.content-studio-preview ${trimmedSelector}`,
          `.email-preview.email-preview ${trimmedSelector}`,
          `.clean-preview.clean-preview ${trimmedSelector}`,
          `.accurate-email-preview.accurate-email-preview ${trimmedSelector}`,
          // EMAIL PLATFORM SPECIFICITY - Target specific email preview types (CRITICAL FIX)
          `.sendgrid-preview.sendgrid-preview ${trimmedSelector}`,
          `.mailchimp-preview.mailchimp-preview ${trimmedSelector}`,
          `.generic-preview.generic-preview ${trimmedSelector}`,
          // COMBINED EMAIL PREVIEW TARGETING - Target the actual DOM structure
          `.content-studio-preview.email-preview.sendgrid-preview ${trimmedSelector}`,
          `.content-studio-preview.email-preview.mailchimp-preview ${trimmedSelector}`,
          `.content-studio-preview.email-preview.generic-preview ${trimmedSelector}`,
          `.content-studio-preview.email-preview.accurate-email-preview ${trimmedSelector}`,
          // HIGH SPECIFICITY - HTML block targeting
          `.html-block.html-block ${trimmedSelector}`,
          `.content-studio-preview .html-block ${trimmedSelector}`,
          `.email-preview .html-block ${trimmedSelector}`,
          `.clean-preview .html-block ${trimmedSelector}`,
          `.accurate-email-preview .html-block ${trimmedSelector}`,
          `.sendgrid-preview .html-block ${trimmedSelector}`,
          `.mailchimp-preview .html-block ${trimmedSelector}`,
          `.generic-preview .html-block ${trimmedSelector}`,
          // COMBINED EMAIL PREVIEW + HTML BLOCK TARGETING
          `.content-studio-preview.email-preview.sendgrid-preview .html-block ${trimmedSelector}`,
          `.content-studio-preview.email-preview.mailchimp-preview .html-block ${trimmedSelector}`,
          `.content-studio-preview.email-preview.generic-preview .html-block ${trimmedSelector}`,
          `.content-studio-preview.email-preview.accurate-email-preview .html-block ${trimmedSelector}`,
          // MEDIUM SPECIFICITY - Block type targeting
          `[data-block-type="html"] ${trimmedSelector}`,
          `[data-block-type="text"] ${trimmedSelector}`,
          `[data-block-type="list"] ${trimmedSelector}`,
          // EMAIL CONTAINER TARGETING
          `.email-container ${trimmedSelector}`,
          `.content-studio-preview .email-container ${trimmedSelector}`,
          `.email-preview .email-container ${trimmedSelector}`,
          `.clean-preview .email-container ${trimmedSelector}`,
          `.accurate-email-preview .email-container ${trimmedSelector}`,
          `.sendgrid-preview .email-container ${trimmedSelector}`,
          `.mailchimp-preview .email-container ${trimmedSelector}`,
          `.generic-preview .email-container ${trimmedSelector}`,
          // COMBINED EMAIL PREVIEW + EMAIL CONTAINER TARGETING
          `.content-studio-preview.email-preview.sendgrid-preview .email-container ${trimmedSelector}`,
          `.content-studio-preview.email-preview.mailchimp-preview .email-container ${trimmedSelector}`,
          `.content-studio-preview.email-preview.generic-preview .email-container ${trimmedSelector}`,
          `.content-studio-preview.email-preview.accurate-email-preview .email-container ${trimmedSelector}`,
        ];

        console.log(
          `✅ CSS Injection: Processing mixed descendant selector ${trimmedSelector} with FULL precedence`
        );
        return `${scopedSelectors.join(", ")} { ${enhancedDeclarations} }`;
      }

      // CRITICAL FIX: Handle global element styles (p, h1, h2, h3, img, ul, li, etc.)
      // These need to be scoped to preview containers to avoid affecting the entire page
      const isElementSelector = /^[a-zA-Z][a-zA-Z0-9]*$/.test(trimmedSelector);
      const isCommaList = trimmedSelector.includes(",");
      const hasSpaceSelectors =
        /\s/.test(trimmedSelector) && !trimmedSelector.includes("@");

      if (isElementSelector || isCommaList || hasSpaceSelectors) {
        // Parse comma-separated selectors and space-separated selectors
        const elementSelectors = trimmedSelector
          .split(",")
          .map((s: string) => s.trim());
        const validElementSelectors = elementSelectors.filter(
          (selector: string) => {
            // Process simple element selectors and basic descendant selectors like "ul li"
            const isSimpleElement = /^[a-zA-Z][a-zA-Z0-9]*$/.test(selector);
            const isDescendantSelector =
              /^[a-zA-Z][a-zA-Z0-9]*\s+[a-zA-Z][a-zA-Z0-9]*$/.test(selector);

            // Check if it's not a dangerous selector
            const firstElement = selector.split(/[\s:>+~]/)[0];
            const isDangerous = dangerousSelectors.includes(firstElement);

            return (isSimpleElement || isDescendantSelector) && !isDangerous;
          }
        );

        if (validElementSelectors.length === 0) {
          return "";
        }

        // CRITICAL: Make ALL CSS properties !important to ensure precedence
        const enhancedDeclarations = declarations
          .trim()
          // Split by semicolon and process each property
          .split(";")
          .map((prop: string) => {
            const trimmedProp = prop.trim();
            if (!trimmedProp) return "";

            // If already has !important, keep it as is
            if (trimmedProp.includes("!important")) {
              return trimmedProp;
            }

            // Add !important to every property
            return `${trimmedProp} !important`;
          })
          .filter(Boolean)
          .join("; ");

        // Create scoped selectors for each element with MAXIMUM SPECIFICITY
        const scopedSelectors = validElementSelectors.flatMap(
          (elementSelector: string) => [
            // ULTRA HIGH SPECIFICITY - Target elements within content studio previews
            `.content-studio-preview.content-studio-preview ${elementSelector}`,
            `.email-preview.email-preview ${elementSelector}`,
            `.clean-preview.clean-preview ${elementSelector}`,
            `.accurate-email-preview.accurate-email-preview ${elementSelector}`,
            // EMAIL PLATFORM SPECIFICITY - Target specific email preview types
            `.sendgrid-preview.sendgrid-preview ${elementSelector}`,
            `.mailchimp-preview.mailchimp-preview ${elementSelector}`,
            `.generic-preview.generic-preview ${elementSelector}`,
            // COMBINED EMAIL PREVIEW TARGETING - Target the actual DOM structure (CRITICAL FIX)
            `.content-studio-preview.email-preview.sendgrid-preview ${elementSelector}`,
            `.content-studio-preview.email-preview.mailchimp-preview ${elementSelector}`,
            `.content-studio-preview.email-preview.generic-preview ${elementSelector}`,
            `.content-studio-preview.email-preview.accurate-email-preview ${elementSelector}`,
            // HIGH SPECIFICITY - Multiple class targeting
            `.content-studio-preview .email-container ${elementSelector}`,
            `.email-preview .email-container ${elementSelector}`,
            `.clean-preview .email-container ${elementSelector}`,
            `.accurate-email-preview .email-container ${elementSelector}`,
            `.sendgrid-preview .email-container ${elementSelector}`,
            `.mailchimp-preview .email-container ${elementSelector}`,
            `.generic-preview .email-container ${elementSelector}`,
            // COMBINED EMAIL PREVIEW + EMAIL CONTAINER TARGETING
            `.content-studio-preview.email-preview.sendgrid-preview .email-container ${elementSelector}`,
            `.content-studio-preview.email-preview.mailchimp-preview .email-container ${elementSelector}`,
            `.content-studio-preview.email-preview.generic-preview .email-container ${elementSelector}`,
            `.content-studio-preview.email-preview.accurate-email-preview .email-container ${elementSelector}`,
            // MEDIUM SPECIFICITY - Block type targeting
            `[data-block-type="text"] ${elementSelector}`,
            `[data-block-type="html"] ${elementSelector}`,
            `[data-block-type="list"] ${elementSelector}`,
            // ADDITIONAL SPECIFICITY - HTML block targeting
            `.html-block.html-block ${elementSelector}`,
            `.content-studio-preview .html-block ${elementSelector}`,
            `.email-preview .html-block ${elementSelector}`,
            `.clean-preview .html-block ${elementSelector}`,
            `.accurate-email-preview .html-block ${elementSelector}`,
            `.sendgrid-preview .html-block ${elementSelector}`,
            `.mailchimp-preview .html-block ${elementSelector}`,
            `.generic-preview .html-block ${elementSelector}`,
          ]
        );

        console.log(
          `✅ CSS Injection: Processing element selector(s) ${validElementSelectors.join(", ")} with FULL precedence`
        );
        return `${scopedSelectors.join(", ")} { ${enhancedDeclarations} }`;
      }

      // Skip any other selector types to be safe
      return "";
    }
  );
};

// NEW: Helper function to create unscoped CSS specifically for HTML content
const createHTMLContentCSS = (css: string): string => {
  // FIXED: Remove CSS comments first to prevent them from being parsed as selectors
  const cssWithoutComments = css.replace(/\/\*[\s\S]*?\*\//g, "");

  return cssWithoutComments.replace(
    /([^{]+)\{([^}]+)\}/g,
    (match, selector, declarations) => {
      const trimmedSelector = selector.trim();

      // Skip empty selectors
      if (!trimmedSelector) {
        return "";
      }

      // FIXED: More precise dangerous selector detection
      const dangerousSelectors = [
        "body",
        "html",
        "nav",
        "header",
        "footer",
        "*",
        "main",
        "section", // This should only match element selector "section", not class names like ".cta-section"
      ];

      const shouldSkip = dangerousSelectors.some((dangerous) => {
        // Only skip if it's exactly the dangerous selector (element selector)
        // or if it starts with the dangerous selector followed by a space or other CSS combinator
        return (
          trimmedSelector === dangerous ||
          trimmedSelector.startsWith(dangerous + " ") ||
          trimmedSelector.startsWith(dangerous + ":") ||
          trimmedSelector.startsWith(dangerous + "[") ||
          trimmedSelector.startsWith(dangerous + ">") ||
          trimmedSelector.startsWith(dangerous + "+") ||
          trimmedSelector.startsWith(dangerous + "~")
        );
      });

      if (shouldSkip) {
        return "";
      }

      // Handle CSS classes
      if (trimmedSelector.startsWith(".")) {
        // ENHANCED: Boost specificity for important properties and add !important
        const enhancedDeclarations = declarations
          .trim()
          .replace(/color\s*:\s*([^;]+);?/g, "color: $1 !important;")
          .replace(/background\s*:\s*([^;]+);?/g, "background: $1 !important;")
          .replace(
            /background-color\s*:\s*([^;]+);?/g,
            "background-color: $1 !important;"
          )
          .replace(
            /border-color\s*:\s*([^;]+);?/g,
            "border-color: $1 !important;"
          )
          .replace(/text-align\s*:\s*([^;]+);?/g, "text-align: $1 !important;")
          .replace(/padding\s*:\s*([^;]+);?/g, "padding: $1 !important;")
          .replace(/margin\s*:\s*([^;]+);?/g, "margin: $1 !important;");

        // SIMPLIFIED: Use targeted selectors for HTML content that match the actual DOM structure
        const htmlContentSelectors = [
          // Target the html-block wrapper directly (this is where cssClassName is applied)
          `.content-studio-preview .html-block${trimmedSelector}`,
          // Target within email preview
          `.email-preview .html-block${trimmedSelector}`,
          // Target within clean preview
          `.clean-preview .html-block${trimmedSelector}`,
          // Target within data-block-type containers
          `[data-block-type="html"] .html-block${trimmedSelector}`,
          // Target nested content within HTML blocks
          `.html-block ${trimmedSelector}`,
          // Direct targeting for maximum compatibility
          `.html-block${trimmedSelector}`,
        ];

        console.log(
          `✅ HTML CSS Injection: Processing ${trimmedSelector} for HTML content`
        );
        return `${htmlContentSelectors.join(", ")} { ${enhancedDeclarations} }`;
      }

      // CRITICAL FIX: Handle mixed descendant selectors like .content img, .cta-section a, etc. for HTML content
      // These are class selectors with element descendants (more comprehensive pattern)
      const isMixedDescendantSelector =
        /^\.[\w-]+(\s+[a-zA-Z][a-zA-Z0-9]*)+$/.test(trimmedSelector) ||
        /^\.[\w-]+\s+\.[\w-]+\s+[a-zA-Z][a-zA-Z0-9]*$/.test(trimmedSelector);

      if (isMixedDescendantSelector) {
        // Handle selectors like ".content img", ".cta-section a", etc.
        const enhancedDeclarations = declarations
          .trim()
          .split(";")
          .map((prop: string) => {
            const trimmedProp = prop.trim();
            if (!trimmedProp) return "";
            if (trimmedProp.includes("!important")) {
              return trimmedProp;
            }
            return `${trimmedProp} !important`;
          })
          .filter(Boolean)
          .join("; ");

        // Create scoped selectors for mixed descendant selectors in HTML content
        const scopedSelectors = [
          // ULTRA HIGH SPECIFICITY - HTML block targeting
          `.html-block.html-block ${trimmedSelector}`,
          // HIGH SPECIFICITY - Preview container + HTML block
          `.content-studio-preview .html-block.html-block ${trimmedSelector}`,
          `.email-preview .html-block.html-block ${trimmedSelector}`,
          `.clean-preview .html-block.html-block ${trimmedSelector}`,
          `.accurate-email-preview .html-block.html-block ${trimmedSelector}`,
          // EMAIL PLATFORM SPECIFICITY - Target specific email preview types
          `.sendgrid-preview .html-block.html-block ${trimmedSelector}`,
          `.mailchimp-preview .html-block.html-block ${trimmedSelector}`,
          `.generic-preview .html-block.html-block ${trimmedSelector}`,
          // COMBINED EMAIL PREVIEW + HTML BLOCK TARGETING (CRITICAL FIX)
          `.content-studio-preview.email-preview.sendgrid-preview .html-block ${trimmedSelector}`,
          `.content-studio-preview.email-preview.mailchimp-preview .html-block ${trimmedSelector}`,
          `.content-studio-preview.email-preview.generic-preview .html-block ${trimmedSelector}`,
          `.content-studio-preview.email-preview.accurate-email-preview .html-block ${trimmedSelector}`,
          // MEDIUM SPECIFICITY - Data block type targeting
          `[data-block-type="html"][data-block-type="html"] ${trimmedSelector}`,
          `[data-block-type="text"][data-block-type="text"] ${trimmedSelector}`,
          `[data-block-type="list"][data-block-type="list"] ${trimmedSelector}`,
          // EMAIL CONTAINER TARGETING
          `.email-container .html-block ${trimmedSelector}`,
          `.content-studio-preview .email-container ${trimmedSelector}`,
          `.email-preview .email-container ${trimmedSelector}`,
          `.clean-preview .email-container ${trimmedSelector}`,
          `.accurate-email-preview .email-container ${trimmedSelector}`,
          `.sendgrid-preview .email-container ${trimmedSelector}`,
          `.mailchimp-preview .email-container ${trimmedSelector}`,
          `.generic-preview .email-container ${trimmedSelector}`,
          // COMBINED EMAIL PREVIEW + EMAIL CONTAINER TARGETING
          `.content-studio-preview.email-preview.sendgrid-preview .email-container ${trimmedSelector}`,
          `.content-studio-preview.email-preview.mailchimp-preview .email-container ${trimmedSelector}`,
          `.content-studio-preview.email-preview.generic-preview .email-container ${trimmedSelector}`,
          `.content-studio-preview.email-preview.accurate-email-preview .email-container ${trimmedSelector}`,
          // DIRECT HTML BLOCK TARGETING
          `.html-block ${trimmedSelector}`,
        ];

        console.log(
          `✅ HTML CSS Injection: Processing mixed descendant selector ${trimmedSelector} for HTML content with FULL precedence`
        );
        return `${scopedSelectors.join(", ")} { ${enhancedDeclarations} }`;
      }

      // CRITICAL FIX: Handle global element styles for HTML content (ul li, p, h1, etc.)
      const isElementSelector = /^[a-zA-Z][a-zA-Z0-9]*$/.test(trimmedSelector);
      const isCommaList = trimmedSelector.includes(",");
      const hasSpaceSelectors =
        /\s/.test(trimmedSelector) && !trimmedSelector.includes("@");

      if (isElementSelector || isCommaList || hasSpaceSelectors) {
        // Parse comma-separated selectors and space-separated selectors
        const elementSelectors = trimmedSelector
          .split(",")
          .map((s: string) => s.trim());
        const validElementSelectors = elementSelectors.filter(
          (selector: string) => {
            // Process simple element selectors and basic descendant selectors like "ul li"
            const isSimpleElement = /^[a-zA-Z][a-zA-Z0-9]*$/.test(selector);
            const isDescendantSelector =
              /^[a-zA-Z][a-zA-Z0-9]*\s+[a-zA-Z][a-zA-Z0-9]*$/.test(selector);

            // Check if it's not a dangerous selector
            const firstElement = selector.split(/[\s:>+~]/)[0];
            const isDangerous = dangerousSelectors.includes(selector);

            return (isSimpleElement || isDescendantSelector) && !isDangerous;
          }
        );

        if (validElementSelectors.length === 0) {
          return "";
        }

        // CRITICAL: Make ALL CSS properties !important to ensure precedence
        const enhancedDeclarations = declarations
          .trim()
          // Split by semicolon and process each property
          .split(";")
          .map((prop: string) => {
            const trimmedProp = prop.trim();
            if (!trimmedProp) return "";

            // If already has !important, keep it as is
            if (trimmedProp.includes("!important")) {
              return trimmedProp;
            }

            // Add !important to every property
            return `${trimmedProp} !important`;
          })
          .filter(Boolean)
          .join("; ");

        // Create scoped selectors for HTML content with MAXIMUM SPECIFICITY
        const scopedSelectors = validElementSelectors.flatMap(
          (elementSelector: string) => [
            // ULTRA HIGH SPECIFICITY - HTML block targeting
            `.html-block.html-block ${elementSelector}`,
            // HIGH SPECIFICITY - Preview container + HTML block
            `.content-studio-preview .html-block.html-block ${elementSelector}`,
            `.email-preview .html-block.html-block ${elementSelector}`,
            `.clean-preview .html-block.html-block ${elementSelector}`,
            `.accurate-email-preview .html-block.html-block ${elementSelector}`,
            // EMAIL PLATFORM SPECIFICITY - Target specific email preview types
            `.sendgrid-preview .html-block.html-block ${elementSelector}`,
            `.mailchimp-preview .html-block.html-block ${elementSelector}`,
            `.generic-preview .html-block.html-block ${elementSelector}`,
            // COMBINED EMAIL PREVIEW + HTML BLOCK TARGETING (CRITICAL FIX)
            `.content-studio-preview.email-preview.sendgrid-preview .html-block ${elementSelector}`,
            `.content-studio-preview.email-preview.mailchimp-preview .html-block ${elementSelector}`,
            `.content-studio-preview.email-preview.generic-preview .html-block ${elementSelector}`,
            `.content-studio-preview.email-preview.accurate-email-preview .html-block ${elementSelector}`,
            // MEDIUM SPECIFICITY - Data block type targeting
            `[data-block-type="html"][data-block-type="html"] ${elementSelector}`,
            `[data-block-type="list"][data-block-type="list"] ${elementSelector}`,
            `[data-block-type="text"][data-block-type="text"] ${elementSelector}`,
            // ADDITIONAL SPECIFICITY - Email container targeting
            `.email-container .html-block ${elementSelector}`,
            `.content-studio-preview .email-container ${elementSelector}`,
            `.email-preview .email-container ${elementSelector}`,
            `.clean-preview .email-container ${elementSelector}`,
            `.accurate-email-preview .email-container ${elementSelector}`,
            `.sendgrid-preview .email-container ${elementSelector}`,
            `.mailchimp-preview .email-container ${elementSelector}`,
            `.generic-preview .email-container ${elementSelector}`,
            // COMBINED EMAIL PREVIEW + EMAIL CONTAINER TARGETING
            `.content-studio-preview.email-preview.sendgrid-preview .email-container ${elementSelector}`,
            `.content-studio-preview.email-preview.mailchimp-preview .email-container ${elementSelector}`,
            `.content-studio-preview.email-preview.generic-preview .email-container ${elementSelector}`,
            `.content-studio-preview.email-preview.accurate-email-preview .email-container ${elementSelector}`,
          ]
        );

        console.log(
          `✅ HTML CSS Injection: Processing element selector(s) ${validElementSelectors.join(", ")} for HTML content with FULL precedence`
        );
        return `${scopedSelectors.join(", ")} { ${enhancedDeclarations} }`;
      }

      return "";
    }
  );
};

export function StylesheetInjector({
  selectedStylesheetId,
}: StylesheetInjectorProps) {
  const [injectedStylesheetId, setInjectedStylesheetId] = useState<
    string | null
  >(null);

  // HOT-RELOAD OPTIMIZATION: Use refs to track style elements for efficient updates
  const styleElementRef = useRef<HTMLStyleElement | null>(null);
  const lastCSSContentRef = useRef<string>("");

  // Use the stylesheet data hook to get reactive updates when CSS is saved
  const { stylesheetData, loading, error } =
    useStylesheetData(selectedStylesheetId);

  // HOT-RELOAD OPTIMIZATION: Update existing style element content instead of DOM manipulation
  const updateStyleElementContent = (
    cssContent: string,
    stylesheetName: string
  ) => {
    if (!styleElementRef.current) {
      console.log(`⚠️ Style element ref not found for ${stylesheetName}`);
      return false; // Element doesn't exist, need to create it
    }

    // Check if CSS content actually changed to avoid unnecessary updates
    if (lastCSSContentRef.current === cssContent) {
      console.log(
        `⚡ CSS content unchanged for ${stylesheetName}, skipping update`
      );
      return true;
    }

    try {
      // ENHANCED: Generate both scoped CSS and HTML-content-specific CSS
      const scopedCSS = scopeCSS(cssContent);
      const htmlContentCSS = createHTMLContentCSS(cssContent);

      const combinedCSS = `
/* Hot-Reloaded Stylesheet: ${stylesheetName} */

/* Standard scoped CSS for wrapper elements */
${scopedCSS}

/* Enhanced CSS for HTML content inside dangerouslySetInnerHTML */
${htmlContentCSS}
`;

      // HOT-RELOAD: Update textContent instead of removing/re-adding element
      styleElementRef.current.textContent = combinedCSS;
      lastCSSContentRef.current = cssContent;

      console.log(
        `⚡ CSS Hot-Reload: Updated ${stylesheetName} without DOM manipulation`
      );
      console.log(`   - Preserved component state and prevented re-renders`);
      console.log(`   - CSS content length: ${cssContent.length} characters`);
      return true;
    } catch (error) {
      console.error(`Failed to hot-reload CSS for ${stylesheetName}:`, error);
      return false;
    }
  };

  // HOT-RELOAD OPTIMIZATION: Create style element only when needed
  const createStyleElement = (stylesheet: {
    id: string;
    name: string;
    cssContent: string;
    classes: any[];
  }) => {
    try {
      console.log(`💉 Creating CSS style element for: ${stylesheet.name}`);

      if (!stylesheet.cssContent) {
        console.warn(`No CSS content found for stylesheet: ${stylesheet.id}`);
        return;
      }

      // Create style element
      const styleElement = document.createElement("style");
      styleElement.id = `stylesheet-${stylesheet.id}`;
      styleElement.type = "text/css";

      // ENHANCED: Inject both scoped CSS and HTML-content-specific CSS
      const scopedCSS = scopeCSS(stylesheet.cssContent);
      const htmlContentCSS = createHTMLContentCSS(stylesheet.cssContent);

      const combinedCSS = `
/* Injected Stylesheet: ${stylesheet.name} */

/* Standard scoped CSS for wrapper elements */
${scopedCSS}

/* Enhanced CSS for HTML content inside dangerouslySetInnerHTML */
${htmlContentCSS}
`;

      styleElement.textContent = combinedCSS;

      // Inject into document head
      document.head.appendChild(styleElement);

      // HOT-RELOAD: Store references for efficient updates
      styleElementRef.current = styleElement;
      lastCSSContentRef.current = stylesheet.cssContent;
      setInjectedStylesheetId(stylesheet.id);

      console.log(
        `✅ Successfully injected CSS stylesheet: ${stylesheet.name}`
      );
      console.log(`   - ${stylesheet.classes.length} classes available`);
      console.log(
        `   - Classes: ${stylesheet.classes.map((c: any) => `.${c.name}`).join(", ")}`
      );
      console.log(`   - Optimized for hot-reload updates`);
    } catch (error) {
      console.error(`Failed to inject stylesheet ${stylesheet.id}:`, error);
    }
  };

  // HOT-RELOAD OPTIMIZATION: Remove style element and clear refs
  const removeStyleElement = (stylesheetId: string) => {
    const existingStyle = document.getElementById(`stylesheet-${stylesheetId}`);
    if (existingStyle) {
      existingStyle.remove();
      console.log(`🗑️ Removed stylesheet: ${stylesheetId}`);
    }

    // Clear refs
    styleElementRef.current = null;
    lastCSSContentRef.current = "";
    setInjectedStylesheetId(null);
  };

  useEffect(() => {
    // Remove previous stylesheet if different one is selected
    if (injectedStylesheetId && injectedStylesheetId !== selectedStylesheetId) {
      removeStyleElement(injectedStylesheetId);
    }

    // Inject new stylesheet if we have stylesheet data
    if (
      stylesheetData &&
      selectedStylesheetId &&
      selectedStylesheetId !== injectedStylesheetId
    ) {
      createStyleElement(stylesheetData);
    }

    // Remove stylesheet if none selected
    if (!selectedStylesheetId && injectedStylesheetId) {
      removeStyleElement(injectedStylesheetId);
    }
  }, [selectedStylesheetId, stylesheetData, injectedStylesheetId]);

  // HOT-RELOAD OPTIMIZATION: Re-inject CSS when stylesheet data changes (e.g., after saving CSS)
  useEffect(() => {
    if (
      stylesheetData?.cssContent &&
      selectedStylesheetId &&
      selectedStylesheetId === injectedStylesheetId
    ) {
      console.log(
        `🔄 Hot-reloading updated CSS for stylesheet: ${stylesheetData.name}`
      );
      console.log(
        `   - CSS content length: ${stylesheetData.cssContent.length}`
      );
      console.log(
        `   - Stylesheet data timestamp: ${(stylesheetData as any)._lastUpdated || "no timestamp"}`
      );

      // Try to update existing element first (hot-reload)
      const hotReloadSuccess = updateStyleElementContent(
        stylesheetData.cssContent,
        stylesheetData.name
      );

      // Fallback to full re-injection if hot-reload fails
      if (!hotReloadSuccess) {
        console.log(`⚠️ Hot-reload failed, falling back to full re-injection`);
        removeStyleElement(selectedStylesheetId);
        createStyleElement(stylesheetData);
      }
    }
  }, [
    stylesheetData?.cssContent,
    stylesheetData,
    selectedStylesheetId,
    injectedStylesheetId,
  ]);

  // CRITICAL FIX: Add a separate effect to handle CSS content changes from the editor
  // This ensures that CSS changes from the editor are immediately reflected in the preview
  useEffect(() => {
    if (
      stylesheetData?.cssContent &&
      selectedStylesheetId &&
      selectedStylesheetId === injectedStylesheetId &&
      styleElementRef.current
    ) {
      // Force update the style element content whenever CSS content changes
      const success = updateStyleElementContent(
        stylesheetData.cssContent,
        stylesheetData.name
      );

      if (!success) {
        console.log(`⚠️ Force CSS update failed, recreating style element`);
        removeStyleElement(selectedStylesheetId);
        createStyleElement(stylesheetData);
      }
    }
  }, [stylesheetData?.cssContent]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (injectedStylesheetId) {
        removeStyleElement(injectedStylesheetId);
        console.log(
          `🧹 Cleanup: Removed stylesheet on unmount: ${injectedStylesheetId}`
        );
      }
    };
  }, [injectedStylesheetId]);

  // Show loading/error states in development
  if (process.env.NODE_ENV === "development" && selectedStylesheetId) {
    if (loading) {
      console.log(`⏳ Loading stylesheet: ${selectedStylesheetId}`);
    }
    if (error) {
      console.error(
        `❌ Error loading stylesheet: ${selectedStylesheetId}`,
        error
      );
    }
  }

  // This component doesn't render anything
  return null;
}
