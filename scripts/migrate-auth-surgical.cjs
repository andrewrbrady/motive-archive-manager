const fs = require("fs");
const path = require("path");
const glob = require("glob");

/**
 * SURGICAL AUTH MIGRATION SCRIPT
 *
 * This script performs very precise, targeted migrations to avoid corruption.
 * Each step is isolated and can be run independently.
 */

class SurgicalAuthMigrator {
  constructor() {
    this.targetDir = "src";
    this.excludePatterns = [
      "**/node_modules/**",
      "**/.next/**",
      "**/dist/**",
      "**/build/**",
      "**/*.d.ts",
      // Core auth files that shouldn't be migrated
      "**/hooks/useFirebaseAuth.ts",
      "**/lib/firebase.ts",
      "**/lib/firebase-admin.ts",
      "**/lib/firebase-auth-middleware.ts",
    ];

    this.stats = {
      filesAnalyzed: 0,
      filesModified: 0,
      patterns: {
        importsUpdated: 0,
        hookReplacements: 0,
        userCheckUpdates: 0,
        tokenCallsRemoved: 0,
        bearerTokensUpdated: 0,
        orphanedRefsFixed: 0,
      },
    };

    this.backupDir = "migration-backups-surgical";
    this.dryRun = false;
    this.debug = false;
  }

  log(message, level = "info") {
    const timestamp = new Date().toISOString();
    const prefix =
      level === "debug" && !this.debug
        ? ""
        : `[${timestamp}] [${level.toUpperCase()}]`;
    if (level !== "debug" || this.debug) {
      console.log(`${prefix} ${message}`);
    }
  }

  async createBackup(filePath) {
    if (this.dryRun) return;

    const backupPath = path.join(this.backupDir, filePath);
    const backupDirPath = path.dirname(backupPath);

    if (!fs.existsSync(backupDirPath)) {
      fs.mkdirSync(backupDirPath, { recursive: true });
    }

    fs.copyFileSync(filePath, backupPath);
  }

  findFiles() {
    const patterns = [
      `${this.targetDir}/**/*.tsx`,
      `${this.targetDir}/**/*.ts`,
    ];

    let files = [];
    patterns.forEach((pattern) => {
      files = files.concat(
        glob.sync(pattern, {
          ignore: this.excludePatterns,
          absolute: false,
        })
      );
    });

    return [...new Set(files)].sort();
  }

