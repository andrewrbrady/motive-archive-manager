#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get all files in the project that might contain Tailwind classes
const getAllFiles = (dir) => {
  const files = [];
  const items = fs.readdirSync(dir);

  items.forEach((item) => {
    const fullPath = path.join(dir, item);
    if (fs.statSync(fullPath).isDirectory()) {
      if (!fullPath.includes("node_modules") && !fullPath.includes(".git")) {
        files.push(...getAllFiles(fullPath));
      }
    } else if (/\.(jsx?|tsx?|css|scss)$/.test(item)) {
      files.push(fullPath);
    }
  });

  return files;
};

// Regular expressions for finding Tailwind gray classes
const grayClassPattern =
  /\b(bg|text|border|ring|shadow|divide|placeholder)-gray-(\d{1,3})\b/g;
const darkGrayClassPattern =
  /dark:(bg|text|border|ring|shadow|divide|placeholder)-gray-(\d{1,3})\b/g;

// Convert files
const convertFiles = () => {
  const files = getAllFiles(path.join(__dirname, ".."));
  let totalReplacements = 0;
  const modifiedFiles = [];

  files.forEach((file) => {
    const content = fs.readFileSync(file, "utf8");
    let newContent = content;
    let fileModified = false;

    // Replace standard classes
    newContent = newContent.replace(
      grayClassPattern,
      (match, prefix, number) => {
        fileModified = true;
        totalReplacements++;
        return `${prefix}-zinc-${number}`;
      }
    );

    // Replace dark mode classes
    newContent = newContent.replace(
      darkGrayClassPattern,
      (match, prefix, number) => {
        fileModified = true;
        totalReplacements++;
        return `dark:${prefix}-zinc-${number}`;
      }
    );

    if (fileModified) {
      fs.writeFileSync(file, newContent);
      modifiedFiles.push(file);
    }
  });

  return { totalReplacements, modifiedFiles };
};

// Main execution
console.log("Starting conversion of gray classes to zinc...");
const { totalReplacements, modifiedFiles } = convertFiles();

console.log(`\nConversion complete!`);
console.log(`Total replacements made: ${totalReplacements}`);
console.log(`Files modified: ${modifiedFiles.length}`);
console.log("\nModified files:");
modifiedFiles.forEach((file) => console.log(`- ${file}`));

// Create a git diff command for review
console.log("\nTo review changes, run:");
console.log("git diff");
