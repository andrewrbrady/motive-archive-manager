#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const IGNORED_DIRS = ["node_modules", ".git", "dist", "build", ".next"];

// Color mapping from custom values to Tailwind zinc
const colorMappings = {
  // Border colors
  "var(--zinc-300)": "zinc-300",
  "var(--zinc-700)": "zinc-700",
  "var(--zinc-800)": "zinc-800",

  // Text colors
  "var(--zinc-400)": "zinc-400",
  "var(--zinc-500)": "zinc-500",

  // RGB/RGBA patterns to Tailwind classes
  "var(--zinc-400/15)": "zinc-400/15",
  "var(--zinc-400/10)": "zinc-400/10",
  "var(--zinc-100/10)": "zinc-100/10",
  "var(--zinc-100/5)": "zinc-100/5",
};

// CSS Variable mappings to Tailwind classes
const variableMappings = {
  "--border-subtle": "border-[hsl(var(--border-subtle))] border-opacity-15 dark:border-[hsl(var(--border-subtle))]/15",
  "--border-very-subtle": "border-[hsl(var(--border-subtle))] border-opacity-10 dark:border-[hsl(var(--border-subtle))]/10",
  "--border-secondary": "border-zinc-300 dark:border-[hsl(var(--border-subtle))]",
  "--border-primary": "border-zinc-800 dark:border-[hsl(var(--border-subtle))]",
  "--text-secondary": "text-zinc-400 dark:text-zinc-500",
};

// Keep these semantic color variables
const keepVariables = [
  "--accent-primary",
  "--accent-secondary",
  "--accent-success",
  "--accent-warning",
  "--accent-error",
  "--navbar-height",
  "--radius",
  "--background",
  "--foreground",
];

const getAllFiles = (dir) => {
  const files = [];
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

const convertFile = (filePath) => {
  let content = fs.readFileSync(filePath, "utf8");
  let modified = false;
  const changes = [];

  // Replace direct color values
  Object.entries(colorMappings).forEach(([color, twClass]) => {
    if (content.includes(color)) {
      const regex = new RegExp(
        color.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        "g"
      );
      const oldContent = content;
      content = content.replace(regex, `var(--${twClass})`);
      if (oldContent !== content) {
        changes.push(`Replaced ${color} with ${twClass}`);
        modified = true;
      }
    }
  });

  // Replace CSS variable definitions and usages
  Object.entries(variableMappings).forEach(([variable, twClasses]) => {
    // Replace variable definitions
    const defineRegex = new RegExp(`${variable}:.*?;`, "g");
    if (content.match(defineRegex)) {
      const oldContent = content;
      content = content.replace(defineRegex, "");
      if (oldContent !== content) {
        changes.push(`Removed variable definition ${variable}`);
        modified = true;
      }
    }

    // Replace variable usages with Tailwind classes
    const useRegex = new RegExp(`var\\(${variable}\\)`, "g");
    if (content.match(useRegex)) {
      const oldContent = content;
      content = content.replace(useRegex, twClasses);
      if (oldContent !== content) {
        changes.push(`Replaced ${variable} usage with ${twClasses}`);
        modified = true;
      }
    }
  });

  // Clean up empty :root and .dark blocks
  content = content.replace(/:root\s*{\s*}/g, "");
  content = content.replace(/\.dark\s*{\s*}/g, "");

  // Remove redundant newlines
  content = content.replace(/\n{3,}/g, "\n\n");

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
console.log("Converting color overrides to Tailwind classes...");
const results = convertFiles();

console.log("\nConversion complete!");
console.log(`Modified ${results.length} files.\n`);

// Output detailed changes
results.forEach(({ filePath, changes }) => {
  const relativePath = path.relative(process.cwd(), filePath);
  console.log(`\nFile: ${relativePath}`);
  console.log("Changes:");
  changes.forEach((change) => console.log(`  - ${change}`));
});

console.log("\nNext steps:");
console.log("1. Review the changes and test the application");
console.log("2. Update any component styles that might need adjustment");
console.log(
  "3. Run the validation script to ensure no unwanted color values remain"
);
console.log("4. Update documentation to reflect the new color system");
