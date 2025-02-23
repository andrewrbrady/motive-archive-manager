#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const IGNORED_DIRS = ["node_modules", ".git", "dist", "build", ".next"];

// Swap mappings
const swapMappings = {
  // Single border swaps
  "border-\\[var\\(--border-subtle\\)\\]": "border-[hsl(var(--border-subtle))]",
  "border-\\[var\\(--border-muted\\)\\]": "border-[hsl(var(--border-muted))]",
  "border-\\[var\\(--border-primary\\)\\]": "border-[hsl(var(--border-primary))]",

  // Dark mode border swaps
  "dark:border-\\[var\\(--border-muted\\)\\]":
    "dark:border-[hsl(var(--border-subtle))]",
  "dark:border-\\[var\\(--border-primary\\)\\]":
    "dark:border-[hsl(var(--border-subtle))]",
  "dark:border-[hsl(var(--border-subtle))]": "dark:border-[hsl(var(--border-subtle))]",
  "dark:border-[hsl(var(--border-subtle))]": "dark:border-[hsl(var(--border-subtle))]",
  "dark:border-[hsl(var(--border-subtle))]": "dark:border-[hsl(var(--border-subtle))]",

  // Combined border swaps
  "border border-\\[var\\(--border-subtle\\)\\]":
    "border border-[hsl(var(--border-subtle))]",
  "border border-\\[var\\(--border-muted\\)\\]":
    "border border-[hsl(var(--border-muted))]",
  "border border-\\[var\\(--border-primary\\)\\]":
    "border border-[hsl(var(--border-primary))]",

  // Combined with dark mode
  "border-\\[var\\(--border-muted\\)\\] dark:border-\\[var\\(--border-muted\\)\\]":
    "border-[hsl(var(--border-muted))] dark:border-[hsl(var(--border-subtle))]",
  "border-\\[var\\(--border-primary\\)\\] dark:border-\\[var\\(--border-primary\\)\\]":
    "border-[hsl(var(--border-primary))] dark:border-[hsl(var(--border-subtle))]",
  "border-\\[var\\(--border-muted\\)\\] dark:border-[hsl(var(--border-subtle))]":
    "border-[hsl(var(--border-muted))] dark:border-[hsl(var(--border-subtle))]",
  "border-\\[var\\(--border-muted\\)\\] dark:border-[hsl(var(--border-subtle))]":
    "border-[hsl(var(--border-muted))] dark:border-[hsl(var(--border-subtle))]",
  "border-\\[var\\(--border-muted\\)\\] dark:border-[hsl(var(--border-subtle))]":
    "border-[hsl(var(--border-muted))] dark:border-[hsl(var(--border-subtle))]",

  // Combined border patterns
  "border border-\\[var\\(--border-muted\\)\\] dark:border-\\[var\\(--border-muted\\)\\]":
    "border border-[hsl(var(--border-muted))] dark:border-[hsl(var(--border-subtle))]",
  "border border-\\[var\\(--border-primary\\)\\] dark:border-\\[var\\(--border-primary\\)\\]":
    "border border-[hsl(var(--border-primary))] dark:border-[hsl(var(--border-subtle))]",
  "border border-\\[var\\(--border-muted\\)\\] dark:border-[hsl(var(--border-subtle))]":
    "border border-[hsl(var(--border-muted))] dark:border-[hsl(var(--border-subtle))]",
  "border border-\\[var\\(--border-muted\\)\\] dark:border-[hsl(var(--border-subtle))]":
    "border border-[hsl(var(--border-muted))] dark:border-[hsl(var(--border-subtle))]",
  "border border-\\[var\\(--border-muted\\)\\] dark:border-[hsl(var(--border-subtle))]":
    "border border-[hsl(var(--border-muted))] dark:border-[hsl(var(--border-subtle))]",
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
    } else if (/\.(jsx?|tsx?)$/.test(item)) {
      files.push(fullPath);
    }
  });

  return files;
};

const swapFile = (filePath) => {
  let content = fs.readFileSync(filePath, "utf8");
  let modified = false;
  const changes = [];

  // Replace border variables
  Object.entries(swapMappings).forEach(([pattern, replacement]) => {
    const regex = new RegExp(pattern, "g");
    if (content.match(regex)) {
      const oldContent = content;
      content = content.replace(regex, replacement);
      if (oldContent !== content) {
        changes.push(`Swapped "${pattern}" with "${replacement}"`);
        modified = true;
      }
    }
  });

  if (modified) {
    fs.writeFileSync(filePath, content);
    return { filePath, changes };
  }

  return null;
};

const processFiles = () => {
  const files = getAllFiles(path.join(__dirname, ".."));
  const results = [];

  files.forEach((file) => {
    const result = swapFile(file);
    if (result) {
      results.push(result);
    }
  });

  return results;
};

// Main execution
console.log("Swapping border-subtle and border-muted variables...");
const results = processFiles();

console.log("\nSwap complete!");
console.log(`Modified ${results.length} files.\n`);

// Output detailed changes
results.forEach(({ filePath, changes }) => {
  const relativePath = path.relative(process.cwd(), filePath);
  console.log(`\nFile: ${relativePath}`);
  console.log("Changes:");
  changes.forEach((change) => console.log(`  - ${change}`));
});

console.log("\nNext steps:");
console.log("1. Test the application in both light and dark modes");
console.log("2. Verify border colors are now correctly applied");
console.log("3. Check for any edge cases that might need adjustment");
