#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const ALLOWED_COLOR_SCALES = [
  "zinc",
  "white",
  "black",
  "transparent",
  "current",
];
const IGNORED_DIRS = ["node_modules", ".git", "dist", "build"];

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
    } else if (/\.(jsx?|tsx?|css|scss)$/.test(item)) {
      files.push(fullPath);
    }
  });

  return files;
};

// Patterns to check
const patterns = {
  grayScale:
    /\b(bg|text|border|ring|shadow|divide|placeholder)-(gray)-(\d{1,3})\b/g,
  darkGrayScale:
    /dark:(bg|text|border|ring|shadow|divide|placeholder)-(gray)-(\d{1,3})\b/g,
  colorScales:
    /\b(bg|text|border|ring|shadow|divide|placeholder)-([a-z]+)-(\d{1,3})\b/g,
  darkColorScales:
    /dark:(bg|text|border|ring|shadow|divide|placeholder)-([a-z]+)-(\d{1,3})\b/g,
};

// Validate files
const validateFiles = () => {
  const files = getAllFiles(path.join(__dirname, ".."));
  const issues = [];
  const colorScalesUsed = new Set();

  files.forEach((file) => {
    const content = fs.readFileSync(file, "utf8");

    // Check for remaining gray classes
    let match;
    while ((match = patterns.grayScale.exec(content)) !== null) {
      issues.push({
        file,
        line: content.substring(0, match.index).split("\n").length,
        issue: `Found gray scale usage: ${match[0]}`,
        type: "error",
      });
    }

    while ((match = patterns.darkGrayScale.exec(content)) !== null) {
      issues.push({
        file,
        line: content.substring(0, match.index).split("\n").length,
        issue: `Found dark mode gray scale usage: ${match[0]}`,
        type: "error",
      });
    }

    // Track all color scales used
    while ((match = patterns.colorScales.exec(content)) !== null) {
      const colorScale = match[2];
      colorScalesUsed.add(colorScale);

      if (!ALLOWED_COLOR_SCALES.includes(colorScale)) {
        issues.push({
          file,
          line: content.substring(0, match.index).split("\n").length,
          issue: `Found non-standard color scale: ${colorScale} in ${match[0]}`,
          type: "warning",
        });
      }
    }

    while ((match = patterns.darkColorScales.exec(content)) !== null) {
      const colorScale = match[2];
      colorScalesUsed.add(colorScale);

      if (!ALLOWED_COLOR_SCALES.includes(colorScale)) {
        issues.push({
          file,
          line: content.substring(0, match.index).split("\n").length,
          issue: `Found non-standard color scale in dark mode: ${colorScale} in ${match[0]}`,
          type: "warning",
        });
      }
    }
  });

  return { issues, colorScalesUsed };
};

// Main execution
console.log("Starting color usage validation...");
const { issues, colorScalesUsed } = validateFiles();

// Report results
console.log("\nValidation complete!");

if (issues.length === 0) {
  console.log("✅ No issues found!");
} else {
  console.log("\nIssues found:");

  // Group by file
  const groupedIssues = issues.reduce((acc, issue) => {
    if (!acc[issue.file]) acc[issue.file] = [];
    acc[issue.file].push(issue);
    return acc;
  }, {});

  Object.entries(groupedIssues).forEach(([file, fileIssues]) => {
    console.log(`\n${file}:`);
    fileIssues.forEach((issue) => {
      const symbol = issue.type === "error" ? "❌" : "⚠️";
      console.log(`  ${symbol} Line ${issue.line}: ${issue.issue}`);
    });
  });
}

console.log("\nColor scales used in the project:");
console.log([...colorScalesUsed].sort().join(", "));

// Exit with error if there are any error-type issues
const hasErrors = issues.some((issue) => issue.type === "error");
process.exit(hasErrors ? 1 : 0);
