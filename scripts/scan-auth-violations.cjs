#!/usr/bin/env node

/**
 * Authentication Violations Scanner
 * Scans for components using raw fetch() instead of useAPI() hook
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

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

class AuthViolationScanner {
  constructor() {
    this.violations = [];
    this.warnings = [];
    this.clean = [];
  }

  scanFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, "utf8");
      const fileName = path.relative(process.cwd(), filePath);

      // Check for raw fetch calls to API endpoints
      const fetchAPIPattern = /fetch\s*\(\s*['"`][^'"`]*\/api\/[^'"`]*['"`]/g;
      const fetchAPIMatches = content.match(fetchAPIPattern);

      // Check if file uses useAPI hook
      const hasUseAPIImport = /import.*useAPI.*from.*@\/hooks\/useAPI/.test(
        content
      );
      const hasUseAPICall = /const\s+\w+\s*=\s*useAPI\(\)/.test(content);

      // Check for manual Authorization headers
      const authHeaderPattern = /['"`]Authorization['"`]\s*:\s*['"`]Bearer/g;
      const authHeaderMatches = content.match(authHeaderPattern);

      const violations = [];
      const warnings = [];

      if (fetchAPIMatches) {
        violations.push({
          type: "RAW_FETCH_API",
          message: `Uses raw fetch() for API calls: ${fetchAPIMatches.join(", ")}`,
          severity: "HIGH",
        });
      }

      if (authHeaderMatches) {
        violations.push({
          type: "MANUAL_AUTH_HEADER",
          message: `Manual Authorization headers found: ${authHeaderMatches.join(", ")}`,
          severity: "HIGH",
        });
      }

      // Check for React components that fetch API data without useAPI
      const isReactComponent =
        /export\s+(default\s+)?function\s+\w+|const\s+\w+\s*=\s*\(\)\s*=>/.test(
          content
        );
      const hasAPICall = /\/api\//.test(content);

      if (
        isReactComponent &&
        hasAPICall &&
        !hasUseAPICall &&
        !fileName.includes("api/")
      ) {
        warnings.push({
          type: "MISSING_USE_API",
          message:
            "React component makes API calls but doesn't use useAPI hook",
          severity: "MEDIUM",
        });
      }

      if (violations.length > 0) {
        this.violations.push({
          file: fileName,
          violations,
        });
      } else if (warnings.length > 0) {
        this.warnings.push({
          file: fileName,
          warnings,
        });
      } else if (hasUseAPICall || hasUseAPIImport) {
        this.clean.push(fileName);
      }
    } catch (error) {
      logError(`Error scanning ${filePath}: ${error.message}`);
    }
  }

  scanDirectory(dirPath) {
    const files = fs.readdirSync(dirPath);

    for (const file of files) {
      const fullPath = path.join(dirPath, file);
      const stat = fs.statSync(fullPath);

      if (
        stat.isDirectory() &&
        !file.startsWith(".") &&
        file !== "node_modules"
      ) {
        this.scanDirectory(fullPath);
      } else if (file.endsWith(".tsx") || file.endsWith(".ts")) {
        this.scanFile(fullPath);
      }
    }
  }

  generateReport() {
    logSection("Authentication Violations Report");

    if (this.violations.length === 0) {
      logSuccess("No authentication violations found! 🎉");
    } else {
      logError(
        `Found ${this.violations.length} files with authentication violations:`
      );

      this.violations.forEach(({ file, violations }) => {
        log(`\n📁 ${file}:`);
        violations.forEach((violation) => {
          const severity =
            violation.severity === "HIGH" ? COLORS.RED : COLORS.YELLOW;
          log(
            `   ${severity}${violation.type}${COLORS.RESET}: ${violation.message}`
          );
        });
      });
    }

    if (this.warnings.length > 0) {
      logSection("Warnings");
      logWarning(`Found ${this.warnings.length} files with potential issues:`);

      this.warnings.forEach(({ file, warnings }) => {
        log(`\n📁 ${file}:`);
        warnings.forEach((warning) => {
          log(
            `   ${COLORS.YELLOW}${warning.type}${COLORS.RESET}: ${warning.message}`
          );
        });
      });
    }

    if (this.clean.length > 0) {
      logSection("Clean Files");
      logSuccess(
        `Found ${this.clean.length} files using proper authentication patterns:`
      );
      this.clean.slice(0, 10).forEach((file) => {
        log(`   ✅ ${file}`);
      });
      if (this.clean.length > 10) {
        log(`   ... and ${this.clean.length - 10} more`);
      }
    }

    // Generate summary
    logSection("Summary");
    log(
      `📊 Total files scanned: ${this.violations.length + this.warnings.length + this.clean.length}`
    );
    logError(`❌ Violations: ${this.violations.length}`);
    logWarning(`⚠️  Warnings: ${this.warnings.length}`);
    logSuccess(`✅ Clean: ${this.clean.length}`);

    const totalIssues = this.violations.length + this.warnings.length;
    const cleanPercentage = Math.round(
      (this.clean.length / (this.clean.length + totalIssues)) * 100
    );

    if (this.violations.length === 0) {
      logSuccess(
        `🎯 Authentication compliance: ${cleanPercentage}% (No critical violations!)`
      );
    } else {
      logError(
        `🎯 Authentication compliance: ${cleanPercentage}% (${this.violations.length} critical violations need fixing)`
      );
    }

    // Provide actionable next steps
    logSection("Next Steps");

    if (this.violations.length > 0) {
      logError("🚨 CRITICAL: Fix authentication violations immediately:");
      logInfo("1. Replace raw fetch() calls with useAPI() hook");
      logInfo("2. Remove manual Authorization headers");
      logInfo("3. Add proper loading states when API not ready");
      logInfo("4. Include api in useEffect dependencies");
    }

    if (this.warnings.length > 0) {
      logWarning(
        "⚠️  Consider reviewing warning files for potential improvements"
      );
    }

    if (this.violations.length === 0 && this.warnings.length === 0) {
      logSuccess("🎉 All files follow proper authentication patterns!");
      logInfo(
        "Consider running this scan before each deployment to prevent regressions"
      );
    }

    return this.violations.length === 0;
  }

  printAllFileNames() {
    logSection("Complete File Lists");

    if (this.violations.length > 0) {
      log(
        `\n${COLORS.RED}${COLORS.BOLD}❌ CRITICAL VIOLATIONS (${this.violations.length} files):${COLORS.RESET}`
      );
      this.violations.forEach(({ file }) => {
        log(`${file}`);
      });
    }

    if (this.warnings.length > 0) {
      log(
        `\n${COLORS.YELLOW}${COLORS.BOLD}⚠️  WARNINGS (${this.warnings.length} files):${COLORS.RESET}`
      );
      this.warnings.forEach(({ file }) => {
        log(`${file}`);
      });
    }

    if (this.clean.length > 0) {
      log(
        `\n${COLORS.GREEN}${COLORS.BOLD}✅ CLEAN FILES (${this.clean.length} files):${COLORS.RESET}`
      );
      this.clean.forEach((file) => {
        log(`${file}`);
      });
    }

    // Print copy-paste friendly lists
    logSection("Copy-Paste Friendly Lists");

    if (this.violations.length > 0) {
      log(
        `\n${COLORS.BOLD}Critical Violations Files (space-separated):${COLORS.RESET}`
      );
      log(this.violations.map(({ file }) => file).join(" "));

      log(
        `\n${COLORS.BOLD}Critical Violations Files (one per line):${COLORS.RESET}`
      );
      this.violations.forEach(({ file }) => {
        log(file);
      });
    }

    if (this.warnings.length > 0) {
      log(`\n${COLORS.BOLD}Warning Files (space-separated):${COLORS.RESET}`);
      log(this.warnings.map(({ file }) => file).join(" "));
    }

    // Print file type statistics
    logSection("File Type Statistics");

    const getFileStats = (files) => {
      const stats = {};
      files.forEach((file) => {
        const dir = file.split("/")[1] || "root";
        stats[dir] = (stats[dir] || 0) + 1;
      });
      return stats;
    };

    if (this.violations.length > 0) {
      log(`\n${COLORS.BOLD}Violations by Directory:${COLORS.RESET}`);
      const violationFiles = this.violations.map(({ file }) => file);
      const violationStats = getFileStats(violationFiles);
      Object.entries(violationStats)
        .sort(([, a], [, b]) => b - a)
        .forEach(([dir, count]) => {
          log(`  ${dir}: ${count} files`);
        });
    }

    if (this.clean.length > 0) {
      log(`\n${COLORS.BOLD}Clean Files by Directory:${COLORS.RESET}`);
      const cleanStats = getFileStats(this.clean);
      Object.entries(cleanStats)
        .sort(([, a], [, b]) => b - a)
        .forEach(([dir, count]) => {
          log(`  ${dir}: ${count} files`);
        });
    }
  }
}

// Main execution
if (require.main === module) {
  try {
    logSection("Authentication Violations Scanner");
    logInfo(
      "Scanning for components using raw fetch() instead of useAPI() hook..."
    );

    const scanner = new AuthViolationScanner();

    // Scan key directories
    const dirsToScan = ["src/components", "src/app", "src/pages", "src/hooks"];

    dirsToScan.forEach((dir) => {
      if (fs.existsSync(dir)) {
        logInfo(`Scanning directory: ${dir}`);
        scanner.scanDirectory(dir);
      }
    });

    const isClean = scanner.generateReport();

    // Print complete file lists for easy reference
    scanner.printAllFileNames();

    // Exit with error code if violations found
    process.exit(isClean ? 0 : 1);
  } catch (error) {
    logError(`Scanner error: ${error.message}`);
    process.exit(1);
  }
}

module.exports = AuthViolationScanner;
