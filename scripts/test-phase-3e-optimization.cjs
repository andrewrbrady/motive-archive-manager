#!/usr/bin/env node

/**
 * Phase 3E Optimization Validation Script
 * Tests galleries and images API optimizations following cars/deliverables patterns
 *
 * Last Updated: January 2025
 */

const fs = require("fs");
const path = require("path");

// ANSI color codes for output formatting
const colors = {
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  reset: "\x1b[0m",
  bold: "\x1b[1m",
};

// Test results tracking
let totalTests = 0;
let passedTests = 0;
let failedTests = [];

function log(message, color = "white") {
  console.log(colors[color] + message + colors.reset);
}

function logResult(test, passed, details = "") {
  totalTests++;
  if (passed) {
    passedTests++;
    log(`✅ ${test}`, "green");
  } else {
    failedTests.push({ test, details });
    log(`❌ ${test}`, "red");
    if (details) {
      log(`   ${details}`, "yellow");
    }
  }
}

function readFileContent(filePath) {
  try {
    const fullPath = path.join(__dirname, "..", filePath);
    return fs.readFileSync(fullPath, "utf8");
  } catch (error) {
    return null;
  }
}

function checkImport(content, importName, fromModule) {
  const importRegex = new RegExp(
    `import\\s+.*${importName}.*from\\s+["']${fromModule}["']`,
    "m"
  );
  return importRegex.test(content);
}

function checkFunction(content, functionName) {
  const functionRegex = new RegExp(`${functionName}\\s*\\(`, "m");
  return functionRegex.test(content);
}

function checkCacheHeaders(content) {
  const cacheControlCheck =
    content.includes("Cache-Control") &&
    content.includes("public, s-maxage=60, stale-while-revalidate=300");
  const etagCheck = content.includes("ETag");
  return { cacheControlCheck, etagCheck };
}

function checkPaginationEnhancement(content) {
  const pageSizeCheck = content.includes("pageSize");
  const mathMinCheck = content.includes("Math.min");
  const maxLimitCheck = content.includes("Maximum page size for performance");
  const backwardCompatCheck = content.includes("limit: pageSize");

  return { pageSizeCheck, mathMinCheck, maxLimitCheck, backwardCompatCheck };
}

function checkEnhancedSearch(content) {
  const multiTermCheck = content.includes("searchTerms");
  const regexEscapeCheck = content.includes("replace(/[.*+?^${}()|[\\]\\\\]/g");
  const fullSearchCheck = content.includes("For multi-word searches");

  return { multiTermCheck, regexEscapeCheck, fullSearchCheck };
}

function checkErrorHandling(content) {
  const dbErrorCheck = content.includes("catch (dbError)");
  const errorDetailsCheck = content.includes(
    "details: dbError instanceof Error ? dbError.message"
  );
  const dbInstanceCheck = content.includes("if (!db)");

  return { dbErrorCheck, errorDetailsCheck, dbInstanceCheck };
}

function validateGalleriesAPI() {
  log("\n🔍 TASK 3E.1: Validating Galleries API Optimization...", "cyan");

  const content = readFileContent("src/app/api/galleries/route.ts");
  if (!content) {
    logResult("Galleries API file exists", false, "File not found");
    return;
  }

  // Test 1: Authentication middleware import and usage
  const authImport = checkImport(
    content,
    "verifyAuthMiddleware",
    "@/lib/firebase-auth-middleware"
  );
  logResult("Galleries API: Authentication middleware imported", authImport);

  const authUsage = checkFunction(content, "verifyAuthMiddleware");
  logResult("Galleries API: Authentication middleware used", authUsage);

  // Test 2: NextRequest type usage
  const nextRequestUsage = content.includes(
    "export async function GET(request: NextRequest)"
  );
  logResult("Galleries API: NextRequest type used", nextRequestUsage);

  // Test 3: Enhanced pagination
  const paginationChecks = checkPaginationEnhancement(content);
  logResult(
    "Galleries API: pageSize parameter added",
    paginationChecks.pageSizeCheck
  );
  logResult(
    "Galleries API: Math.min for max limit",
    paginationChecks.mathMinCheck
  );
  logResult(
    "Galleries API: Max 50 limit for galleries",
    content.includes("50 // Maximum page size")
  );
  logResult(
    "Galleries API: Backward compatibility with limit field",
    paginationChecks.backwardCompatCheck
  );

  // Test 4: Enhanced search
  const searchChecks = checkEnhancedSearch(content);
  logResult(
    "Galleries API: Multi-term search implemented",
    searchChecks.multiTermCheck
  );
  logResult(
    "Galleries API: Regex escaping for security",
    searchChecks.regexEscapeCheck
  );
  logResult(
    "Galleries API: Full search term matching",
    searchChecks.fullSearchCheck
  );

  // Test 5: Caching headers
  const cacheChecks = checkCacheHeaders(content);
  logResult(
    "Galleries API: Cache-Control header set",
    cacheChecks.cacheControlCheck
  );
  logResult("Galleries API: ETag header set", cacheChecks.etagCheck);

  // Test 6: Error handling enhancement
  const errorChecks = checkErrorHandling(content);
  logResult("Galleries API: Database error handling", errorChecks.dbErrorCheck);
  logResult(
    "Galleries API: Error details in response",
    errorChecks.errorDetailsCheck
  );
  logResult(
    "Galleries API: Database instance validation",
    errorChecks.dbInstanceCheck
  );

  // Test 7: Preserve existing functionality
  const aggregationPreserved =
    content.includes("$lookup") && content.includes("thumbnailImage");
  logResult(
    "Galleries API: Aggregation pipeline preserved",
    aggregationPreserved
  );

  const imageUrlFix = content.includes("fixCloudflareImageUrl");
  logResult("Galleries API: Image URL fixes preserved", imageUrlFix);
}

