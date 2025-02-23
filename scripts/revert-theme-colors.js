#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const IGNORED_DIRS = ["node_modules", ".git", "dist", "build", ".next"];

// Theme color mappings (reversed)
const themeColorMappings = {
  // Background colors
  "bg-\\[var\\(--background-primary\\)\\]": "bg-[var(--background-primary)]",
  "dark:bg-\\[var\\(--background-primary\\)\\]":
    "dark:bg-[var(--background-primary)]",

  // Border colors
  "border-\\[var\\(--border-subtle\\)\\]": "border-[hsl(var(--border-subtle))]",
  "dark:border-\\[var\\(--border-primary\\)\\]": "dark:border-[hsl(var(--border-subtle))]",
  "dark:border-\\[var\\(--border-muted\\)\\]": "dark:border-[hsl(var(--border-subtle))]",

  // Common combined patterns
  "bg-\\[var\\(--background-primary\\)\\] dark:bg-\\[var\\(--background-primary\\)\\]":
    "bg-[var(--background-primary)] dark:bg-[var(--background-primary)]",
  "border border-\\[var\\(--border-subtle\\)\\] dark:border-\\[var\\(--border-primary\\)\\]":
    "border border-[hsl(var(--border-subtle))] dark:border-[hsl(var(--border-subtle))]",
  "border border-\\[var\\(--border-subtle\\)\\] dark:border-\\[var\\(--border-muted\\)\\]":
    "border border-[hsl(var(--border-subtle))] dark:border-[hsl(var(--border-subtle))]",
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

const convertFile = (filePath) => {
  let content = fs.readFileSync(filePath, "utf8");
  let modified = false;
  const changes = [];

  // Replace theme color patterns
  Object.entries(themeColorMappings).forEach(([pattern, replacement]) => {
    const regex = new RegExp(pattern, "g");
    if (content.match(regex)) {
      const oldContent = content;
      content = content.replace(regex, replacement);
      if (oldContent !== content) {
        changes.push(`Replaced "${pattern}" with "${replacement}"`);
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

const convertFiles = () => {
  const files = getAllFiles(path.join(__dirname, ".."));
  const results = [];

  files.forEach((file) => {
    const result = convertFile(file);
    if (result) {
      results.push(result);
    }
  });

  return results;
};

// Main execution
console.log("Reverting theme color variables to original values...");
const results = convertFiles();

console.log("\nReversion complete!");
console.log(`Modified ${results.length} files.\n`);

// Output detailed changes
results.forEach(({ filePath, changes }) => {
  const relativePath = path.relative(process.cwd(), filePath);
  console.log(`\nFile: ${relativePath}`);
  console.log("Changes:");
  changes.forEach((change) => console.log(`  - ${change}`));
});

console.log("\nNext steps:");
console.log(
  "1. Run the convert-theme-colors.js script to apply the new theme variables"
);
console.log("2. Test the application in both light and dark modes");
