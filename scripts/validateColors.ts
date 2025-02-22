#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import chalk from "chalk";
import glob from "glob";

interface ColorIssue {
  file: string;
  line: number;
  match: string;
  suggestion: string;
}

const EXCLUDED_DIRS = ["node_modules", "dist", ".next", "build"];
const CSS_COLOR_REGEX =
  /#[0-9a-fA-F]{3,6}\b|rgb\([^)]+\)|rgba\([^)]+\)|#\[[^\]]+\]/g;
const TAILWIND_COLOR_REGEX =
  /\b(?:bg|text|border|ring|shadow)-(?:\[[^\]]+\]|\w+-\d{3})/g;

// CSS Variables from theme.css
const THEME_COLORS = {
  "var(--background-primary)": "var(--background-primary)",
  "var(--background-secondary)": "var(--background-secondary)",
  "var(--background-tertiary)": "var(--background-tertiary)",
  "var(--text-primary)": "var(--text-primary)",
  "var(--text-secondary)": "var(--text-secondary)",
  "var(--text-tertiary)": "var(--text-tertiary)",
} as const;

type ThemeColor = keyof typeof THEME_COLORS;

function getSuggestion(color: string): string {
  const normalizedColor = color.toLowerCase();
  return (
    (THEME_COLORS[normalizedColor as ThemeColor] as string) ||
    "Consider using a CSS variable"
  );
}

async function findColorIssues(directory: string): Promise<ColorIssue[]> {
  const issues: ColorIssue[] = [];

  const files = glob.sync("**/*.{ts,tsx,js,jsx,css,scss}", {
    cwd: directory,
    ignore: EXCLUDED_DIRS,
    nodir: true,
  });

  for (const file of files) {
    try {
      const filePath = path.join(directory, file);
      const stats = fs.statSync(filePath);

      if (!stats.isFile()) continue;

      const content = fs.readFileSync(filePath, "utf-8");
      const lines = content.split("\n");

      lines.forEach((line, index) => {
        // Check for hardcoded colors
        const colorMatches = line.match(CSS_COLOR_REGEX);
        const tailwindMatches = line.match(TAILWIND_COLOR_REGEX);

        if (colorMatches) {
          colorMatches.forEach((match) => {
            // Skip if it's a CSS variable definition
            if (line.includes("--") && line.includes(":")) return;

            issues.push({
              file,
              line: index + 1,
              match,
              suggestion: getSuggestion(match),
            });
          });
        }

        if (tailwindMatches) {
          tailwindMatches.forEach((match) => {
            if (match.includes("[#")) {
              issues.push({
                file,
                line: index + 1,
                match,
                suggestion:
                  "Use Tailwind theme variables or CSS variables instead of hardcoded colors",
              });
            }
          });
        }
      });
    } catch (error) {
      console.error(chalk.red(`Error processing file ${file}:`), error);
    }
  }

  return issues;
}

async function main() {
  try {
    const workingDir = process.cwd();
    console.log(chalk.blue("🔍 Scanning for color usage issues..."));

    const issues = await findColorIssues(workingDir);

    if (issues.length === 0) {
      console.log(chalk.green("✅ No color usage issues found!"));
      return;
    }

    console.log(
      chalk.yellow(`\n⚠️  Found ${issues.length} color usage issues:\n`)
    );

    issues.forEach((issue, index) => {
      console.log(chalk.white(`${index + 1}. ${issue.file}:${issue.line}`));
      console.log(chalk.gray(`   Found: ${issue.match}`));
      console.log(chalk.green(`   Suggestion: ${issue.suggestion}\n`));
    });

    console.log(chalk.yellow("\nRecommendations:"));
    console.log("1. Use CSS variables from theme.css for consistent theming");
    console.log("2. Use Tailwind color classes without hardcoded values");
    console.log("3. Update component styles to use theme variables\n");
  } catch (error) {
    console.error(chalk.red("Error running color validation:"), error);
    process.exit(1);
  }
}

main();
