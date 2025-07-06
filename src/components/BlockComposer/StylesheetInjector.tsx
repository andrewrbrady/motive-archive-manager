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

      // Only scope CSS classes and be extremely specific about where they apply
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

      // Skip any other selector types (element selectors, etc.) to be safe
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

      // Only process CSS classes and scope them specifically to HTML block content
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
  }, [stylesheetData?.cssContent, selectedStylesheetId, injectedStylesheetId]);

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
