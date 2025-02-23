import fs from "fs";
import path from "path";

// Mapping of zinc colors to theme variables
const colorMappings = {
  // Background colors - simplified to match page background
  "bg-zinc-50": "bg-[hsl(var(--background))]",
  "bg-zinc-100": "bg-[hsl(var(--background))]",
  "bg-zinc-200": "bg-[hsl(var(--background))]",
  "bg-zinc-300": "bg-[hsl(var(--background))]",
  "bg-zinc-400": "bg-[hsl(var(--background))]",
  "bg-zinc-500": "bg-[hsl(var(--background))]",
  "bg-zinc-600": "bg-[hsl(var(--background))]",
  "bg-zinc-700": "bg-[hsl(var(--background))]",
  "bg-zinc-800": "bg-[hsl(var(--background))]",
  "bg-zinc-900": "bg-[hsl(var(--background))]",
  "bg-zinc-950": "bg-[hsl(var(--background))]",

  // Hover background states - use subtle variant for hover
  "hover:bg-zinc-50": "hover:bg-[hsl(var(--background-subtle))]",
  "hover:bg-zinc-100": "hover:bg-[hsl(var(--background-subtle))]",
  "hover:bg-zinc-200": "hover:bg-[hsl(var(--background-subtle))]",
  "hover:bg-zinc-300": "hover:bg-[hsl(var(--background-subtle))]",
  "hover:bg-zinc-400": "hover:bg-[hsl(var(--background-subtle))]",
  "hover:bg-zinc-500": "hover:bg-[hsl(var(--background-subtle))]",
  "hover:bg-zinc-600": "hover:bg-[hsl(var(--background-subtle))]",
  "hover:bg-zinc-700": "hover:bg-[hsl(var(--background-subtle))]",
  "hover:bg-zinc-800": "hover:bg-[hsl(var(--background-subtle))]",
  "hover:bg-zinc-900": "hover:bg-[hsl(var(--background-subtle))]",
  "hover:bg-zinc-950": "hover:bg-[hsl(var(--background-subtle))]",

  // Dark mode backgrounds
  "dark:bg-zinc-50": "dark:bg-[hsl(var(--background))]",
  "dark:bg-zinc-100": "dark:bg-[hsl(var(--background))]",
  "dark:bg-zinc-200": "dark:bg-[hsl(var(--background))]",
  "dark:bg-zinc-300": "dark:bg-[hsl(var(--background))]",
  "dark:bg-zinc-400": "dark:bg-[hsl(var(--background))]",
  "dark:bg-zinc-500": "dark:bg-[hsl(var(--background))]",
  "dark:bg-zinc-600": "dark:bg-[hsl(var(--background))]",
  "dark:bg-zinc-700": "dark:bg-[hsl(var(--background))]",
  "dark:bg-zinc-800": "dark:bg-[hsl(var(--background))]",
  "dark:bg-zinc-900": "dark:bg-[hsl(var(--background))]",
  "dark:bg-zinc-950": "dark:bg-[hsl(var(--background))]",

  // Dark mode hover states
  "dark:hover:bg-zinc-50": "dark:hover:bg-[hsl(var(--background-subtle))]",
  "dark:hover:bg-zinc-100": "dark:hover:bg-[hsl(var(--background-subtle))]",
  "dark:hover:bg-zinc-200": "dark:hover:bg-[hsl(var(--background-subtle))]",
  "dark:hover:bg-zinc-300": "dark:hover:bg-[hsl(var(--background-subtle))]",
  "dark:hover:bg-zinc-400": "dark:hover:bg-[hsl(var(--background-subtle))]",
  "dark:hover:bg-zinc-500": "dark:hover:bg-[hsl(var(--background-subtle))]",
  "dark:hover:bg-zinc-600": "dark:hover:bg-[hsl(var(--background-subtle))]",
  "dark:hover:bg-zinc-700": "dark:hover:bg-[hsl(var(--background-subtle))]",
  "dark:hover:bg-zinc-800": "dark:hover:bg-[hsl(var(--background-subtle))]",
  "dark:hover:bg-zinc-900": "dark:hover:bg-[hsl(var(--background-subtle))]",
  "dark:hover:bg-zinc-950": "dark:hover:bg-[hsl(var(--background-subtle))]",

  // Text colors
  "text-zinc-100": "text-[hsl(var(--foreground))]",
  "text-zinc-300": "text-[hsl(var(--foreground-subtle))]",
  "text-zinc-400": "text-[hsl(var(--foreground-muted))]",
  "text-zinc-500": "text-[hsl(var(--foreground-muted))]",
  "text-zinc-600": "text-[hsl(var(--foreground-subtle))]",
  "text-zinc-700": "text-[hsl(var(--foreground))]",
  "text-zinc-900": "text-[hsl(var(--foreground))]",

  // Border colors
  "border-zinc-200": "border-[hsl(var(--border))]",
  "border-zinc-300": "border-[hsl(var(--border-primary))]",
  "border-zinc-400": "border-[hsl(var(--border-primary))]",
  "border-zinc-700": "border-[hsl(var(--border-subtle))]",
  "border-zinc-800": "border-[hsl(var(--border))]",

  // Hover text states
  "hover:text-zinc-300": "hover:text-[hsl(var(--foreground-subtle))]",
  "hover:text-zinc-400": "hover:text-[hsl(var(--foreground-muted))]",
  "hover:text-zinc-600": "hover:text-[hsl(var(--foreground-subtle))]",
  "hover:border-zinc-300": "hover:border-[hsl(var(--border-primary))]",
  "hover:border-zinc-700": "hover:border-[hsl(var(--border-subtle))]",

  // Focus states
  "focus:border-zinc-300": "focus:border-[hsl(var(--border-primary))]",
  "focus:border-zinc-400": "focus:border-[hsl(var(--border-primary))]",
  "focus:border-zinc-600": "focus:border-[hsl(var(--border-subtle))]",
  "focus:ring-zinc-300": "focus:ring-[hsl(var(--ring))]",
  "focus:ring-zinc-950": "focus:ring-[hsl(var(--ring))]",

  // Dark mode text
  "dark:text-zinc-100": "dark:text-[hsl(var(--foreground))]",
  "dark:text-zinc-300": "dark:text-[hsl(var(--foreground-subtle))]",
  "dark:text-zinc-400": "dark:text-[hsl(var(--foreground-muted))]",
  "dark:text-zinc-500": "dark:text-[hsl(var(--foreground-muted))]",
  "dark:text-zinc-600": "dark:text-[hsl(var(--foreground-subtle))]",
  "dark:border-zinc-700": "dark:border-[hsl(var(--border-subtle))]",
  "dark:border-zinc-800": "dark:border-[hsl(var(--border))]",
  "dark:hover:text-zinc-300": "dark:hover:text-[hsl(var(--foreground-subtle))]",
  "dark:hover:text-zinc-400": "dark:hover:text-[hsl(var(--foreground-muted))]",
  "dark:focus:border-zinc-300":
    "dark:focus:border-[hsl(var(--border-primary))]",
  "dark:focus:ring-zinc-300": "dark:focus:ring-[hsl(var(--ring))]",
};

