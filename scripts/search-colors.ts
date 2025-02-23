#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import chalk from "chalk";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const IGNORED_DIRS = ["node_modules", ".git", "dist", "build", ".next"];

// Patterns to find color-related code
const patterns = {
  hexColors: /#[0-9a-fA-F]{3,8}\b/g,
  rgbColors: /\brgb\([^)]+\)/g,
  rgbaColors: /\brgba\([^)]+\)/g,
  hslColors: /\bhsl\([^)]+\)/g,
  hslaColors: /\bhsla\([^)]+\)/g,
  namedColors:
    /\b(red|blue|green|yellow|purple|orange|black|white|gray|grey)\b/g,
  tailwindColors:
    /\b(bg|text|border|ring|shadow)-(?!zinc|white|black|transparent|current)([a-z]+)-\d{3}/g,
};

interface ColorMatch {
  file: string;
  line: number;
  match: string;
  type: string;
}

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

const findColorMatches = (): ColorMatch[] => {
  const files = getAllFiles(path.join(__dirname, ".."));
  const matches: ColorMatch[] = [];

  files.forEach((file) => {
    const content = fs.readFileSync(file, "utf8");
    const lines = content.split("\n");

    lines.forEach((line, index) => {
      Object.entries(patterns).forEach(([type, pattern]) => {
        const colorMatches = line.match(pattern);
        if (colorMatches) {
          colorMatches.forEach((match) => {
            // Skip if it's inside a CSS variable definition
            if (line.includes("--") && line.includes(":")) return;

            // Skip if it's inside a comment
            if (line.trim().startsWith("//") || line.trim().startsWith("/*"))
              return;

            matches.push({
              file: path.relative(process.cwd(), file),
              line: index + 1,
              match,
              type,
            });
          });
        }
      });
    });
  });

  return matches;
};

const main = () => {
  console.log(chalk.blue("🔍 Scanning for hard-coded colors..."));
  const matches = findColorMatches();

  if (matches.length === 0) {
    console.log(chalk.green("✅ No hard-coded colors found!"));
    return;
  }

  console.log(
    chalk.yellow(`\n⚠️  Found ${matches.length} hard-coded colors:\n`)
  );

  // Group by file
  const groupedByFile = matches.reduce((acc, match) => {
    if (!acc[match.file]) {
      acc[match.file] = [];
    }
    acc[match.file].push(match);
    return acc;
  }, {} as Record<string, ColorMatch[]>);

  // Print results
  Object.entries(groupedByFile).forEach(([file, fileMatches]) => {
    console.log(chalk.white(`\n📄 ${file}:`));
    fileMatches.forEach((match) => {
      console.log(
        chalk.gray(`   Line ${match.line}: `) +
          chalk.yellow(match.match) +
          chalk.gray(` (${match.type})`)
      );
    });
  });

  console.log(chalk.yellow("\nRecommendations:"));
  console.log("1. Use CSS variables from theme.css for consistent theming");
  console.log("2. Use Tailwind color classes with the zinc scale");
  console.log("3. Update component styles to use theme variables\n");
};

main();
