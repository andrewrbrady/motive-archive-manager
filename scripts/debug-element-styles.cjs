#!/usr/bin/env node

/**
 * Debug Element Styles - Test CSS element styling functionality
 *
 * This script tests the entire chain:
 * 1. Stylesheet data loading
 * 2. CSS parsing and globalStyles extraction
 * 3. getElementStylesFromStylesheet function
 * 4. Style application in components
 */

const { MongoClient } = require("mongodb");

// MongoDB connection
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/motivearchive";

/**
 * Parse CSS content and extract class definitions (copied from src/lib/css-parser.ts)
 */
function parseCSS(cssContent) {
  const classes = [];
  const variables = {};
  const globalStyles = {};

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
    const parsedProperties = {};
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
function generateDescription(className, properties) {
  const descriptions = [];

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
function categorizeClass(className, properties) {
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

  return "general";
}

/**
 * Get CSS styles for an HTML element from stylesheet data (copied from src/lib/content-formatter.ts)
 */
function getElementStylesFromStylesheet(
  elementName,
  stylesheetData,
  emailMode = false
) {
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
    const reactStyles = {};

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

      reactStyles[camelCaseProperty] = value;
    });

    return reactStyles;
  } catch (error) {
    console.warn(`Failed to parse styles for ${elementName}:`, error);
    return {};
  }
}