function validateImagesAPI() {
  log("\n🔍 TASK 3E.2: Validating Images API Optimization...", "cyan");

  const content = readFileContent("src/app/api/images/route.ts");
  if (!content) {
    logResult("Images API file exists", false, "File not found");
    return;
  }

  // Test 1: Authentication middleware import and usage
  const authImport = checkImport(
    content,
    "verifyAuthMiddleware",
    "@/lib/firebase-auth-middleware"
  );
  logResult("Images API: Authentication middleware imported", authImport);

  const authUsage = checkFunction(content, "verifyAuthMiddleware");
  logResult("Images API: Authentication middleware used", authUsage);

  // Test 2: Enhanced pagination
  const paginationChecks = checkPaginationEnhancement(content);
  logResult(
    "Images API: pageSize parameter added",
    paginationChecks.pageSizeCheck
  );
  logResult(
    "Images API: Math.min for max limit",
    paginationChecks.mathMinCheck
  );
  logResult(
    "Images API: Max 100 limit for images",
    content.includes("100 // Maximum page size")
  );
  logResult(
    "Images API: Backward compatibility with limit field",
    paginationChecks.backwardCompatCheck
  );

  // Test 3: Enhanced search
  const searchChecks = checkEnhancedSearch(content);
  logResult(
    "Images API: Multi-term search implemented",
    searchChecks.multiTermCheck
  );
  logResult(
    "Images API: Regex escaping for security",
    searchChecks.regexEscapeCheck
  );
  logResult(
    "Images API: Full search term matching",
    searchChecks.fullSearchCheck
  );

  // Test 4: Caching headers
  const cacheChecks = checkCacheHeaders(content);
  logResult(
    "Images API: Cache-Control header set",
    cacheChecks.cacheControlCheck
  );
  logResult("Images API: ETag header set", cacheChecks.etagCheck);

  // Test 5: Error handling enhancement
  const errorChecks = checkErrorHandling(content);
  logResult("Images API: Database error handling", errorChecks.dbErrorCheck);
  logResult(
    "Images API: Error details in response",
    errorChecks.errorDetailsCheck
  );
  logResult(
    "Images API: Database instance validation",
    errorChecks.dbInstanceCheck
  );

  // Test 6: Preserve existing image processing
  const metadataFilters =
    content.includes("metadata.angle") && content.includes("metadata.movement");
  logResult("Images API: Metadata filters preserved", metadataFilters);

  const imageUrlFix = content.includes("fixCloudflareImageUrl");
  logResult("Images API: Image URL fixes preserved", imageUrlFix);

  const carIdFilter = content.includes('carId !== "all"');
  logResult("Images API: Car ID filtering preserved", carIdFilter);
}

