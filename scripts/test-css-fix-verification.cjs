// Test the FIXED CSS processing functions
const fs = require("fs");
const path = require("path");

// Test CSS with various scenarios
const testCSS = `
.email-container {
  color: #1a1a1a;
  background-color: #ffffff;
  text-align: center;
  border-color: #ff0000;
  text-decoration-color: #abcdef;
}

#badIdSelector {
  color: #000000;
  background: #cccccc;
}

.header {
  color: #333333;
  background-color: #f5f5f5;
}

.header:hover {
  background-color: #e0e0e0;
}

.test-class {
  color: #123456;
  background-color: #789abc;
  border: 1px solid #def012;
}

[data-attribute] {
  color: #456789;
}

@import url('https://fonts.googleapis.com/css2?family=Roboto');
`;

// SIMPLIFIED CSS processing functions
function processStylesheetForEmail(cssContent) {
  if (!cssContent) return "";

  // Remove .content-studio-preview scoping
  let processedCSS = cssContent.replace(/\.content-studio-preview\s+/g, "");

  // Remove only specific properties that don't work in email (safer approach)
  processedCSS = processedCSS.replace(/^\s*transform\s*:[^;]+;/gm, "");
  processedCSS = processedCSS.replace(/^\s*animation\s*:[^;]+;/gm, "");
  processedCSS = processedCSS.replace(/^\s*transition\s*:[^;]+;/gm, "");

  return processedCSS;
}

function processEmailCSSForSendGrid(cssContent) {
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

  // That's it - no more aggressive processing that can corrupt legitimate CSS
  return processedCSS;
}

// Test function
function testFixedFunctions() {
  console.log("CSS CORRUPTION FIX VERIFICATION");
  console.log("================================");

  console.log("\nOriginal CSS:");
  console.log(testCSS);

  const step1 = processStylesheetForEmail(testCSS);
  console.log("\nAfter processStylesheetForEmail():");
  console.log(step1);

  const step2 = processEmailCSSForSendGrid(testCSS);
  console.log("\nAfter processEmailCSSForSendGrid():");
  console.log(step2);

  // Check for hex color preservation
  const hexColorRegex = /#[a-fA-F0-9]{3,6}/g;
  const originalHexColors = testCSS.match(hexColorRegex);
  const finalHexColors = step2.match(hexColorRegex);

  console.log("\n=== HEX COLOR PRESERVATION TEST ===");
  console.log("Original hex colors:", originalHexColors);
  console.log("Final hex colors:", finalHexColors);

  if (originalHexColors && finalHexColors) {
    const preservedCount = finalHexColors.length;
    const originalCount = originalHexColors.length;
    console.log(
      `Preserved ${preservedCount} out of ${originalCount} hex colors`
    );

    if (preservedCount === originalCount) {
      console.log("✅ All hex colors preserved!");
    } else {
      console.log("❌ Some hex colors were lost");
    }
  }

  // Check that unwanted selectors were removed
  const hasIdSelector = step2.includes("#badIdSelector");
  const hasAttributeSelector = step2.includes("[data-attribute]");
  const hasImport = step2.includes("@import");
  const hasHover = step2.includes(":hover");

  console.log("\n=== UNWANTED SELECTOR REMOVAL TEST ===");
  console.log("ID selector removed:", !hasIdSelector ? "✅" : "❌");
  console.log(
    "Attribute selector removed:",
    !hasAttributeSelector ? "✅" : "❌"
  );
  console.log("@import removed:", !hasImport ? "✅" : "❌");
  console.log(":hover removed:", !hasHover ? "✅" : "❌");

  // Check for specific corruption patterns
  const corruptionPatterns = [
    /color:\s*;/g, // color property without value
    /background-color:\s*;/g, // background-color without value
    /border-color:\s*;/g, // border-color without value
    /text-\s+color/g, // hyphenated property with space
    /background-\s+color/g, // hyphenated property with space
  ];

  console.log("\n=== CORRUPTION PATTERN CHECK ===");
  let hasCorruption = false;
  corruptionPatterns.forEach((pattern, index) => {
    const matches = step2.match(pattern);
    if (matches) {
      console.log(`❌ Corruption pattern ${index + 1} found:`, matches);
      hasCorruption = true;
    }
  });

  if (!hasCorruption) {
    console.log("✅ No corruption patterns detected");
  }

  return step2;
}

// Run the test
const result = testFixedFunctions();

// Save the result
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const outputFile = path.join(
  __dirname,
  `css-fix-verification-${timestamp}.log`
);

const logContent = `
CSS CORRUPTION FIX VERIFICATION RESULTS
Generated: ${new Date().toISOString()}

=== ORIGINAL CSS ===
${testCSS}

=== FINAL PROCESSED CSS ===
${result}
`;

fs.writeFileSync(outputFile, logContent);
console.log(`\nResults saved to: ${outputFile}`);
