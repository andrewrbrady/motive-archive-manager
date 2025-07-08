#!/usr/bin/env node

/**
 * CSS Hot-Reload Fix Verification Script
 *
 * This script verifies that the CSS preview hot-reload fixes are working correctly
 * by analyzing the code changes and ensuring the notification pipeline is properly implemented.
 *
 * FIXES IMPLEMENTED:
 * 1. useStylesheetData hook now forces React state updates with new object references
 * 2. StylesheetInjector properly depends on stylesheet data changes
 * 3. BlockComposer passes stylesheet data to preview components
 * 4. All preview components accept and use stylesheet data props
 */

const fs = require("fs");
const path = require("path");

console.log("🧪 CSS Hot-Reload Fix Verification");
console.log("=====================================\n");

// Test files and their expected fixes
const testCases = [
  {
    name: "useStylesheetData Hook State Updates",
    file: "src/hooks/useStylesheetData.ts",
    tests: [
      {
        pattern: /_lastUpdated: Date\.now\(\)/,
        description: "Forces object reference change with timestamp",
        required: true,
      },
      {
        pattern: /console\.log\([\s\S]*?Previous content length/,
        description: "Debug logging for CSS content changes",
        required: true,
      },
      {
        pattern:
          /console\.log\([\s\S]*?Created new stylesheet data object with timestamp/,
        description: "Debug logging for new object creation",
        required: true,
      },
    ],
  },
  {
    name: "StylesheetInjector Dependencies",
    file: "src/components/BlockComposer/StylesheetInjector.tsx",
    tests: [
      {
        pattern:
          /stylesheetData,[\s\S]*?selectedStylesheetId,[\s\S]*?injectedStylesheetId/,
        description: "Includes stylesheetData in useEffect dependencies",
        required: true,
      },
      {
        pattern: /console\.log\([\s\S]*?Stylesheet data timestamp/,
        description: "Debug logging for stylesheet data changes",
        required: true,
      },
    ],
  },
  {
    name: "BlockComposer Memoization",
    file: "src/components/content-studio/BlockComposer.tsx",
    tests: [
      {
        pattern: /stylesheetData: memoizedStylesheetData/,
        description: "Passes stylesheet data to preview props",
        required: true,
      },
      {
        pattern: /console\.log.*Memoizing stylesheet data/,
        description: "Debug logging for memoization",
        required: true,
      },
      {
        pattern: /memoizedStylesheetData,/,
        description: "Includes memoized stylesheet data in dependencies",
        required: true,
      },
    ],
  },
  {
    name: "RendererFactory Props",
    file: "src/components/content-studio/renderers/RendererFactory.tsx",
    tests: [
      {
        pattern: /stylesheetData\?: any/,
        description: "Accepts stylesheet data as prop",
        required: true,
      },
      {
        pattern: /stylesheetData={stylesheetData}/,
        description: "Passes stylesheet data to child components",
        required: true,
      },
      {
        pattern: /console\.log.*RendererFactory - Received stylesheet data/,
        description: "Debug logging for stylesheet data reception",
        required: true,
      },
    ],
  },
  {
    name: "CleanRenderer Props",
    file: "src/components/content-studio/renderers/CleanRenderer.tsx",
    tests: [
      {
        pattern: /stylesheetData\?: any/,
        description: "Accepts stylesheet data as prop",
        required: true,
      },
      {
        pattern:
          /const stylesheetData = propStylesheetData \|\| hookStylesheetData/,
        description: "Uses prop stylesheet data with fallback",
        required: true,
      },
    ],
  },
  {
    name: "AccurateEmailPreview Props",
    file: "src/components/content-studio/AccurateEmailPreview.tsx",
    tests: [
      {
        pattern: /stylesheetData\?: any/,
        description: "Accepts stylesheet data as prop",
        required: true,
      },
      {
        pattern:
          /const stylesheetData = propStylesheetData \|\| hookStylesheetData/,
        description: "Uses prop stylesheet data with fallback",
        required: true,
      },
    ],
  },
  {
    name: "NewsArticleRenderer Props",
    file: "src/components/content-studio/renderers/NewsArticleRenderer.tsx",
    tests: [
      {
        pattern: /stylesheetData\?: any/,
        description: "Accepts stylesheet data as prop",
        required: true,
      },
      {
        pattern: /console\.log.*NewsArticleRenderer - Received stylesheet data/,
        description: "Debug logging for stylesheet data reception",
        required: true,
      },
    ],
  },
];

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

// Run tests
testCases.forEach((testCase) => {
  console.log(`📁 Testing: ${testCase.name}`);
  console.log(`   File: ${testCase.file}`);

  const filePath = path.join(__dirname, "..", testCase.file);

  if (!fs.existsSync(filePath)) {
    console.log(`   ❌ FAIL: File not found`);
    failedTests += testCase.tests.length;
    totalTests += testCase.tests.length;
    console.log("");
    return;
  }

  const fileContent = fs.readFileSync(filePath, "utf8");

  testCase.tests.forEach((test) => {
    totalTests++;
    const matches = test.pattern.test(fileContent);

    if (matches) {
      console.log(`   ✅ PASS: ${test.description}`);
      passedTests++;
    } else {
      console.log(`   ❌ FAIL: ${test.description}`);
      failedTests++;

      if (test.required) {
        console.log(`      This is a REQUIRED fix for CSS hot-reload to work`);
      }
    }
  });

  console.log("");
});

// Summary
console.log("📊 Test Results Summary");
console.log("=======================");
console.log(`Total Tests: ${totalTests}`);
console.log(`Passed: ${passedTests} ✅`);
console.log(`Failed: ${failedTests} ❌`);
console.log(`Success Rate: ${Math.round((passedTests / totalTests) * 100)}%`);

if (failedTests === 0) {
  console.log("\n🎉 ALL TESTS PASSED!");
  console.log("CSS hot-reload fixes have been successfully implemented.");
  console.log("\nExpected Behavior:");
  console.log('- CSS editor "Save CSS" button updates preview immediately');
  console.log('- VIM mode ":w" command updates preview immediately');
  console.log("- Console logs show CSS content change notifications");
  console.log("- Preview components re-render when CSS changes");
  console.log("- No performance regressions in preview rendering");
} else {
  console.log(
    "\n⚠️  Some tests failed. CSS hot-reload may not work correctly."
  );
  console.log(
    "Please review the failed tests and ensure all fixes are properly implemented."
  );
}

// Additional checks
console.log("\n🔍 Additional Verification");
console.log("==========================");

// Check for potential issues
const potentialIssues = [
  {
    name: "React.memo without proper dependencies",
    files: [
      "src/components/content-studio/renderers/CleanRenderer.tsx",
      "src/components/content-studio/AccurateEmailPreview.tsx",
    ],
    pattern: /React\.memo.*\([\s\S]*?\),[\s\S]*?\(.*\) => \{/,
    description:
      "Custom comparison functions in React.memo can prevent CSS updates",
  },
  {
    name: "Missing stylesheet data in useMemo dependencies",
    files: [
      "src/components/content-studio/renderers/CleanRenderer.tsx",
      "src/components/content-studio/AccurateEmailPreview.tsx",
    ],
    pattern: /useMemo\([\s\S]*?\),[\s\S]*?\[[^\]]*stylesheetData[^\]]*\]/,
    description: "useMemo should include stylesheetData in dependencies",
  },
];

potentialIssues.forEach((issue) => {
  console.log(`\n🔍 Checking: ${issue.name}`);

  issue.files.forEach((file) => {
    const filePath = path.join(__dirname, "..", file);

    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, "utf8");
      const hasIssue = issue.pattern.test(content);

      if (hasIssue) {
        console.log(`   ⚠️  Potential issue in ${file}: ${issue.description}`);
      } else {
        console.log(`   ✅ Clean: ${file}`);
      }
    }
  });
});

console.log("\n🎯 Next Steps");
console.log("=============");
console.log("1. Test in browser: Open Content Studio and edit CSS");
console.log("2. Verify console logs show CSS content flow");
console.log("3. Confirm preview updates immediately on CSS save");
console.log('4. Test both "Save CSS" button and VIM ":w" command');
console.log("5. Check that component state is preserved during CSS updates");

process.exit(failedTests > 0 ? 1 : 0);
