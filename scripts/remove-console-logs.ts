#!/usr/bin/env tsx

import { readFileSync, writeFileSync, readdirSync, statSync } from "fs";
import path from "path";

interface ConsoleLogMatch {
  file: string;
  line: number;
  content: string;
  type: "log" | "warn" | "error" | "info" | "debug";
}

const CONSOLE_LOG_REGEX =
  /console\.(log|warn|error|info|debug)\s*\([^)]*\)\s*;?/g;
const GUARDED_REGEX =
  /if\s*\(\s*process\.env\.NODE_ENV\s*!==\s*['"]production['"]\s*\)\s*\{[\s\S]*?\}/g;

function getAllFiles(
  dirPath: string,
  extensions: string[] = [".ts", ".tsx", ".js", ".jsx"]
): string[] {
  const files: string[] = [];

  function traverse(currentPath: string) {
    const items = readdirSync(currentPath);

    for (const item of items) {
      const fullPath = path.join(currentPath, item);
      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        // Skip node_modules and other irrelevant directories
        if (
          !["node_modules", ".next", ".git", "dist", "build"].includes(item)
        ) {
          traverse(fullPath);
        }
      } else if (stat.isFile()) {
        const ext = path.extname(fullPath);
        if (extensions.includes(ext)) {
          // Skip certain files
          const relativePath = path.relative(process.cwd(), fullPath);
          if (
            !relativePath.includes("node_modules") &&
            !relativePath.includes(".d.ts") &&
            !relativePath.includes("scripts/") &&
            !relativePath.includes("src/scripts/") &&
            relativePath !== "src/lib/logger.ts"
          ) {
            files.push(fullPath);
          }
        }
      }
    }
  }

  traverse(dirPath);
  return files;
}

async function findConsoleLogsInFile(
  filePath: string
): Promise<ConsoleLogMatch[]> {
  const content = readFileSync(filePath, "utf-8");
  const lines = content.split("\n");
  const matches: ConsoleLogMatch[] = [];

  lines.forEach((line, index) => {
    const consoleMatches = line.match(/console\.(log|warn|error|info|debug)/g);
    if (consoleMatches) {
      // Check if this line is within a NODE_ENV guard
      const lineStart = content.split("\n").slice(0, index).join("\n").length;
      const lineEnd = lineStart + line.length;

      let isGuarded = false;
      const guardedMatches = [...content.matchAll(GUARDED_REGEX)];

      for (const guardMatch of guardedMatches) {
        const guardStart = guardMatch.index || 0;
        const guardEnd = guardStart + guardMatch[0].length;

        if (lineStart >= guardStart && lineEnd <= guardEnd) {
          isGuarded = true;
          break;
        }
      }

      if (!isGuarded) {
        consoleMatches.forEach((match) => {
          const type = match.split(".")[1] as
            | "log"
            | "warn"
            | "error"
            | "info"
            | "debug";
          matches.push({
            file: filePath,
            line: index + 1,
            content: line.trim(),
            type,
          });
        });
      }
    }
  });

  return matches;
}

async function removeConsoleLogsFromFile(
  filePath: string,
  dryRun: boolean = false
): Promise<number> {
  const content = readFileSync(filePath, "utf-8");
  let modifiedContent = content;
  let removedCount = 0;

  // Remove unguarded console logs (but preserve console.warn and console.error in production)
  const linesToProcess = modifiedContent.split("\n");
  const processedLines = linesToProcess.map((line) => {
    // Skip lines that are already guarded
    if (line.includes("process.env.NODE_ENV") && line.includes("production")) {
      return line;
    }

    // Remove console.log, console.info, console.debug (but keep warn/error)
    const originalLine = line;
    line = line.replace(
      /console\.(log|info|debug)\s*\([^)]*\)\s*;?/g,
      (match) => {
        removedCount++;
        // Replace with empty string or comment
        return `// [REMOVED] ${match}`;
      }
    );

    return line;
  });

  modifiedContent = processedLines.join("\n");

  if (!dryRun && removedCount > 0) {
    writeFileSync(filePath, modifiedContent, "utf-8");
    console.log(`✅ Removed ${removedCount} console logs from ${filePath}`);
  }

  return removedCount;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const fix = args.includes("--fix");

  console.log("🔍 Scanning for unguarded console logs...\n");

  // Find all TypeScript and JavaScript files
  const files = getAllFiles("src");

  let totalUnguardedLogs = 0;
  let totalRemovedLogs = 0;
  const problemFiles: string[] = [];

  for (const file of files) {
    const unguardedLogs = await findConsoleLogsInFile(file);

    if (unguardedLogs.length > 0) {
      totalUnguardedLogs += unguardedLogs.length;
      problemFiles.push(file);

      const relativePath = path.relative(process.cwd(), file);
      console.log(`❌ ${relativePath}:`);
      unguardedLogs.forEach((log) => {
        console.log(`   Line ${log.line}: ${log.content}`);
      });
      console.log("");

      if (fix) {
        const removedCount = await removeConsoleLogsFromFile(file, dryRun);
        totalRemovedLogs += removedCount;
      }
    }
  }

  console.log("\n📊 Summary:");
  console.log(`   Scanned: ${files.length} files`);
  console.log(`   Files with unguarded console logs: ${problemFiles.length}`);
  console.log(`   Total unguarded console logs: ${totalUnguardedLogs}`);

  if (fix) {
    console.log(`   Console logs removed: ${totalRemovedLogs}`);
    if (!dryRun) {
      console.log("\n✅ Console logs have been removed from production build!");
    } else {
      console.log(
        "\n🔍 Dry run completed. Use --fix without --dry-run to actually remove logs."
      );
    }
  } else {
    console.log("\n💡 Run with --fix to remove unguarded console logs");
    console.log("💡 Run with --fix --dry-run to see what would be removed");
  }

  if (totalUnguardedLogs > 0 && !fix) {
    console.log(
      "\n⚠️  WARNING: Unguarded console logs found that will appear in production!"
    );
    console.log(
      "   Recommendation: Guard with NODE_ENV checks or use the new logger utility."
    );
    process.exit(1);
  }
}

// Run the main function if this script is executed directly
main().catch(console.error);
