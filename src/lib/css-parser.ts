/**
 * CSS Parser Utility
 * Extracts class names and their properties from CSS stylesheets
 */

export interface CSSClass {
  name: string;
  selector: string;
  properties: { [key: string]: string };
  description?: string;
  category?: string;
}

export interface ParsedCSS {
  classes: CSSClass[];
  variables: { [key: string]: string };
  globalStyles: { [key: string]: string };
}

/**
 * Parse CSS content and extract class definitions
 */
export function parseCSS(cssContent: string): ParsedCSS {
  const classes: CSSClass[] = [];
  const variables: { [key: string]: string } = {};
  const globalStyles: { [key: string]: string } = {};

  // Remove comments
  const cleanedCSS = cssContent.replace(/\/\*[\s\S]*?\*\//g, "");

  // Extract CSS variables (custom properties)
  const variableMatches = cleanedCSS.matchAll(/--([^:]+):\s*([^;]+);/g);
  for (const match of variableMatches) {
    variables[match[1].trim()] = match[2].trim();
  }

  // Extract CSS rules
  const ruleRegex = /([^{}]+)\s*\{([^{}]*)\}/g;
  let match;

  while ((match = ruleRegex.exec(cleanedCSS)) !== null) {
    const selector = match[1].trim();
    const properties = match[2].trim();

    // Skip media queries and keyframes
    if (selector.includes("@media") || selector.includes("@keyframes")) {
      continue;
    }

    // Parse properties
    const parsedProperties: { [key: string]: string } = {};
    const propertyRegex = /([^:]+):\s*([^;]+);?/g;
    let propMatch;

    while ((propMatch = propertyRegex.exec(properties)) !== null) {
      const property = propMatch[1].trim();
      const value = propMatch[2].trim();
      parsedProperties[property] = value;
    }

    // Handle different selector types
    if (selector.startsWith(".")) {
      // Class selector
      const className = selector.replace(/^\./, "").split(/[\s:>+~]/)[0];

      classes.push({
        name: className,
        selector: selector,
        properties: parsedProperties,
        description: generateDescription(className, parsedProperties),
        category: categorizeClass(className, parsedProperties),
      });
    } else if (!selector.includes(".") && !selector.includes("#")) {
      // Element selector (body, h1, p, etc.)
      const elementName = selector.split(/[\s:>+~]/)[0];
      globalStyles[elementName] = JSON.stringify(parsedProperties);
    }
  }

  return {
    classes: classes.filter((cls) => cls.name), // Remove empty class names
    variables,
    globalStyles,
  };
}

/**
 * Generate a human-readable description for a CSS class
 */
function generateDescription(
  className: string,
  properties: { [key: string]: string }
): string {
  const descriptions: string[] = [];

  // Analyze properties to generate description
  if (properties["background-color"] || properties["background"]) {
    descriptions.push("background styling");
  }
  if (properties["color"]) {
    descriptions.push("text color");
  }
  if (
    properties["font-size"] ||
    properties["font-weight"] ||
    properties["font-family"]
  ) {
    descriptions.push("typography");
  }
  if (properties["padding"] || properties["margin"]) {
    descriptions.push("spacing");
  }
  if (properties["border"] || properties["border-radius"]) {
    descriptions.push("borders");
  }
  if (properties["display"] || properties["flex"] || properties["grid"]) {
    descriptions.push("layout");
  }
  if (properties["text-align"]) {
    descriptions.push("text alignment");
  }

  // Use class name hints
  if (className.includes("button") || className.includes("btn")) {
    descriptions.unshift("button");
  } else if (className.includes("header")) {
    descriptions.unshift("header");
  } else if (className.includes("footer")) {
    descriptions.unshift("footer");
  } else if (className.includes("title") || className.includes("heading")) {
    descriptions.unshift("heading");
  } else if (className.includes("text") || className.includes("content")) {
    descriptions.unshift("text content");
  } else if (className.includes("container") || className.includes("wrapper")) {
    descriptions.unshift("container");
  }

  return descriptions.length > 0 ? descriptions.join(", ") : "custom styling";
}

/**
 * Categorize CSS classes for better organization
 */
function categorizeClass(
  className: string,
  properties: { [key: string]: string }
): string {
  // Button-related
  if (
    className.includes("button") ||
    className.includes("btn") ||
    className.includes("cta")
  ) {
    return "buttons";
  }

  // Layout-related
  if (
    className.includes("container") ||
    className.includes("wrapper") ||
    className.includes("section") ||
    className.includes("grid")
  ) {
    return "layout";
  }

  // Typography-related
  if (
    className.includes("title") ||
    className.includes("heading") ||
    className.includes("text") ||
    properties["font-size"] ||
    properties["font-weight"] ||
    properties["font-family"]
  ) {
    return "typography";
  }

  // Header/Footer
  if (
    className.includes("header") ||
    className.includes("footer") ||
    className.includes("nav")
  ) {
    return "structure";
  }

  // Interactive elements
  if (
    className.includes("link") ||
    className.includes("hover") ||
    className.includes("active")
  ) {
    return "interactive";
  }

  // Check properties for categorization
  if (properties["background-color"] || properties["background"]) {
    return "backgrounds";
  }

  if (
    properties["border"] ||
    properties["border-radius"] ||
    properties["box-shadow"]
  ) {
    return "decorative";
  }

  return "general";
}

/**
 * Filter classes by category
 */
export function filterClassesByCategory(
  classes: CSSClass[],
  category: string
): CSSClass[] {
  return classes.filter((cls) => cls.category === category);
}

/**
 * Get all available categories from a set of classes
 */
export function getAvailableCategories(classes: CSSClass[]): string[] {
  const categories = new Set(classes.map((cls) => cls.category || "general"));
  return Array.from(categories).sort();
}

/**
 * Search classes by name or description
 */
export function searchClasses(classes: CSSClass[], query: string): CSSClass[] {
  const lowerQuery = query.toLowerCase();
  return classes.filter(
    (cls) =>
      cls.name.toLowerCase().includes(lowerQuery) ||
      cls.description?.toLowerCase().includes(lowerQuery) ||
      cls.selector.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Convert CSS class to inline styles for preview
 */
export function classToInlineStyles(cssClass: CSSClass): React.CSSProperties {
  const styles: React.CSSProperties = {};

  for (const [property, value] of Object.entries(cssClass.properties)) {
    // Convert CSS property names to camelCase for React
    const camelCaseProperty = property.replace(/-([a-z])/g, (match, letter) =>
      letter.toUpperCase()
    );

    // Apply styles using any type to handle dynamic CSS properties
    (styles as any)[camelCaseProperty] = value;
  }

  return styles;
}

/**
 * Process CSS content for email compatibility (same as email export)
 * Removes only the most problematic patterns while preserving legitimate CSS
 */
export function processStylesheetForEmail(cssContent: string): string {
  if (!cssContent) return "";

  // Remove .content-studio-preview scoping
  let processedCSS = cssContent.replace(/\.content-studio-preview\s+/g, "");

  // Remove only specific properties that don't work in email (safer approach)
  processedCSS = processedCSS.replace(/^\s*transform\s*:[^;]+;/gm, "");
  processedCSS = processedCSS.replace(/^\s*animation\s*:[^;]+;/gm, "");
  processedCSS = processedCSS.replace(/^\s*transition\s*:[^;]+;/gm, "");

  return processedCSS;
}

/**
 * Process CSS specifically for SendGrid (same as email export)
 * Minimal processing to avoid corruption while removing only truly problematic patterns
 */
export function processEmailCSSForSendGrid(cssContent: string): string {
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

  return processedCSS;
}

/**
 * Process CSS classes for email preview to match email export
 */
export function processClassForEmailPreview(
  cssClass: CSSClass,
  emailPlatform: string = "generic"
): CSSClass {
  if (!cssClass) return cssClass;

  const processedProperties: { [key: string]: string } = {};

  // Process each property based on email platform
  for (const [property, value] of Object.entries(cssClass.properties)) {
    // Skip properties that don't work in email
    if (
      property === "transform" ||
      property === "animation" ||
      property === "transition"
    ) {
      continue;
    }

    // For SendGrid, be more restrictive
    if (emailPlatform === "sendgrid") {
      // Skip complex properties that SendGrid doesn't handle well
      if (property.includes("@") || property.includes("var(")) {
        continue;
      }
    }

    // Keep valid properties
    processedProperties[property] = value;
  }

  return {
    ...cssClass,
    properties: processedProperties,
  };
}

/**
 * Convert CSS class to inline styles for email preview with processing
 */
export function classToEmailInlineStyles(
  cssClass: CSSClass,
  emailPlatform: string = "generic"
): React.CSSProperties {
  const processedClass = processClassForEmailPreview(cssClass, emailPlatform);
  return classToInlineStyles(processedClass);
}

/**
 * Parse CSS content specifically for email preview
 */
export function parseEmailCSS(
  cssContent: string,
  emailPlatform: string = "generic"
): ParsedCSS {
  // Process the CSS content first
  const processedCSS =
    emailPlatform === "sendgrid"
      ? processEmailCSSForSendGrid(cssContent)
      : processStylesheetForEmail(cssContent);

  // Parse the processed CSS
  const parsedCSS = parseCSS(processedCSS);

  // Return the parsed CSS with processed classes
  return {
    ...parsedCSS,
    classes: parsedCSS.classes.map((cls) =>
      processClassForEmailPreview(cls, emailPlatform)
    ),
  };
}
