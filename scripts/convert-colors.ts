#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import chalk from "chalk";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const IGNORED_DIRS = ["node_modules", ".git", "dist", "build", ".next"];

// Color mappings from common values to our theme
const colorMappings = {
  // Background colors
  "var(--background-primary)": "var(--background-primary)",
  "var(--background-secondary)": "var(--background-secondary)",
  "var(--background-tertiary)": "var(--background-tertiary)",
  "var(--background-primary-light)": "var(--background-primary-light)",
  "var(--background-secondary-light)": "var(--background-secondary-light)",
  "var(--background-tertiary-light)": "var(--background-tertiary-light)",

  // Text colors
  "text-zinc": "text-zinc",
  "text-destructive": "text-destructive",
  "text-success": "text-success",
  "text-info": "text-info",
  "text-warning": "text-warning",

  // Border colors
  "border-zinc": "border-zinc",
  "border-destructive": "border-destructive",
  "border-success": "border-success",
  "border-info": "border-info",
  "border-warning": "border-warning",

  // Background colors
  "bg-zinc": "bg-zinc",
  "bg-destructive": "bg-destructive",
  "bg-success": "bg-success",
  "bg-info": "bg-info",
  "bg-warning": "bg-warning",

  // Ring colors
  "ring-zinc": "ring-zinc",
  "ring-destructive": "ring-destructive",
  "ring-success": "ring-success",
  "ring-info": "ring-info",
  "ring-warning": "ring-warning",
};

// Tailwind class mappings
const tailwindMappings = {
  "bg-zinc": "bg-zinc",
  "text-zinc": "text-zinc",
  "border-zinc": "border-zinc",
  "ring-zinc": "ring-zinc",
  "shadow-gray": "shadow-zinc",
};

interface FileChange {
  file: string;
  changes: number;
  replacements: Array<{
    original: string;
    replacement: string;
    line: number;
  }>;
}

const convertFile = (filePath: string): FileChange | null => {
  let content = fs.readFileSync(filePath, "utf8");
  let changes = 0;
  const replacements: FileChange["replacements"] = [];

  // Replace hex colors with variables
  Object.entries(colorMappings).forEach(([color, variable]) => {
    const regex = new RegExp(color, "gi");
    const matches = content.match(regex);
    if (matches) {
      matches.forEach((match) => {
        const lineNumber = content
          .substring(0, content.indexOf(match))
          .split("\n").length;
        replacements.push({
          original: match,
          replacement: variable,
          line: lineNumber,
        });
      });
      content = content.replace(regex, variable);
      changes += matches.length;
    }
  });

  // Replace Tailwind color classes
  Object.entries(tailwindMappings).forEach(([oldClass, newClass]) => {
    const regex = new RegExp(`\\b${oldClass}-\\d{3}\\b`, "g");
    const matches = content.match(regex);
    if (matches) {
      matches.forEach((match) => {
        const shade = match.split("-")[2];
        const replacement = `${newClass}-${shade}`;
        const lineNumber = content
          .substring(0, content.indexOf(match))
          .split("\n").length;
        replacements.push({
          original: match,
          replacement,
          line: lineNumber,
        });
      });
      content = content.replace(regex, (match) => {
        const shade = match.split("-")[2];
        return `${newClass}-${shade}`;
      });
      changes += matches.length;
    }
  });

  if (changes > 0) {
    fs.writeFileSync(filePath, content);
    return {
      file: path.relative(process.cwd(), filePath),
      changes,
      replacements,
    };
  }

  return null;
};

const main = async () => {
  console.log(
    chalk.blue("🔄 Converting hard-coded colors to theme variables...")
  );

  const files = getAllFiles(path.join(__dirname, ".."));
  const results: FileChange[] = [];

  files.forEach((file) => {
    const result = convertFile(file);
    if (result) {
      results.push(result);
    }
  });

  if (results.length === 0) {
    console.log(chalk.green("✅ No color conversions needed!"));
    return;
  }

  console.log(
    chalk.yellow(`\n🎨 Converted colors in ${results.length} files:\n`)
  );

  results.forEach((result) => {
    console.log(chalk.white(`\n📄 ${result.file}:`));
    result.replacements.forEach((replacement) => {
      console.log(
        chalk.gray(`   Line ${replacement.line}: `) +
          chalk.red(replacement.original) +
          " → " +
          chalk.green(replacement.replacement)
      );
    });
  });

  console.log(chalk.blue("\n✨ Color conversion complete!"));
  console.log(
    chalk.gray(
      "Remember to test the changes and commit them if everything looks good."
    )
  );
};

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

main().catch((error) => {
  console.error(chalk.red("Error:"), error);
  process.exit(1);
});