// Directories to ignore
const ignoredDirs = ["node_modules", ".git", "dist", "build", ".next"];

function getAllFiles(dir) {
  const files = [];

  function traverse(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        if (!ignoredDirs.includes(entry.name)) {
          traverse(fullPath);
        }
      } else if (
        entry.isFile() &&
        (entry.name.endsWith(".tsx") ||
          entry.name.endsWith(".jsx") ||
          entry.name.endsWith(".css"))
      ) {
        files.push(fullPath);
      }
    }
  }

  traverse(dir);
  return files;
}

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, "utf8");
  let hasChanges = false;

  // Replace each hardcoded color with its theme variable
  for (const [hardcoded, variable] of Object.entries(colorMappings)) {
    const regex = new RegExp(`\\b${hardcoded}\\b`, "g");
    if (content.match(regex)) {
      content = content.replace(regex, variable);
      hasChanges = true;
      console.log(`${filePath}: Replaced ${hardcoded} with ${variable}`);
    }
  }

  if (hasChanges) {
    fs.writeFileSync(filePath, content, "utf8");
  }
}

function main() {
  const workspaceRoot = process.cwd();
  const files = getAllFiles(workspaceRoot);

  for (const file of files) {
    fixFile(file);
  }

  console.log("Theme color fixes completed!");
}

main();