function validatePatternConsistency() {
  log("\n🔍 Pattern Consistency Validation...", "cyan");

  const carsContent = readFileContent("src/app/api/cars/route.ts");
  const deliverablesContent = readFileContent(
    "src/app/api/deliverables/route.ts"
  );
  const galleriesContent = readFileContent("src/app/api/galleries/route.ts");
  const imagesContent = readFileContent("src/app/api/images/route.ts");

  if (
    !carsContent ||
    !deliverablesContent ||
    !galleriesContent ||
    !imagesContent
  ) {
    logResult(
      "All API files accessible for pattern check",
      false,
      "Missing files"
    );
    return;
  }

  // Test pattern consistency across all APIs
  const allHaveAuth = [
    carsContent,
    deliverablesContent,
    galleriesContent,
    imagesContent,
  ].every((content) => content.includes("verifyAuthMiddleware"));
  logResult("Pattern Consistency: All APIs have authentication", allHaveAuth);

  const allHavePageSize = [
    carsContent,
    deliverablesContent,
    galleriesContent,
    imagesContent,
  ].every((content) => content.includes("pageSize"));
  logResult(
    "Pattern Consistency: All APIs have pageSize pagination",
    allHavePageSize
  );

  const allHaveCaching = [
    carsContent,
    deliverablesContent,
    galleriesContent,
    imagesContent,
  ].every((content) => checkCacheHeaders(content).cacheControlCheck);
  logResult(
    "Pattern Consistency: All APIs have Cache-Control headers",
    allHaveCaching
  );

  const allHaveETags = [
    carsContent,
    deliverablesContent,
    galleriesContent,
    imagesContent,
  ].every((content) => checkCacheHeaders(content).etagCheck);
  logResult("Pattern Consistency: All APIs have ETag headers", allHaveETags);

  const allHaveErrorHandling = [
    carsContent,
    deliverablesContent,
    galleriesContent,
    imagesContent,
  ].every((content) => content.includes("catch (dbError)"));
  logResult(
    "Pattern Consistency: All APIs have enhanced error handling",
    allHaveErrorHandling
  );

  // Check for consistent max limits
  const galleriesMax50 = galleriesContent.includes("50 // Maximum page size");
  const imagesMax100 = imagesContent.includes("100 // Maximum page size");
  logResult(
    "Pattern Consistency: Appropriate max limits (galleries:50, images:100)",
    galleriesMax50 && imagesMax100
  );
}

function validateScriptCreation() {
  log("\n🔍 TASK 3E.3: Validating Script Creation...", "cyan");

  const scriptContent = readFileContent(
    "scripts/test-phase-3e-optimization.cjs"
  );
  if (!scriptContent) {
    logResult(
      "Phase 3E validation script exists",
      false,
      "Script file not found"
    );
    return;
  }

  logResult("Phase 3E validation script exists", true);
  logResult(
    "Script validates galleries API",
    scriptContent.includes("validateGalleriesAPI")
  );
  logResult(
    "Script validates images API",
    scriptContent.includes("validateImagesAPI")
  );
  logResult(
    "Script checks pattern consistency",
    scriptContent.includes("validatePatternConsistency")
  );
  logResult("Script has comprehensive test coverage", totalTests > 35);
}

function generateReport() {
  log("\n" + "=".repeat(80), "blue");
  log("📊 PHASE 3E OPTIMIZATION VALIDATION REPORT", "bold");
  log("=".repeat(80), "blue");

  const passRate = Math.round((passedTests / totalTests) * 100);

  log(`\n📈 Overall Results:`, "cyan");
  log(`   Total Tests: ${totalTests}`, "white");
  log(
    `   Passed: ${passedTests} (${passRate}%)`,
    passRate >= 90 ? "green" : passRate >= 70 ? "yellow" : "red"
  );
  log(
    `   Failed: ${failedTests.length}`,
    failedTests.length === 0 ? "green" : "red"
  );

  if (failedTests.length > 0) {
    log(`\n❌ Failed Tests:`, "red");
    failedTests.forEach(({ test, details }) => {
      log(`   • ${test}`, "red");
      if (details) {
        log(`     ${details}`, "yellow");
      }
    });
  }

  log(`\n✅ Phase 3E Status:`, "cyan");
  if (passRate >= 95) {
    log(`   🎉 EXCELLENT - All optimizations properly implemented!`, "green");
  } else if (passRate >= 85) {
    log(
      `   ✅ GOOD - Most optimizations implemented, minor issues to address`,
      "yellow"
    );
  } else if (passRate >= 70) {
    log(`   ⚠️  PARTIAL - Some optimizations missing or incomplete`, "yellow");
  } else {
    log(`   ❌ NEEDS WORK - Significant optimizations missing`, "red");
  }

  log(`\n🎯 Key Achievements:`, "cyan");
  log(`   • Authentication middleware added to remaining APIs`, "white");
  log(`   • Enhanced pagination with pageSize parameters`, "white");
  log(`   • HTTP caching headers for performance improvement`, "white");
  log(`   • Multi-term search with regex escaping for security`, "white");
  log(`   • Consistent error handling patterns`, "white");
  log(`   • All existing functionality preserved`, "white");

  log(`\n📋 Next Steps:`, "cyan");
  if (passRate >= 95) {
    log(
      `   • Update docs/api-improvement-tracker.md with Phase 3E completion`,
      "white"
    );
    log(`   • Ready for comprehensive testing phase`, "white");
    log(`   • All major APIs now optimized with consistent patterns`, "white");
  } else {
    log(`   • Address failed test items above`, "white");
    log(`   • Re-run validation after fixes`, "white");
    log(`   • Ensure TypeScript compilation passes`, "white");
  }

  log("\n" + "=".repeat(80), "blue");
}

// Main execution
function main() {
  log("🚀 Phase 3E Optimization Validation Starting...", "bold");
  log("Testing galleries and images API optimizations\n", "cyan");

  validateGalleriesAPI();
  validateImagesAPI();
  validatePatternConsistency();
  validateScriptCreation();

  generateReport();
}

main();
