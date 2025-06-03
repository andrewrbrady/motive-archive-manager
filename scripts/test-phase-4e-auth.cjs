#!/usr/bin/env node

/**
 * PHASE 4E AUTHENTICATION OPTIMIZATION VALIDATION TEST
 *
 * This script validates:
 * 1. Authentication state management optimizations
 * 2. Fixed authentication violations in 3 high-priority components
 * 3. Improved token refresh throttling and caching
 * 4. TypeScript compilation passes
 */

const fs = require("fs");
const path = require("path");

console.log("🧪 PHASE 4E AUTHENTICATION OPTIMIZATION VALIDATION");
console.log("=".repeat(60));

// Test results tracking
const results = {
  authOptimizations: { passed: 0, failed: 0, details: [] },
  violationFixes: { passed: 0, failed: 0, details: [] },
  typeScriptCheck: { passed: 0, failed: 0, details: [] },
  overall: { passed: 0, failed: 0 },
};

/**
 * Test 1: Authentication State Management Optimizations
 */
function testAuthOptimizations() {
  console.log("\n📊 Testing Authentication State Management Optimizations...");

  const tests = [
    {
      name: "useFirebaseAuth.ts - Extended validation throttling to 60s",
      file: "src/hooks/useFirebaseAuth.ts",
      check: (content) => content.includes("VALIDATION_THROTTLE_MS = 60000"),
    },
    {
      name: "useFirebaseAuth.ts - Added console logging throttle (2 minutes)",
      file: "src/hooks/useFirebaseAuth.ts",
      check: (content) => content.includes("CONSOLE_LOG_THROTTLE_MS = 120000"),
    },
    {
      name: "useFirebaseAuth.ts - Added validation cache (2 minutes)",
      file: "src/hooks/useFirebaseAuth.ts",
      check: (content) => content.includes("VALIDATION_CACHE_MS = 120000"),
    },
    {
      name: "useFirebaseAuth.ts - Validation cache implementation",
      file: "src/hooks/useFirebaseAuth.ts",
      check: (content) =>
        content.includes("validationCacheRef.current[user.uid]"),
    },
    {
      name: "api-client.ts - Extended token cache to 2 minutes",
      file: "src/lib/api-client.ts",
      check: (content) => content.includes("TOKEN_CACHE_MS = 120000"),
    },
    {
      name: "api-client.ts - Added console logging throttle",
      file: "src/lib/api-client.ts",
      check: (content) => content.includes("CONSOLE_LOG_THROTTLE_MS = 120000"),
    },
  ];

  tests.forEach((test) => {
    try {
      const filePath = path.join(process.cwd(), test.file);
      if (!fs.existsSync(filePath)) {
        results.authOptimizations.failed++;
        results.authOptimizations.details.push(
          `❌ ${test.name}: File not found`
        );
        return;
      }

      const content = fs.readFileSync(filePath, "utf8");
      if (test.check(content)) {
        results.authOptimizations.passed++;
        results.authOptimizations.details.push(`✅ ${test.name}`);
      } else {
        results.authOptimizations.failed++;
        results.authOptimizations.details.push(`❌ ${test.name}: Check failed`);
      }
    } catch (error) {
      results.authOptimizations.failed++;
      results.authOptimizations.details.push(
        `❌ ${test.name}: ${error.message}`
      );
    }
  });
}

/**
 * Test 2: Authentication Violation Fixes
 */
