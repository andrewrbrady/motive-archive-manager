#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const IGNORED_DIRS = ["node_modules", ".git", "dist", "build", ".next"];

// Get all relevant files
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

// Convert shorthand opacity classes to proper Tailwind utilities
const convertOpacityClasses = (content) => {
  // Pattern to match color-opacity shorthand in className strings
  const pattern =
    /(["'].*?)((?:bg|border|text)-[a-z]+-\d{2,3})\/(\d{1,3})(.*?["'])/g;

  return content.replace(
    pattern,
    (match, prefix, colorClass, opacity, suffix) => {
      const type = colorClass.split("-")[0]; // bg, border, or text
      return `${prefix}${colorClass} ${type}-opacity-${opacity}${suffix}`;
    }
  );
};

// Process files
const processFiles = () => {
  const files = getAllFiles(path.join(__dirname, ".."));
  let totalReplacements = 0;
  const modifiedFiles = [];

  files.forEach((file) => {
    const content = fs.readFileSync(file, "utf8");
    const newContent = convertOpacityClasses(content);

    if (content !== newContent) {
      fs.writeFileSync(file, newContent);
      modifiedFiles.push(file);
      totalReplacements++;
    }
  });

  return { totalReplacements, modifiedFiles };
};

// Main execution
console.log("Starting opacity class conversion...");
const { totalReplacements, modifiedFiles } = processFiles();

console.log(`\nConversion complete!`);
console.log(`Files modified: ${modifiedFiles.length}`);
console.log("\nModified files:");
modifiedFiles.forEach((file) => console.log(`- ${file}`));

// Create a git diff command for review
console.log("\nTo review changes, run:");
console.log("git diff");
