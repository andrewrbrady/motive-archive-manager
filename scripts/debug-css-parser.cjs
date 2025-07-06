// Debug script to test CSS parser with user's actual CSS content

// Mock CSS parser functions (simplified version)
function mockParseCSS(cssContent) {
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

// User's actual CSS content
const userCSS = `
/* ---------- Reset & Base ---------- */
* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,
               Ubuntu, Cantarell, sans-serif;
  line-height: 1.6;
  color: #333333;
  background: #f5f5f5;
  padding: 20px;
}

h1, h2, h3 { font-weight: 600; line-height: 1.2; }

/* ---------- Container & Layout ---------- */
.email-container {
  max-width: 600px;
  margin: 0 auto;
  background: #ffffff;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, .1);
  overflow: hidden;
}

.content       { padding: 20px 10px; }
.header        { text-align: center; }
.logo          { border: 0; display: inline-block; }
p {
  margin-bottom:100px;
}

.intro-text    { font-size: 40px; font-weight: 700; color: #2c2c2c; margin: 0 0 30px; text-align: center; }
.quote-container{
  margin: 40px 0 40px 0;
  font-size: 36px;
  line-height:1.1;
  font-weight: 300;
  color: #444444;
  text-align: center;
}

/* ---------- Images ---------- */
img {
  max-width: 100% !important;
  width: 100% !important;
  height: auto !important;
  display: block !important;
  margin-bottom: 40px !important;
}

/* ---------- App Promo / Features ---------- */
.app-promo              { text-align: center; margin: 40px 0; }
.app-promo h2           { font-size: 32px; margin-bottom: 18px; }
.app-promo p            { font-size: 24px; font-weight: 300; line-height: 1.2; }
`;

console.log("🧪 Testing CSS Parser with User's CSS");
console.log("=====================================\n");

const parsedCSS = mockParseCSS(userCSS);

console.log("📋 Parsed CSS Results:");
console.log("=====================\n");

console.log("🔍 Global Styles (HTML Elements):");
console.log("----------------------------------");
Object.entries(parsedCSS.globalStyles).forEach(([element, styles]) => {
  console.log(`${element}:`, styles);
  try {
    const parsed = JSON.parse(styles);
    console.log(`  Parsed ${element} styles:`, parsed);
  } catch (e) {
    console.log(`  Error parsing ${element} styles:`, e.message);
  }
});

console.log("\n🎯 Specific Elements We Care About:");
console.log("-----------------------------------");
console.log("P tag styles:", parsedCSS.globalStyles["p"] || "NOT FOUND");
console.log("IMG tag styles:", parsedCSS.globalStyles["img"] || "NOT FOUND");
console.log("BODY tag styles:", parsedCSS.globalStyles["body"] || "NOT FOUND");

console.log("\n📊 CSS Classes Found:");
console.log("---------------------");
parsedCSS.classes.forEach((cls) => {
  console.log(`${cls.name}: ${cls.selector}`);
  console.log(`  Properties:`, cls.properties);
});

console.log("\n🧪 Testing Content Formatting with Parsed CSS:");
console.log("==============================================");

// Test the parsed CSS with content formatting
const testStylesheetData = {
  parsedCSS: parsedCSS,
};

console.log("Final stylesheet data structure:");
console.log(JSON.stringify(testStylesheetData, null, 2));