function testViolationFixes() {
  console.log("\n🔐 Testing Authentication Violation Fixes...");

  const components = [
    {
      name: "InspectionReport.tsx",
      file: "src/components/cars/InspectionReport.tsx",
      checks: [
        {
          desc: "Imports useAPI hook",
          pattern: /import.*useAPI.*from.*@\/hooks\/useAPI/,
        },
        { desc: "Uses api.deleteWithBody()", pattern: /api\.deleteWithBody\(/ },
        { desc: "Uses api.post()", pattern: /api\.post\(/ },
        { desc: "Has loading guard", pattern: /if \(!api\)/ },
        {
          desc: "No fetch() calls remaining",
          pattern: /fetch\(/,
          shouldNotMatch: true,
        },
      ],
    },
    {
      name: "ClientsTable.tsx",
      file: "src/components/clients/ClientsTable.tsx",
      checks: [
        {
          desc: "Imports useAPI hook",
          pattern: /import.*useAPI.*from.*@\/hooks\/useAPI/,
        },
        { desc: "Uses api.get()", pattern: /api\.get\(/ },
        { desc: "Uses api.delete()", pattern: /api\.delete\(/ },
        { desc: "Has loading guard", pattern: /if \(!api\)/ },
        {
          desc: "No fetch() calls remaining",
          pattern: /fetch\(/,
          shouldNotMatch: true,
        },
      ],
    },
    {
      name: "EditClientDialog.tsx",
      file: "src/components/clients/EditClientDialog.tsx",
      checks: [
        {
          desc: "Imports useAPI hook",
          pattern: /import.*useAPI.*from.*@\/hooks\/useAPI/,
        },
        { desc: "Uses api.put()", pattern: /api\.put\(/ },
        { desc: "Has loading guard", pattern: /if \(!api\)/ },
        {
          desc: "No fetch() calls remaining",
          pattern: /fetch\(/,
          shouldNotMatch: true,
        },
      ],
    },
  ];

  components.forEach((component) => {
    try {
      const filePath = path.join(process.cwd(), component.file);
      if (!fs.existsSync(filePath)) {
        results.violationFixes.failed++;
        results.violationFixes.details.push(
          `❌ ${component.name}: File not found`
        );
        return;
      }

      const content = fs.readFileSync(filePath, "utf8");
      let componentPassed = true;

      component.checks.forEach((check) => {
        const matches = check.pattern.test(content);
        const passed = check.shouldNotMatch ? !matches : matches;

        if (passed) {
          results.violationFixes.details.push(
            `  ✅ ${component.name}: ${check.desc}`
          );
        } else {
          componentPassed = false;
          results.violationFixes.details.push(
            `  ❌ ${component.name}: ${check.desc}`
          );
        }
      });

      if (componentPassed) {
        results.violationFixes.passed++;
      } else {
        results.violationFixes.failed++;
      }
    } catch (error) {
      results.violationFixes.failed++;
      results.violationFixes.details.push(
        `❌ ${component.name}: ${error.message}`
      );
    }
  });
}

/**
 * Test 3: TypeScript Compilation Check
 */
function testTypeScriptCompilation() {
  console.log("\n📝 Testing TypeScript Compilation...");

  const { execSync } = require("child_process");

  try {
    console.log("Running TypeScript compilation check...");
    execSync("npx tsc --noEmit", {
      stdio: "pipe",
      cwd: process.cwd(),
      timeout: 30000,
    });

    results.typeScriptCheck.passed++;
    results.typeScriptCheck.details.push("✅ TypeScript compilation passed");
  } catch (error) {
    results.typeScriptCheck.failed++;
    results.typeScriptCheck.details.push(
      `❌ TypeScript compilation failed: ${error.message}`
    );
  }
}

/**
 * Test 4: Authentication Violation Count Check
 */
function testViolationCount() {
  console.log("\n🔍 Checking Authentication Violation Count...");

  try {
    const { execSync } = require("child_process");

    // Search for remaining fetch() calls in components
    const result = execSync(
      'find src/components -name "*.tsx" -exec grep -l "fetch(" {} \\;',
      {
        encoding: "utf8",
        stdio: "pipe",
      }
    );

    const violatingFiles = result
      .trim()
      .split("\n")
      .filter((f) => f.length > 0);
    const violationCount = violatingFiles.length;

    console.log(`Found ${violationCount} components still using fetch()`);

    if (violationCount <= 37) {
      // Expected reduction from 40 to ~37
      results.violationFixes.details.push(
        `✅ Authentication violations reduced (${violationCount} remaining)`
      );
    } else {
      results.violationFixes.details.push(
        `❌ Authentication violations not sufficiently reduced (${violationCount} remaining)`
      );
    }

    // List remaining violations for next phase
    if (violatingFiles.length > 0) {
      console.log("\nRemaining authentication violations:");
      violatingFiles.slice(0, 10).forEach((file) => {
        console.log(`  - ${file}`);
      });
      if (violatingFiles.length > 10) {
        console.log(`  ... and ${violatingFiles.length - 10} more`);
      }
    }
  } catch (error) {
    console.log("Could not check violation count:", error.message);
  }
}

/**
 * Run all tests
 */
function runTests() {
  testAuthOptimizations();
  testViolationFixes();
  testTypeScriptCompilation();
  testViolationCount();

  // Calculate overall results
  results.overall.passed =
    results.authOptimizations.passed +
    results.violationFixes.passed +
    results.typeScriptCheck.passed;
  results.overall.failed =
    results.authOptimizations.failed +
    results.violationFixes.failed +
    results.typeScriptCheck.failed;

  // Print detailed results
  console.log("\n📋 DETAILED RESULTS");
  console.log("=".repeat(60));

  console.log("\n🔧 Authentication Optimizations:");
  results.authOptimizations.details.forEach((detail) => console.log(detail));

  console.log("\n🔐 Violation Fixes:");
  results.violationFixes.details.forEach((detail) => console.log(detail));

  console.log("\n📝 TypeScript Check:");
  results.typeScriptCheck.details.forEach((detail) => console.log(detail));

  // Print summary
  console.log("\n📊 PHASE 4E SUMMARY");
  console.log("=".repeat(60));
  console.log(`✅ Passed: ${results.overall.passed}`);
  console.log(`❌ Failed: ${results.overall.failed}`);
  console.log(
    `📈 Success Rate: ${Math.round((results.overall.passed / (results.overall.passed + results.overall.failed)) * 100)}%`
  );

  if (results.overall.failed === 0) {
    console.log("\n🎉 PHASE 4E COMPLETED SUCCESSFULLY!");
    console.log("✅ Authentication state management optimized");
    console.log("✅ 3 high-priority authentication violations fixed");
    console.log("✅ Token refresh throttling and caching improved");
    console.log("✅ TypeScript compilation passes");
  } else {
    console.log("\n⚠️  PHASE 4E PARTIALLY COMPLETED");
    console.log("Some tests failed. Please review the details above.");
  }

  return results.overall.failed === 0;
}

// Run the tests
if (require.main === module) {
  const success = runTests();
  process.exit(success ? 0 : 1);
}

module.exports = { runTests, results };
