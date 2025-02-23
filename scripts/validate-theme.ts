#!/usr/bin/env node

import { fileURLToPath } from "url";
import { dirname } from "path";
import glob from "glob";
import fs from "fs";
import chalk from "chalk";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const IGNORED_DIRS = ["node_modules", ".git", "dist", "build", ".next"];

interface ThemeValidation {
  file: string;
  line: number;
  issue: string;
  severity: "error" | "warning";
}

// Allowed patterns
const PATTERNS = {
  cssVariables:
    /var\(--(background|text|border|accent|muted|destructive|ring|input|card|popover|primary|secondary|foreground).*?\)/,
  tailwindColors: /\b(bg|text|border|ring|shadow)-zinc-\d{3}\b/,
  tailwindOpacity: /\b(bg|text|border|ring|shadow)-opacity-\[\d+\]/,
  allowedColors: /\b(white|black|transparent|current)\b/,
  themeColors: /hsl\(var\(--.+?\)\)/,
  semanticColors:
    /\b(bg|text|border|ring|outline|shadow|divide)-(destructive|success|warning|info)-\d{2,3}\b/,
};

// Patterns that indicate violations
const VIOLATIONS = {
  hexColors: /#[0-9a-fA-F]{3,8}\b/,
  rgbColors: /\brgb\([^)]+\)/,
  hslColors: /\bhsl\([^)]+\)(?!.*var)/,
  namedColors:
    /\b(?!white|black|transparent|current)(red|blue|green|yellow|purple|orange|gray|grey)\b/,
  nonZincColors:
    /\b(bg|text|border|ring|shadow)-(?!zinc|white|black|transparent|current|destructive|success|warning|info)([a-z]+)-\d{3}\b/,
};

const getAllFiles = (dir: string): string[] => {
  const files: string[] = [];
  const items = fs.readdirSync(dir);

  items.forEach((item) => {
    const fullPath = path.join(dir, item);
    if (fs.statSync(fullPath).isDirectory()) {
      if (!IGNORED_DIRS.some((ignored) => fullPath.includes(ignored))) {
        files.push(...getAllFiles(fullPath));
      }
    } else if (/\.(jsx?|tsx?|css|scss)$/.test(item)) {
      files.push(fullPath);
    }
  });

  return files;
};

const validateFile = (filePath: string): ThemeValidation[] => {
  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split("\n");
  const issues: ThemeValidation[] = [];
  const relativePath = path.relative(process.cwd(), filePath);

  lines.forEach((line, index) => {
    // Skip comments and variable definitions
    if (line.trim().startsWith("//") || line.trim().startsWith("/*")) return;
    if (line.includes("--") && line.includes(":")) return;

    // Check for violations
    Object.entries(VIOLATIONS).forEach(([type, pattern]) => {
      const matches = line.match(pattern);
      if (matches) {
        matches.forEach((match) => {
          // Check if the match is part of an allowed pattern
          const isAllowed = Object.values(PATTERNS).some((allowedPattern) =>
            line
              .match(allowedPattern)
              ?.some((allowed) => allowed.includes(match))
          );

          if (!isAllowed) {
            issues.push({
              file: relativePath,
              line: index + 1,
              issue: `Found non-compliant ${type}: ${match}`,
              severity: type === "nonZincColors" ? "warning" : "error",
            });
          }
        });
      }
    });
  });

  return issues;
};

const allowedColors = [
  // Semantic colors
  "destructive",
  "success",
  "warning",
  "info",
  // Neutral colors
  "zinc",
  // Base colors
  "white",
  "black",
  "transparent",
  "current",
];

function validateColors(content: string): string[] {
  const issues: string[] = [];

  // Match Tailwind color classes
  const colorRegex =
    /(text|bg|border|ring|outline|shadow|divide)-([a-z]+)(?:-[0-9]{2,3})?/g;
  const matches = content.matchAll(colorRegex);

  for (const match of matches) {
    const [fullMatch, prefix, color] = match;

    if (!allowedColors.includes(color)) {
      issues.push(`Found non-compliant color: ${color}`);
    }
  }

  return issues;
}

const main = async () => {
  console.log(chalk.blue("🔍 Validating theme usage..."));

  const files = getAllFiles(path.join(__dirname, ".."));
  const allIssues: ThemeValidation[] = [];

  files.forEach((file) => {
    const issues = validateFile(file);
    allIssues.push(...issues);
  });

  if (allIssues.length === 0) {
    console.log(chalk.green("✅ No theme violations found!"));
    return;
  }

  // Group issues by severity
  const errors = allIssues.filter((issue) => issue.severity === "error");
  const warnings = allIssues.filter((issue) => issue.severity === "warning");

  if (errors.length > 0) {
    console.log(chalk.red(`\n❌ Found ${errors.length} errors:`));
    errors.forEach((issue) => {
      console.log(chalk.white(`\n📄 ${issue.file}:${issue.line}`));
      console.log(chalk.red(`   ${issue.issue}`));
    });
  }

  if (warnings.length > 0) {
    console.log(chalk.yellow(`\n⚠️  Found ${warnings.length} warnings:`));
    warnings.forEach((issue) => {
      console.log(chalk.white(`\n📄 ${issue.file}:${issue.line}`));
      console.log(chalk.yellow(`   ${issue.issue}`));
    });
  }

  console.log("\nRecommendations:");
  console.log("1. Use CSS variables from theme.css for semantic colors");
  console.log("2. Use Tailwind zinc scale for grays");
  console.log("3. Use opacity modifiers with Tailwind classes");
  console.log("4. Use HSL color format with CSS variables\n");

  if (errors.length > 0) {
    process.exit(1);
  }
};

main().catch((error) => {
  console.error(chalk.red("Error:"), error);
  process.exit(1);
});
