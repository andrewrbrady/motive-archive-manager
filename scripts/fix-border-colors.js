#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const IGNORED_DIRS = ["node_modules", ".git", "dist", "build", ".next"];

// Mapping of incorrect to correct border color syntax
const borderColorFixes = {
  "border-\\[var\\(--border-primary\\)\\]":
    "border-[hsl(var(--border-primary))]",
  "border-\\[var\\(--border-subtle\\)\\]": "border-[hsl(var(--border-subtle))]",
  "border-\\[var\\(--border-muted\\)\\]": "border-[hsl(var(--border-muted))]",
  "dark:border-\\[var\\(--border-primary\\)\\]":
    "dark:border-[hsl(var(--border-primary))]",
  "dark:border-\\[var\\(--border-subtle\\)\\]":
    "dark:border-[hsl(var(--border-subtle))]",
  "dark:border-\\[var\\(--border-muted\\)\\]":
    "dark:border-[hsl(var(--border-muted))]",
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

const fixFile = (filePath) => {
  let content = fs.readFileSync(filePath, "utf8");
  let hasChanges = false;

  Object.entries(borderColorFixes).forEach(([incorrect, correct]) => {
    const regex = new RegExp(incorrect, "g");
    if (regex.test(content)) {
      content = content.replace(regex, correct);
      hasChanges = true;
    }
  });

  if (hasChanges) {
    fs.writeFileSync(filePath, content, "utf8");
    console.log(`Fixed border colors in: ${filePath}`);
  }
};

const main = () => {
  const rootDir = path.join(__dirname, "..");
  const files = getAllFiles(rootDir);

  files.forEach(fixFile);
  console.log("Border color fixes completed!");
};

main();