async function testElementStyles() {
  console.log("🔍 Testing CSS Element Styles Chain...\n");

  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log("✅ Connected to MongoDB");

    const db = client.db("motivearchive");
    const stylesheetsCollection = db.collection("stylesheets");

    // 1. Load stylesheet data
    console.log("\n📋 Step 1: Loading stylesheet data...");
    const stylesheets = await stylesheetsCollection.find({}).toArray();
    console.log(`Found ${stylesheets.length} stylesheets`);

    if (stylesheets.length === 0) {
      console.log("❌ No stylesheets found. Creating test stylesheet...");

      // Create test stylesheet with element styles
      const testStylesheet = {
        name: "Element Styles Test",
        css: `
          p {
            margin-bottom: 100px;
            color: #333;
            font-size: 16px;
            line-height: 1.6;
          }
          
          img {
            max-width: 100% !important;
            width: 100% !important;
            height: auto !important;
            display: block !important;
            margin-bottom: 40px !important;
          }
          
          h1 {
            font-size: 2.5rem;
            font-weight: bold;
            color: #000;
            margin-bottom: 20px;
          }
          
          .quote-container {
            background: #f5f5f5;
            padding: 20px;
            border-left: 4px solid #007cba;
            margin: 20px 0;
          }
        `,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await stylesheetsCollection.insertOne(testStylesheet);
      console.log("✅ Created test stylesheet");

      // Reload stylesheets
      const updatedStylesheets = await stylesheetsCollection.find({}).toArray();
      stylesheets.push(...updatedStylesheets);
    }

    // Test with first stylesheet
    const testStylesheet = stylesheets[0];
    console.log(`\n🎯 Testing with stylesheet: ${testStylesheet.name}`);
    console.log(
      "CSS content (first 200 chars):",
      testStylesheet.css.substring(0, 200) + "..."
    );

    // 2. Parse CSS and extract global styles
    console.log("\n📋 Step 2: Parsing CSS and extracting global styles...");
    const parsedCSS = parseCSS(testStylesheet.css);

    console.log("Classes found:", parsedCSS.classes.length);
    console.log("Global styles found:", Object.keys(parsedCSS.globalStyles));

    console.log("\n🔍 Global styles details:");
    Object.entries(parsedCSS.globalStyles).forEach(([element, styles]) => {
      console.log(`  ${element}:`, styles);
    });

    // 3. Test getElementStylesFromStylesheet function
    console.log(
      "\n📋 Step 3: Testing getElementStylesFromStylesheet function..."
    );

    // Create stylesheet data object (mimics what useStylesheetData returns)
    const stylesheetData = {
      id: testStylesheet._id,
      name: testStylesheet.name,
      css: testStylesheet.css,
      parsedCSS: parsedCSS,
    };

    // Test paragraph styles
    const paragraphStyles = getElementStylesFromStylesheet("p", stylesheetData);
    console.log("Paragraph styles:", paragraphStyles);

    // Test image styles
    const imageStyles = getElementStylesFromStylesheet("img", stylesheetData);
    console.log("Image styles:", imageStyles);

    // Test heading styles
    const headingStyles = getElementStylesFromStylesheet("h1", stylesheetData);
    console.log("Heading styles:", headingStyles);

    // Test email mode
    const emailParagraphStyles = getElementStylesFromStylesheet(
      "p",
      stylesheetData,
      true
    );
    console.log("Email paragraph styles:", emailParagraphStyles);

    // 4. Test style application in different scenarios
    console.log("\n📋 Step 4: Testing style application scenarios...");

    // Test plain text content (should get wrapped and styled)
    const plainTextContent =
      "This is plain text that should get paragraph styles applied.";
    console.log("Plain text content:", plainTextContent);

    // Test HTML content (should preserve HTML and apply styles)
    const htmlContent =
      "<p>This is HTML content that should preserve structure.</p>";
    console.log("HTML content:", htmlContent);

    // Test mixed content
    const mixedContent =
      "Regular text with <strong>bold</strong> and <em>italic</em> formatting.";
    console.log("Mixed content:", mixedContent);

    // 5. Test CSS class styles (should still work)
    console.log("\n📋 Step 5: Testing CSS class styles (should still work)...");

    const quoteClass = parsedCSS.classes.find(
      (cls) => cls.name === "quote-container"
    );
    if (quoteClass) {
      console.log("Quote class found:", quoteClass.properties);
    } else {
      console.log("❌ Quote class not found");
    }

    // 6. Simulate component rendering
    console.log("\n📋 Step 6: Simulating component rendering...");

    // Simulate what happens in CleanRenderer for a text block
    const textBlock = {
      id: "test-text-block",
      type: "text",
      content: "This is a test paragraph that should have bottom margin.",
      element: "p",
      cssClassName: null,
      order: 1,
    };

    console.log("Text block:", textBlock);

    // Get global element styles (this is what CleanRenderer does)
    const globalElementStyles = getElementStylesFromStylesheet(
      textBlock.element,
      stylesheetData,
      false // previewMode !== "email"
    );

    console.log("Global element styles for text block:", globalElementStyles);

    // Test image block
    const imageBlock = {
      id: "test-image-block",
      type: "image",
      imageUrl: "https://example.com/image.jpg",
      cssClassName: null,
      order: 2,
    };

    const globalImgStyles = getElementStylesFromStylesheet(
      "img",
      stylesheetData,
      false
    );

    console.log("Global img styles for image block:", globalImgStyles);

    // 7. Test error cases
    console.log("\n📋 Step 7: Testing error cases...");

    // Test with null stylesheet data
    const nullStyles = getElementStylesFromStylesheet("p", null);
    console.log("Null stylesheet styles:", nullStyles);

    // Test with missing element
    const missingStyles = getElementStylesFromStylesheet(
      "nonexistent",
      stylesheetData
    );
    console.log("Missing element styles:", missingStyles);

    // Test with corrupted global styles
    const corruptedStylesheetData = {
      parsedCSS: {
        globalStyles: {
          p: "invalid-json",
        },
      },
    };

    const corruptedStyles = getElementStylesFromStylesheet(
      "p",
      corruptedStylesheetData
    );
    console.log("Corrupted styles (should be empty):", corruptedStyles);

    console.log("\n✅ Element styles testing completed!");
    console.log("\n🎯 KEY FINDINGS:");
    console.log(
      "1. Global styles extracted:",
      Object.keys(parsedCSS.globalStyles).length > 0 ? "✅" : "❌"
    );
    console.log(
      "2. getElementStylesFromStylesheet works:",
      Object.keys(paragraphStyles).length > 0 ? "✅" : "❌"
    );
    console.log(
      "3. Image styles extracted:",
      Object.keys(imageStyles).length > 0 ? "✅" : "❌"
    );
    console.log("4. CSS classes still work:", quoteClass ? "✅" : "❌");

    // Additional debugging - let's check what the real user stylesheet looks like
    console.log("\n📋 Additional Debug: Real User Stylesheet...");

    // Find stylesheet that might have actual p and img styles
    const userStylesheet = stylesheets.find(
      (s) => s.css && s.css.includes("p {")
    );
    if (userStylesheet) {
      console.log(
        `Found user stylesheet with p styles: ${userStylesheet.name}`
      );
      console.log(
        "User CSS (first 500 chars):",
        userStylesheet.css.substring(0, 500) + "..."
      );

      const userParsedCSS = parseCSS(userStylesheet.css);
      console.log(
        "User global styles:",
        Object.keys(userParsedCSS.globalStyles)
      );

      const userStylesheetData = {
        id: userStylesheet._id,
        name: userStylesheet.name,
        css: userStylesheet.css,
        parsedCSS: userParsedCSS,
      };

      const userParagraphStyles = getElementStylesFromStylesheet(
        "p",
        userStylesheetData
      );
      console.log("User paragraph styles:", userParagraphStyles);

      const userImageStyles = getElementStylesFromStylesheet(
        "img",
        userStylesheetData
      );
      console.log("User image styles:", userImageStyles);
    } else {
      console.log("No user stylesheet found with p styles");
    }
  } catch (error) {
    console.error("❌ Error during testing:", error);
  } finally {
    await client.close();
  }
}

// Run the test
testElementStyles().catch(console.error);
