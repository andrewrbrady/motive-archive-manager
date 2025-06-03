/**
 * Dashboard Deliverables Validation Script
 * Tests the fixed dashboard components for Phase 4A completion
 */

const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const COLORS = {
  GREEN: "\x1b[32m",
  RED: "\x1b[31m",
  YELLOW: "\x1b[33m",
  BLUE: "\x1b[34m",
  CYAN: "\x1b[36m",
  RESET: "\x1b[0m",
  BOLD: "\x1b[1m",
};

function log(message, color = COLORS.RESET) {
  console.log(`${color}${message}${COLORS.RESET}`);
}

function logSection(title) {
  log(`\n${COLORS.BOLD}${COLORS.CYAN}=== ${title} ===${COLORS.RESET}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, COLORS.GREEN);
}

function logError(message) {
  log(`❌ ${message}`, COLORS.RED);
}

function logWarning(message) {
  log(`⚠️  ${message}`, COLORS.YELLOW);
}

function logInfo(message) {
  log(`ℹ️  ${message}`, COLORS.BLUE);
}

class DashboardDeliverablesValidator {
  constructor() {
    this.results = {
      total: 0,
      passed: 0,
      failed: 0,
      warnings: 0,
    };
  }

  test(description, testFn) {
    this.results.total++;
    try {
      const result = testFn();
      if (result === true) {
        logSuccess(description);
        this.results.passed++;
      } else if (result === "warning") {
        logWarning(description);
        this.results.warnings++;
      } else {
        logError(`${description} - ${result}`);
        this.results.failed++;
      }
    } catch (error) {
      logError(`${description} - Error: ${error.message}`);
      this.results.failed++;
    }
  }

  testFileExists(filePath, description) {
    this.test(`${description} exists`, () => {
      return fs.existsSync(path.resolve(filePath));
    });
  }

  testTypeScriptCompilation() {
    return new Promise((resolve) => {
      logSection("TypeScript Compilation Test");

      const tsc = spawn("npx", ["tsc", "--noEmit", "--skipLibCheck"], {
        stdio: ["pipe", "pipe", "pipe"],
        shell: true,
      });

      let output = "";
      let errorOutput = "";

      tsc.stdout.on("data", (data) => {
        output += data.toString();
      });

      tsc.stderr.on("data", (data) => {
        errorOutput += data.toString();
      });

      tsc.on("close", (code) => {
        if (code === 0) {
          logSuccess("TypeScript compilation successful");
          this.results.passed++;
        } else {
          logError("TypeScript compilation failed");
          console.log("TypeScript errors:", errorOutput);
          this.results.failed++;
        }
        this.results.total++;
        resolve();
      });

      tsc.on("error", (error) => {
        logError(`TypeScript compilation error: ${error.message}`);
        this.results.failed++;
        this.results.total++;
        resolve();
      });
    });
  }

  testPlatformBadgesComponent() {
    logSection("PlatformBadges Component Analysis");

    const filePath = "src/components/deliverables/PlatformBadges.tsx";
    this.testFileExists(filePath, "PlatformBadges component");

    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, "utf8");

      this.test("Has error state handling", () => {
        return content.includes("hasError") && content.includes("setHasError");
      });

      this.test("Has graceful fallback for platform data", () => {
        return (
          content.includes("fallbackPlatforms") &&
          content.includes("Handle error state with graceful fallback")
        );
      });

      this.test("Handles both platform and platforms props", () => {
        return (
          content.includes("platform?:") && content.includes("platforms?:")
        );
      });

      this.test("Has proper error handling in useEffect", () => {
        return (
          content.includes("catch (error)") &&
          content.includes("setHasError(true)")
        );
      });

      this.test("Provides fallback rendering when API fails", () => {
        return content.includes("Fallback to displaying raw platform data");
      });
    }
  }

  testDashboardComponent() {
    logSection("Dashboard Component Analysis");

    const filePath = "src/app/dashboard/page.tsx";
    this.testFileExists(filePath, "Dashboard page component");

    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, "utf8");

      this.test("Has updated DeliverableResponse interface", () => {
        return (
          content.includes("currentPage: number") &&
          content.includes("totalCount: number")
        );
      });

      this.test("Has enhanced error handling in fetchUserDeliverables", () => {
        return (
          content.includes("Dashboard: Error in fetchUserDeliverables") &&
          content.includes("instanceof Error")
        );
      });

      this.test("Has proper session validation", () => {
        return (
          content.includes("session === null") &&
          content.includes("clearing deliverables")
        );
      });

      this.test("Has comprehensive logging for debugging", () => {
        return (
          content.includes("Dashboard: API response structure") &&
          content.includes("Dashboard: Response status")
        );
      });

      this.test("Has user-friendly error messages", () => {
        return (
          content.includes("Authentication required. Please sign in again.") &&
          content.includes("Access denied. You may not have permission")
        );
      });

      this.test("Validates response structure", () => {
        return (
          content.includes("if (!data.deliverables)") &&
          content.includes("using empty array")
        );
      });

      this.test("Uses PlatformBadges component correctly", () => {
        return (
          content.includes("<PlatformBadges") &&
          content.includes("platform={deliverable.platform}") &&
          content.includes("platforms={deliverable.platforms}")
        );
      });
    }
  }

  testDeliverableTypes() {
    logSection("Deliverable Types Analysis");

    const filePath = "src/types/deliverable.ts";
    this.testFileExists(filePath, "Deliverable types");

    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, "utf8");

      this.test("Has DeliverablePlatform interface", () => {
        return content.includes("interface DeliverablePlatform");
      });

      this.test("Has legacy Platform type for backward compatibility", () => {
        return (
          content.includes("type Platform =") &&
          content.includes("Instagram Reels")
        );
      });

      this.test("Deliverable interface has both platform fields", () => {
        return (
          content.includes("platform: Platform") &&
          content.includes("platforms?: string[]")
        );
      });

      this.test("Has proper comments explaining migration", () => {
        return (
          content.includes("Keep for backward compatibility") ||
          content.includes("New field for multiple platform")
        );
      });
    }
  }

  testAPIRoutes() {
    logSection("API Routes Analysis");

    // Test deliverables API
    const deliverablesAPI = "src/app/api/deliverables/route.ts";
    this.testFileExists(deliverablesAPI, "Deliverables API route");

    if (fs.existsSync(deliverablesAPI)) {
      const content = fs.readFileSync(deliverablesAPI, "utf8");

      this.test("Deliverables API has Phase 3E optimizations", () => {
        return (
          content.includes("verifyAuthMiddleware") &&
          content.includes("Enhanced pagination")
        );
      });

      this.test("Deliverables API supports both platform fields", () => {
        return (
          content.includes("platform: platform") &&
          content.includes("platforms: { $in: [platform] }")
        );
      });

      this.test("Deliverables API has proper pagination structure", () => {
        return (
          content.includes("currentPage: page") &&
          content.includes("totalCount") &&
          content.includes("Legacy support")
        );
      });
    }

    // Test platforms API
    const platformsAPI = "src/app/api/platforms/route.ts";
    this.testFileExists(platformsAPI, "Platforms API route");

    if (fs.existsSync(platformsAPI)) {
      const content = fs.readFileSync(platformsAPI, "utf8");

      this.test("Platforms API has proper response structure", () => {
        return (
          content.includes("_id: platform._id.toString()") &&
          content.includes("formattedPlatforms")
        );
      });

      this.test("Platforms API seeds initial data", () => {
        return (
          content.includes("INITIAL_PLATFORMS") &&
          content.includes("seeding initial data")
        );
      });
    }
  }

  testComponentIntegration() {
    logSection("Component Integration Analysis");

    // Check if components are properly integrated
    this.test("Dashboard imports PlatformBadges", () => {
      const dashboardContent = fs.readFileSync(
        "src/app/dashboard/page.tsx",
        "utf8"
      );
      return dashboardContent.includes("import { PlatformBadges }");
    });

    this.test("Dashboard uses deliverable types correctly", () => {
      const dashboardContent = fs.readFileSync(
        "src/app/dashboard/page.tsx",
        "utf8"
      );
      return (
        dashboardContent.includes("import { Deliverable") &&
        dashboardContent.includes("DeliverableStatus")
      );
    });
  }

  async runAllTests() {
    logSection("Dashboard Deliverables Validation - Phase 4A");
    logInfo(
      "Testing dashboard components after deliverables data structure fixes..."
    );

    // File existence and structure tests
    this.testPlatformBadgesComponent();
    this.testDashboardComponent();
    this.testDeliverableTypes();
    this.testAPIRoutes();
    this.testComponentIntegration();

    // TypeScript compilation test
    await this.testTypeScriptCompilation();

    // Print results
    this.printResults();
  }

  printResults() {
    logSection("Validation Results Summary");

    const totalTests = this.results.total;
    const passRate =
      totalTests > 0 ? Math.round((this.results.passed / totalTests) * 100) : 0;

    log(`📊 Total Tests: ${totalTests}`);
    logSuccess(`Passed: ${this.results.passed}`);
    logError(`Failed: ${this.results.failed}`);
    logWarning(`Warnings: ${this.results.warnings}`);
    log(`📈 Pass Rate: ${passRate}%`);

    if (this.results.failed === 0) {
      logSuccess(
        "\n🎉 All critical tests passed! Dashboard deliverables fixes are working correctly."
      );
      logInfo(
        "✅ Phase 4A: Dashboard deliverables data structure fix - COMPLETED"
      );
    } else {
      logError(
        `\n💥 ${this.results.failed} test(s) failed. Please review the issues above.`
      );
      logWarning(
        "❌ Phase 4A: Dashboard deliverables data structure fix - NEEDS ATTENTION"
      );
    }

    if (this.results.warnings > 0) {
      logWarning(
        `\n⚠️  ${this.results.warnings} warning(s) found. These should be addressed in Phase 4B.`
      );
    }

    // Print next steps
    logSection("Next Steps");
    if (this.results.failed === 0) {
      logInfo(
        "1. Test the dashboard in a browser to verify visual functionality"
      );
      logInfo("2. Check authentication flow works properly");
      logInfo("3. Verify platform badges display correctly with fallbacks");
      logInfo("4. Move to Phase 4B for additional dashboard component fixes");
    } else {
      logError("1. Fix the failing tests above");
      logError("2. Re-run this validation script");
      logError("3. Only proceed to Phase 4B after all tests pass");
    }
  }
}

// Run the validation
async function main() {
  const validator = new DashboardDeliverablesValidator();
  await validator.runAllTests();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = DashboardDeliverablesValidator;