  // STEP 1: Fix import statements
  fixImports(content) {
    let modified = false;
    let newContent = content;

    // Pattern 1: Add useSession to existing useFirebaseAuth import
    const importPattern1 =
      /import\s*\{\s*([^}]*useFirebaseAuth[^}]*)\s*\}\s*from\s*["']@\/hooks\/useFirebaseAuth["']/;
    if (importPattern1.test(newContent) && !newContent.includes("useSession")) {
      newContent = newContent.replace(importPattern1, (match, imports) => {
        if (!imports.includes("useSession")) {
          const cleanImports = imports.trim();
          const newImports = cleanImports.endsWith(",")
            ? `${cleanImports} useSession`
            : `${cleanImports}, useSession`;
          this.stats.patterns.importsUpdated++;
          modified = true;
          return `import { ${newImports} } from "@/hooks/useFirebaseAuth"`;
        }
        return match;
      });
    }

    // Pattern 2: Standalone useFirebaseAuth import
    const importPattern2 =
      /import\s*\{\s*useFirebaseAuth\s*\}\s*from\s*["']@\/hooks\/useFirebaseAuth["']/;
    if (importPattern2.test(newContent)) {
      newContent = newContent.replace(
        importPattern2,
        'import { useSession, useFirebaseAuth } from "@/hooks/useFirebaseAuth"'
      );
      this.stats.patterns.importsUpdated++;
      modified = true;
    }

    return { content: newContent, modified };
  }

  // STEP 2: Replace hook usage
  replaceHooks(content) {
    let modified = false;
    let newContent = content;

    // Replace useFirebaseAuth() with useSession()
    const hookPattern = /const\s+\{\s*([^}]*)\s*\}\s*=\s*useFirebaseAuth\(\)/g;
    newContent = newContent.replace(hookPattern, (match, destructure) => {
      // Keep existing destructuring but change hook name
      this.stats.patterns.hookReplacements++;
      modified = true;
      return `const { ${destructure} } = useSession()`;
    });

    return { content: newContent, modified };
  }

  // STEP 3: Update user null checks
  updateUserChecks(content) {
    let modified = false;
    let newContent = content;

    // Pattern: !user -> !session
    const userCheckPattern = /\!user\b/g;
    if (userCheckPattern.test(newContent)) {
      newContent = newContent.replace(userCheckPattern, "!session");
      this.stats.patterns.userCheckUpdates++;
      modified = true;
    }

    // Pattern: if (user) -> if (session)
    const ifUserPattern = /if\s*\(\s*user\s*\)/g;
    if (ifUserPattern.test(newContent)) {
      newContent = newContent.replace(ifUserPattern, "if (session)");
      this.stats.patterns.userCheckUpdates++;
      modified = true;
    }

    return { content: newContent, modified };
  }

  // STEP 4: Remove token declarations (conservative)
  removeTokenDeclarations(content) {
    let modified = false;
    let newContent = content;

    // Only remove obvious token declarations
    const tokenPatterns = [
      /const\s+token\s*=\s*await\s+user\.getIdToken\(\)\s*;?\s*\n/g,
      /const\s+idToken\s*=\s*await\s+user\.getIdToken\(\)\s*;?\s*\n/g,
    ];

    tokenPatterns.forEach((pattern) => {
      if (pattern.test(newContent)) {
        newContent = newContent.replace(pattern, "");
        this.stats.patterns.tokenCallsRemoved++;
        modified = true;
      }
    });

    return { content: newContent, modified };
  }

  // STEP 5: Fix Bearer token usage (conservative)
  fixBearerTokens(content) {
    let modified = false;
    let newContent = content;

    // Only replace obvious Bearer token patterns
    const bearerPatterns = [
      {
        pattern: /Authorization:\s*`Bearer\s*\$\{token\}`/g,
        replacement: "// Authorization handled by useAPI",
      },
      {
        pattern: /Authorization:\s*`Bearer\s*\$\{idToken\}`/g,
        replacement: "// Authorization handled by useAPI",
      },
      {
        pattern: /"Authorization":\s*`Bearer\s*\$\{token\}`/g,
        replacement: '// "Authorization": "handled by useAPI"',
      },
    ];

    bearerPatterns.forEach(({ pattern, replacement }) => {
      if (pattern.test(newContent)) {
        newContent = newContent.replace(pattern, replacement);
        this.stats.patterns.bearerTokensUpdated++;
        modified = true;
      }
    });

    return { content: newContent, modified };
  }

  // STEP 6: Add useAPI hook where needed
  addAPIHook(content) {
    let modified = false;
    let newContent = content;

    // Check if file has fetch calls but no useAPI
    const hasFetch = /fetch\s*\(/g.test(newContent);
    const hasUseAPI = /useAPI/g.test(newContent);
    const hasAPIImport = /import.*useAPI.*from.*@\/lib\/fetcher/g.test(
      newContent
    );

    if (hasFetch && !hasUseAPI) {
      // Add useAPI import
      if (!hasAPIImport) {
        const importRegex =
          /import.*from\s*["']@\/hooks\/useFirebaseAuth["'];?\s*\n/;
        if (importRegex.test(newContent)) {
          newContent = newContent.replace(importRegex, (match) => {
            modified = true;
            return match + 'import { useAPI } from "@/lib/fetcher";\n';
          });
        }
      }

      // Add useAPI hook declaration after useSession
      const hookRegex = /(const\s*\{\s*[^}]*\}\s*=\s*useSession\(\);?\s*\n)/;
      if (hookRegex.test(newContent) && !hasUseAPI) {
        newContent = newContent.replace(hookRegex, (match) => {
          modified = true;
          return match + "  const api = useAPI();\n";
        });
      }
    }

    return { content: newContent, modified };
  }

  async migrateFile(filePath) {
    this.log(`📁 Analyzing: ${filePath}`, "debug");

    const content = fs.readFileSync(filePath, "utf-8");

    // Skip files that don't contain authentication patterns
    if (
      !content.includes("useFirebaseAuth") &&
      !content.includes("getIdToken") &&
      !content.includes("Bearer")
    ) {
      this.log(`⏭️  Skipping ${filePath} - no auth patterns found`, "debug");
      return false;
    }

    this.log(`🔍 Processing: ${filePath}`);

    await this.createBackup(filePath);

    let currentContent = content;
    let totalModified = false;

    // Apply migrations step by step
    const steps = [
      { name: "Fix Imports", fn: this.fixImports.bind(this) },
      { name: "Replace Hooks", fn: this.replaceHooks.bind(this) },
      { name: "Update User Checks", fn: this.updateUserChecks.bind(this) },
      {
        name: "Remove Token Declarations",
        fn: this.removeTokenDeclarations.bind(this),
      },
      { name: "Fix Bearer Tokens", fn: this.fixBearerTokens.bind(this) },
      { name: "Add API Hook", fn: this.addAPIHook.bind(this) },
    ];

    for (const step of steps) {
      const result = step.fn(currentContent);
      if (result.modified) {
        this.log(`  ✅ ${step.name}`, "debug");
        currentContent = result.content;
        totalModified = true;
      } else {
        this.log(`  ⏭️  ${step.name} - no changes`, "debug");
      }
    }

    if (totalModified) {
      if (!this.dryRun) {
        fs.writeFileSync(filePath, currentContent, "utf-8");
      }
      this.log(`✅ Modified: ${filePath}`);
      return true;
    } else {
      this.log(`ℹ️  No changes: ${filePath}`, "debug");
      return false;
    }
  }

  async run() {
    this.log("🚀 Starting Surgical Auth Migration...");
    this.log(`📊 Mode: ${this.dryRun ? "DRY RUN" : "LIVE"}`);
    this.log(`🐛 Debug: ${this.debug ? "ON" : "OFF"}`);

    // Create backup directory
    if (!this.dryRun && !fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
      this.log(`📂 Created backup directory: ${this.backupDir}`);
    }

    const files = this.findFiles();
    this.log(`🔍 Found ${files.length} files to analyze`);

    for (const file of files) {
      this.stats.filesAnalyzed++;
      const modified = await this.migrateFile(file);
      if (modified) {
        this.stats.filesModified++;
      }
    }

    this.log("\n📈 MIGRATION SUMMARY:");
    this.log(`Files analyzed: ${this.stats.filesAnalyzed}`);
    this.log(`Files modified: ${this.stats.filesModified}`);
    this.log("\n🔧 Pattern Changes:");
    Object.entries(this.stats.patterns).forEach(([key, value]) => {
      if (value > 0) {
        this.log(`  ${key}: ${value}`);
      }
    });

    if (this.dryRun) {
      this.log("\n⚠️  This was a DRY RUN - no files were actually modified");
      this.log("Run with --live to apply changes");
    } else {
      this.log(`\n✅ Migration complete! Backups stored in: ${this.backupDir}`);
    }
  }
}

// CLI handling
async function main() {
  const args = process.argv.slice(2);
  const migrator = new SurgicalAuthMigrator();

  if (args.includes("--live")) {
    migrator.dryRun = false;
  } else {
    migrator.dryRun = true;
  }

  if (args.includes("--debug")) {
    migrator.debug = true;
  }

  await migrator.run();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { SurgicalAuthMigrator };
