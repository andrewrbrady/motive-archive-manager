#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const IGNORED_DIRS = ["node_modules", ".git", "dist", "build", ".next"];

// Patterns to find color-related code
const patterns = {
  // CSS Custom Properties
  cssVariables:
    /--(?!radius|navbar|ring-offset|ring).*?:\s*(#[0-9a-f]{3,8}|rgb[a]?\(.*?\)|hsl[a]?\(.*?\))/gi,

  // CSS color properties
  cssColors:
    /(?:color|background|border-color|fill|stroke):\s*(#[0-9a-f]{3,8}|rgb[a]?\(.*?\)|hsl[a]?\(.*?\))/gi,

  // Tailwind theme extensions
  tailwindTheme:
    /(?:colors|backgroundColor|textColor|borderColor):\s*{[\s\S]*?}/g,

  // CSS Custom Properties in :root
  rootVariables: /:root\s*{[\s\S]*?}/g,

  // Dark mode overrides
  darkModeOverrides: /\.dark\s*{[\s\S]*?}/g,
};

const getAllFiles = (dir) => {
  const files = [];
  const items = fs.readdirSync(dir);

  items.forEach((item) => {
    const fullPath = path.join(dir, item);
    if (fs.statSync(fullPath).isDirectory()) {
      if (!IGNORED_DIRS.some((ignored) => fullPath.includes(ignored))) {
        files.push(...getAllFiles(fullPath));
      }
    } else if (/\.(jsx?|tsx?|css|scss|config\.(js|ts))$/.test(item)) {
      files.push(fullPath);
    }
  });

  return files;
};

const findOverrides = () => {
  const files = getAllFiles(path.join(__dirname, ".."));
  const overrides = {
    cssVariables: [],
    cssColors: [],
    tailwindTheme: [],
    rootVariables: [],
    darkModeOverrides: [],
  };

  files.forEach((file) => {
    const content = fs.readFileSync(file, "utf8");
    const relativePath = path.relative(path.join(__dirname, ".."), file);

    // Check each pattern
    Object.entries(patterns).forEach(([type, pattern]) => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const lineNumber = content.substring(0, match.index).split("\n").length;
        const context = match[0].split("\n").slice(0, 3).join("\n"); // First 3 lines of context

        overrides[type].push({
          file: relativePath,
          line: lineNumber,
          context: context.trim(),
          type,
        });
      }
    });
  });

  return overrides;
};

// Helper to format the output
const formatOverrides = (overrides) => {
  let output = "";

  // Group by file first
  const byFile = {};
  Object.entries(overrides).forEach(([type, items]) => {
    items.forEach((item) => {
      if (!byFile[item.file]) byFile[item.file] = [];
      byFile[item.file].push(item);
    });
  });

  // Output findings by file
  Object.entries(byFile).forEach(([file, items]) => {
    output += `\n\nFile: ${file}\n${"=".repeat(file.length + 6)}\n`;

    // Sort items by line number
    items.sort((a, b) => a.line - b.line);

    items.forEach((item) => {
      output += `\nLine ${item.line} (${item.type}):\n${item.context}\n`;
    });
  });

  return output;
};

// Main execution
console.log("Searching for color-related overrides...");
const overrides = findOverrides();

// Count total overrides
const totalOverrides = Object.values(overrides).reduce(
  (sum, arr) => sum + arr.length,
  0
);

console.log("\nOverride Summary:");
console.log("----------------");
Object.entries(overrides).forEach(([type, items]) => {
  console.log(`${type}: ${items.length} occurrences`);
});
console.log(`\nTotal overrides found: ${totalOverrides}`);

// Detailed findings
console.log("\nDetailed Findings:");
console.log(formatOverrides(overrides));

console.log("\nRecommendations:");
console.log(
  "1. Review CSS variables in :root and consider replacing with Tailwind zinc scale"
);
console.log("2. Check dark mode overrides for redundant color definitions");
console.log(
  "3. Look for direct color values that could be replaced with Tailwind classes"
);
console.log(
  "4. Review Tailwind theme extensions that might be unnecessary with zinc scale"
);
