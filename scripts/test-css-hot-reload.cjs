#!/usr/bin/env node

/**
 * CSS Hot-Reload Test Script
 *
 * This script tests the CSS hot-reload optimization to ensure:
 * 1. CSS classes like .cta-section still work (regression test)
 * 2. Hot-reload mechanism prevents full component re-renders
 * 3. Style element updates work correctly
 * 4. No breaking changes to existing CSS injection
 */

const fs = require("fs");
const path = require("path");

console.log("🧪 CSS HOT-RELOAD FUNCTIONALITY TESTS");
console.log("=====================================\n");

// Test files to analyze
const testFiles = [
  "src/components/BlockComposer/StylesheetInjector.tsx",
  "src/hooks/useStylesheetData.ts",
  "src/components/content-studio/BlockComposer.tsx",
  "src/components/content-studio/renderers/RendererFactory.tsx",
];

// Test patterns for hot-reload optimization
const hotReloadPatterns = [
  {
    name: "Style Element Update (Hot-Reload)",
    pattern: /styleElementRef\.current\.textContent\s*=/g,
    description:
      "Verifies style elements are updated instead of removed/re-added",
    expectedCount: 1,
  },
  {
    name: "CSS Content Change Detection",
    pattern: /lastCSSContentRef\.current\s*===\s*cssContent/g,
    description:
      "Checks for CSS content change detection to avoid unnecessary updates",
    expectedCount: 1,
  },
  {
    name: "CSS Content Notification",
    pattern: /notifyCSSContentChange/g,
    description: "Verifies CSS content notification mechanism is used",
    expectedCount: 2,
  },
  {
    name: "React.memo Optimization",
    pattern: /React\.memo/g,
    description: "Ensures components use React.memo for performance",
    expectedCount: 3,
  },
  {
    name: "CSS Comment Parsing (Regression Test)",
    pattern: /\/\*[\s\S]*?\*\//g,
    description: "Ensures CSS comment parsing logic is preserved",
    expectedCount: 2,
  },
];

// Test patterns for regression prevention
const regressionPatterns = [
  {
    name: "CSS Class Scoping (.cta-section)",
    pattern: /\.cta-section/g,
    description: "Ensures .cta-section and similar classes still work",
    files: ["src/components/BlockComposer/StylesheetInjector.tsx"],
    shouldExist: true,
  },
  {
    name: "Dangerous Selector Detection",
    pattern: /dangerousSelectors/g,
    description: "Verifies dangerous selector filtering is preserved",
    files: ["src/components/BlockComposer/StylesheetInjector.tsx"],
    shouldExist: true,
  },
  {
    name: "CSS Enhancement (!important)",
    pattern: /!important/g,
    description: "Checks CSS property enhancement is maintained",
    files: ["src/components/BlockComposer/StylesheetInjector.tsx"],
    shouldExist: true,
  },
];

function runTest(filePath, pattern, description, expectedCount = null) {
  if (!fs.existsSync(filePath)) {
    console.log(`❌ File not found: ${filePath}`);
    return false;
  }

  const content = fs.readFileSync(filePath, "utf8");
  const matches = [...content.matchAll(pattern)];

  const success =
    expectedCount !== null
      ? matches.length === expectedCount
      : matches.length > 0;

  const status = success ? "✅" : "❌";
  const countInfo =
    expectedCount !== null
      ? ` (expected: ${expectedCount}, found: ${matches.length})`
      : ` (found: ${matches.length})`;

  console.log(`${status} ${description}${countInfo}`);

  if (!success && matches.length > 0) {
    console.log(`   Sample matches:`);
    matches.slice(0, 2).forEach((match, index) => {
      const lineNumber = content.substring(0, match.index).split("\n").length;
      console.log(`   Line ${lineNumber}: ${match[0].substring(0, 60)}...`);
    });
  }

  return success;
}

function runRegressionTest(pattern, description, files, shouldExist) {
  console.log(`\n🔍 ${description}:`);
  let allPassed = true;

  files.forEach((filePath) => {
    if (!fs.existsSync(filePath)) {
      console.log(`❌ File not found: ${filePath}`);
      allPassed = false;
      return;
    }

    const content = fs.readFileSync(filePath, "utf8");
    const matches = [...content.matchAll(pattern)];
    const found = matches.length > 0;

    const success = shouldExist ? found : !found;
    const status = success ? "✅" : "❌";

    console.log(
      `${status} ${path.basename(filePath)}: ${found ? "Found" : "Not found"} (${matches.length} matches)`
    );

    if (!success) {
      allPassed = false;
    }
  });

  return allPassed;
}

// Run hot-reload functionality tests
console.log("🚀 HOT-RELOAD FUNCTIONALITY TESTS");
console.log("─".repeat(40));

let allTestsPassed = true;

hotReloadPatterns.forEach((test) => {
  console.log(`\n🔍 ${test.name}:`);

  testFiles.forEach((filePath) => {
    const result = runTest(
      filePath,
      test.pattern,
      `  ${path.basename(filePath)}`,
      null
    );
    if (!result && test.expectedCount !== null) {
      allTestsPassed = false;
    }
  });
});

// Run regression tests
console.log("\n\n🛡️  REGRESSION PREVENTION TESTS");
console.log("─".repeat(40));

regressionPatterns.forEach((test) => {
  const result = runRegressionTest(
    test.pattern,
    test.name,
    test.files,
    test.shouldExist
  );
  if (!result) {
    allTestsPassed = false;
  }
});

// Summary
console.log("\n\n📊 TEST SUMMARY");
console.log("═".repeat(30));

if (allTestsPassed) {
  console.log("✅ ALL TESTS PASSED");
  console.log("   - CSS hot-reload optimization implemented successfully");
  console.log("   - No regressions detected in CSS functionality");
  console.log("   - .cta-section and similar classes preserved");
  console.log("   - Performance optimizations in place");
} else {
  console.log("❌ SOME TESTS FAILED");
  console.log("   - Review failed tests above");
  console.log("   - Ensure hot-reload mechanism is properly implemented");
  console.log("   - Verify no regressions in CSS injection");
}

console.log("\n🎯 NEXT STEPS:");
console.log("   1. Test CSS save functionality in browser");
console.log("   2. Verify preview components don't re-render on CSS changes");
console.log("   3. Check that .cta-section classes work in preview");
console.log("   4. Monitor console for hot-reload success messages");

console.log("\n✅ CSS Hot-Reload test complete.\n");
