import glob from "glob";
import fs from "fs";
import path from "path";
import chalk from "chalk";

const colorMappings = {
  // Status colors with shades
  "text-destructive": "text-destructive",
  "bg-destructive": "bg-destructive",
  "border-destructive": "border-destructive",
  "ring-destructive": "ring-destructive",
  "outline-destructive": "outline-destructive",
  "shadow-destructive": "shadow-destructive",
  "divide-destructive": "divide-destructive",

  "text-success": "text-success",
  "bg-success": "bg-success",
  "border-success": "border-success",
  "ring-success": "ring-success",
  "outline-success": "outline-success",
  "shadow-success": "shadow-success",
  "divide-success": "divide-success",

  "text-warning": "text-warning",
  "bg-warning": "bg-warning",
  "border-warning": "border-warning",
  "ring-warning": "ring-warning",
  "outline-warning": "outline-warning",
  "shadow-warning": "shadow-warning",
  "divide-warning": "divide-warning",

  "text-info": "text-info",
  "bg-info": "bg-info",
  "border-info": "border-info",
  "ring-info": "ring-info",
  "outline-info": "outline-info",
  "shadow-info": "shadow-info",
  "divide-info": "divide-info",

  // Replace non-zinc neutrals
  "text-neutral": "text-zinc",
  "bg-neutral": "bg-zinc",
  "border-neutral": "border-zinc",
  "ring-neutral": "ring-zinc",
  "outline-neutral": "outline-zinc",
  "shadow-neutral": "shadow-zinc",
  "divide-neutral": "divide-zinc",

  "text-slate": "text-zinc",
  "bg-slate": "bg-zinc",
  "border-slate": "border-zinc",
  "ring-slate": "ring-zinc",
  "outline-slate": "outline-zinc",
  "shadow-slate": "shadow-zinc",
  "divide-slate": "divide-zinc",

  "text-stone": "text-zinc",
  "bg-stone": "bg-zinc",
  "border-stone": "border-zinc",
  "ring-stone": "ring-zinc",
  "outline-stone": "outline-zinc",
  "shadow-stone": "shadow-zinc",
  "divide-stone": "divide-zinc",

  // Replace custom colors
  "text-navy": "text-zinc",
  "bg-navy": "bg-zinc",
  "border-navy": "border-zinc",
  "ring-navy": "ring-zinc",

  "text-yellow": "text-warning",
  "bg-yellow": "bg-warning",
  "border-yellow": "border-warning",
  "ring-yellow": "ring-warning",

  "text-indigo": "text-info",
  "bg-indigo": "bg-info",
  "border-indigo": "border-info",
  "ring-indigo": "ring-info",
};

// Shade mappings for semantic colors
const shadeMap: Record<string, string> = {
  "50": "50",
  "100": "100",
  "200": "200",
  "300": "300",
  "400": "400",
  "500": "500", // Default
  "600": "600",
  "700": "700",
  "800": "800",
  "900": "900",
  "950": "950",
};

function convertColors(content: string): {
  newContent: string;
  changes: string[];
} {
  let newContent = content;
  const changes: string[] = [];

  // Replace color classes with semantic equivalents
  Object.entries(colorMappings).forEach(([oldColor, newColor]) => {
    const regex = new RegExp(`\\b${oldColor}-[0-9]{2,3}\\b`, "g");
    newContent = newContent.replace(regex, (match) => {
      const [prefix, color, shade] = match.split("-");
      const newShade = shadeMap[shade] || "500";
      const replacement = `${newColor}-${newShade}`;

      if (match !== replacement) {
        changes.push(`${match} → ${replacement}`);
      }

      return replacement;
    });
  });

  return { newContent, changes };
}

async function main() {
  console.log(chalk.blue("🔄 Converting semantic colors..."));

  try {
    const files = glob.sync("src/**/*.{ts,tsx,css}");
    let totalChanges = 0;

    for (const file of files) {
      const content = fs.readFileSync(file, "utf8");
      const { newContent, changes } = convertColors(content);

      if (changes.length > 0) {
        console.log(chalk.white(`\n📄 ${file}:`));
        changes.forEach((change) => {
          console.log(chalk.gray(`   ${change}`));
        });

        fs.writeFileSync(file, newContent);
        totalChanges += changes.length;
      }
    }

    if (totalChanges === 0) {
      console.log(chalk.green("\n✅ No semantic color conversions needed!"));
    } else {
      console.log(
        chalk.green(`\n✅ Converted ${totalChanges} semantic colors!`)
      );
    }
  } catch (error) {
    console.error(chalk.red("Error:"), error);
    process.exit(1);
  }
}

main();
