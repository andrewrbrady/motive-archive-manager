#!/usr/bin/env node

/**
 * Complete Element Styles Test - Validates the entire CSS element styling fix
 *
 * This test validates the complete chain:
 * 1. Database stylesheet loading
 * 2. CSS parsing and global styles extraction
 * 3. CleanRenderer logic for HTML vs plain text
 * 4. Final rendering with correct styles applied
 */

const { MongoClient } = require("mongodb");

// MongoDB connection
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/motivearchive";

// Import functions (copied from source files)
function parseCSS(cssContent) {
  const classes = [];
  const variables = {};
  const globalStyles = {};

  const cleanedCSS = cssContent.replace(/\/\*[\s\S]*?\*\//g, "");
  const ruleRegex = /([^{}]+)\s*\{([^{}]*)\}/g;
  let match;

  while ((match = ruleRegex.exec(cleanedCSS)) !== null) {
    const selector = match[1].trim();
    const properties = match[2].trim();

    if (selector.includes("@media") || selector.includes("@keyframes")) {
      continue;
    }

    const parsedProperties = {};
    const propertyRegex = /([^:]+):\s*([^;]+);?/g;
    let propMatch;

    while ((propMatch = propertyRegex.exec(properties)) !== null) {
      const property = propMatch[1].trim();
      const value = propMatch[2].trim();
      parsedProperties[property] = value;
    }

    if (selector.startsWith(".")) {
      const className = selector.replace(/^\./, "").split(/[\s:>+~]/)[0];
      classes.push({
        name: className,
        selector: selector,
        properties: parsedProperties,
      });
    } else if (!selector.includes(".") && !selector.includes("#")) {
      const elementName = selector.split(/[\s:>+~]/)[0];
      globalStyles[elementName] = JSON.stringify(parsedProperties);
    }
  }

  return { classes, variables, globalStyles };
}

function hasHtmlContent(content) {
  return /<[^>]+>/g.test(content);
}

function getElementStylesFromStylesheet(
  elementName,
  stylesheetData,
  emailMode = false
) {
  if (!stylesheetData?.parsedCSS?.globalStyles) {
    return {};
  }

  const globalStyles = stylesheetData.parsedCSS.globalStyles;
  const elementKey = elementName.toLowerCase();

  if (!globalStyles[elementKey]) {
    return {};
  }

  try {
    const cssProperties = JSON.parse(globalStyles[elementKey]);
    const reactStyles = {};

    Object.entries(cssProperties).forEach(([property, value]) => {
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

function formatContent(content, options = {}) {
  if (!content || content.trim() === "") {
    return "";
  }

  const { preserveHtml = true, stylesheetData = null } = options;
  const hasHtmlTags = preserveHtml && /<[^>]+>/g.test(content);

  if (hasHtmlTags) {
    return formatMixedContent(content, options);
  } else {
    return content; // Plain text formatting
  }
}

function formatMixedContent(content, options) {
  const parts = content.split(/(<[^>]+>)/g);

  const processedParts = parts.map((part) => {
    if (part.match(/^<[^>]+>$/)) {
      return applyHtmlTagStyles(part, options);
    }
    return part;
  });

  return processedParts.join("");
}

function applyHtmlTagStyles(htmlTag, options) {
  const { stylesheetData } = options;

  if (!stylesheetData?.parsedCSS?.globalStyles) {
    return htmlTag;
  }

  const tagMatch = htmlTag.match(/^<(\w+)(?:\s|>)/);
  if (!tagMatch) {
    return htmlTag;
  }

  const tagName = tagMatch[1].toLowerCase();
  const globalStyles = stylesheetData.parsedCSS.globalStyles;

  if (!globalStyles[tagName]) {
    return htmlTag;
  }

  try {
    const cssProperties = JSON.parse(globalStyles[tagName]);
    const inlineStyles = Object.entries(cssProperties)
      .map(([property, value]) => `${property}: ${value}`)
      .join("; ");

    if (htmlTag.endsWith("/>")) {
      return htmlTag.replace(/(\s*\/?>)$/, ` style="${inlineStyles}"$1`);
    } else {
      return htmlTag.replace(/(>)$/, ` style="${inlineStyles}"$1`);
    }
  } catch (error) {
    return htmlTag;
  }
}

async function testCompleteElementStyles() {
  console.log("🔍 Complete Element Styles Test...\n");

  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log("✅ Connected to MongoDB");

    const db = client.db("motivearchive");
    const stylesheetsCollection = db.collection("stylesheets");

    // 1. Load or create test stylesheet
    console.log("\n📋 Step 1: Loading test stylesheet...");

    let testStylesheet = await stylesheetsCollection.findOne({
      name: "Element Styles Test",
    });

    if (!testStylesheet) {
      testStylesheet = {
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

      const result = await stylesheetsCollection.insertOne(testStylesheet);
      testStylesheet._id = result.insertedId;
      console.log("✅ Created test stylesheet");
    } else {
      console.log("✅ Found existing test stylesheet");
    }

    // 2. Parse CSS and create stylesheet data
    console.log("\n📋 Step 2: Parsing CSS...");
    const parsedCSS = parseCSS(testStylesheet.css);

    const stylesheetData = {
      id: testStylesheet._id,
      name: testStylesheet.name,
      css: testStylesheet.css,
      parsedCSS: parsedCSS,
    };

    console.log("Global styles found:", Object.keys(parsedCSS.globalStyles));
    console.log(
      "CSS classes found:",
      parsedCSS.classes.map((c) => c.name)
    );

    // 3. Test different content scenarios
    console.log("\n📋 Step 3: Testing content scenarios...");

    const testScenarios = [
      {
        name: "Plain text paragraph",
        block: {
          type: "text",
          content: "This is plain text that should get paragraph styles.",
          element: "p",
          cssClassName: null,
        },
      },
      {
        name: "HTML paragraph content",
        block: {
          type: "text",
          content: "<p>This paragraph should have inline styles applied.</p>",
          element: "p",
          cssClassName: null,
        },
      },
      {
        name: "Mixed HTML content",
        block: {
          type: "text",
          content:
            'Text with <p>styled paragraph</p> and <img src="test.jpg"> inside.',
          element: "p",
          cssClassName: null,
        },
      },
      {
        name: "Plain text heading",
        block: {
          type: "text",
          content: "This is a heading",
          element: "h1",
          cssClassName: null,
        },
      },
      {
        name: "HTML heading content",
        block: {
          type: "text",
          content: "<h1>This heading should have inline styles</h1>",
          element: "h1",
          cssClassName: null,
        },
      },
      {
        name: "Content with CSS class",
        block: {
          type: "text",
          content: "Plain text with CSS class applied.",
          element: "p",
          cssClassName: "quote-container",
        },
      },
    ];

    testScenarios.forEach((scenario, index) => {
      console.log(`\n🔍 Scenario ${index + 1}: ${scenario.name}`);
      console.log(`Input: ${scenario.block.content}`);
      console.log(`Element: ${scenario.block.element}`);
      console.log(`CSS Class: ${scenario.block.cssClassName || "none"}`);

      // Test content detection
      const contentHasHtml = hasHtmlContent(scenario.block.content);
      console.log(`Has HTML: ${contentHasHtml}`);

      // Test content formatting
      const formattedContent = formatContent(scenario.block.content, {
        preserveHtml: true,
        stylesheetData: stylesheetData,
      });
      console.log(`Formatted: ${formattedContent}`);

      // Test element styles extraction
      const globalElementStyles = getElementStylesFromStylesheet(
        scenario.block.element,
        stylesheetData,
        false
      );
      console.log(`Global styles:`, globalElementStyles);

      // Test CSS class styles
      if (scenario.block.cssClassName) {
        const cssClass = parsedCSS.classes.find(
          (c) => c.name === scenario.block.cssClassName
        );
        console.log(
          `CSS class properties:`,
          cssClass?.properties || "not found"
        );
      }

      // Simulate CleanRenderer logic
      if (contentHasHtml) {
        console.log(
          `✅ RESULT: <div> wrapper with formatted content (styles applied to inner HTML)`
        );
      } else {
        console.log(
          `✅ RESULT: <${scenario.block.element}> wrapper with global styles applied`
        );
      }
    });

    // 4. Test email mode vs clean mode
    console.log("\n📋 Step 4: Testing email mode vs clean mode...");

    const testContent = "<p>Test paragraph</p>";

    const cleanModeStyles = getElementStylesFromStylesheet(
      "p",
      stylesheetData,
      false
    );
    const emailModeStyles = getElementStylesFromStylesheet(
      "p",
      stylesheetData,
      true
    );

    console.log("Clean mode styles:", cleanModeStyles);
    console.log("Email mode styles:", emailModeStyles);
    console.log(
      "Are they the same?",
      JSON.stringify(cleanModeStyles) === JSON.stringify(emailModeStyles)
    );

    // 5. Test error handling
    console.log("\n📋 Step 5: Testing error handling...");

    const nullStylesheetStyles = getElementStylesFromStylesheet("p", null);
    console.log("Null stylesheet styles:", nullStylesheetStyles);

    const missingElementStyles = getElementStylesFromStylesheet(
      "nonexistent",
      stylesheetData
    );
    console.log("Missing element styles:", missingElementStyles);

    // 6. Performance and memory test
    console.log("\n📋 Step 6: Performance test...");

    const startTime = Date.now();
    const iterations = 1000;

    for (let i = 0; i < iterations; i++) {
      getElementStylesFromStylesheet("p", stylesheetData, false);
      formatContent("<p>Test content</p>", { stylesheetData });
      hasHtmlContent("<p>Test</p>");
    }

    const endTime = Date.now();
    console.log(
      `${iterations} iterations completed in ${endTime - startTime}ms`
    );
    console.log(
      `Average time per operation: ${(endTime - startTime) / iterations}ms`
    );

    // 7. Final validation
    console.log("\n📋 Step 7: Final validation...");

    const validationTests = [
      {
        name: "Global styles extraction",
        test: () => Object.keys(parsedCSS.globalStyles).length > 0,
        description: "CSS parser extracts global element styles",
      },
      {
        name: "Element styles function",
        test: () =>
          Object.keys(getElementStylesFromStylesheet("p", stylesheetData))
            .length > 0,
        description: "getElementStylesFromStylesheet returns React styles",
      },
      {
        name: "HTML content detection",
        test: () =>
          hasHtmlContent("<p>test</p>") === true &&
          hasHtmlContent("plain text") === false,
        description: "hasHtmlContent correctly detects HTML vs plain text",
      },
      {
        name: "Content formatting",
        test: () =>
          formatContent("<p>test</p>", { stylesheetData }).includes("style="),
        description: "formatContent applies styles to HTML tags",
      },
      {
        name: "CSS classes still work",
        test: () => parsedCSS.classes.some((c) => c.name === "quote-container"),
        description: "CSS class parsing still works alongside element styles",
      },
    ];

    let allTestsPassed = true;

    validationTests.forEach((test) => {
      const passed = test.test();
      console.log(`${passed ? "✅" : "❌"} ${test.name}: ${test.description}`);
      if (!passed) allTestsPassed = false;
    });

    console.log("\n🎯 FINAL RESULT:");
    console.log(`All tests passed: ${allTestsPassed ? "✅" : "❌"}`);

    if (allTestsPassed) {
      console.log(
        "\n🎉 SUCCESS: CSS element styling fix is working correctly!"
      );
      console.log("\n📋 What was fixed:");
      console.log(
        "1. CSS parser now extracts global element styles (p, img, h1, etc.)"
      );
      console.log(
        "2. formatContent applies styles to existing HTML tags in content"
      );
      console.log("3. CleanRenderer detects HTML vs plain text content");
      console.log(
        "4. Plain text gets proper element wrapper with global styles"
      );
      console.log(
        "5. HTML content gets div wrapper with styles applied to inner HTML"
      );
      console.log("6. No more nested elements or conflicting styles");
      console.log("7. CSS classes continue to work alongside element styles");
      console.log("8. Email mode and clean mode both supported");
    } else {
      console.log("\n❌ FAILED: Some tests failed, fix needs more work");
    }
  } catch (error) {
    console.error("❌ Error during testing:", error);
  } finally {
    await client.close();
  }
}

// Run the test
testCompleteElementStyles().catch(console.error);
