import fs from "fs";
import path from "path";
import glob from "glob";

function fixTypeErrors(content: string): string {
  // Fix malformed class names in cva
  content = content.replace(/,\s*(hover|focus|disabled|active):/g, " $1:");
  content = content.replace(/,\s*([\]}])/g, "$1");
  content = content.replace(/,\s*$/gm, "");

  // Fix JSX syntax
  content = content.replace(/className\s*=\s*{/g, "className={");
  content = content.replace(/ref\s*=\s*{/g, "ref={");
  content = content.replace(/:\s*void\s*(?!=>)/g, "");
  content = content.replace(/void\s*{/g, "{");
  content = content.replace(/}\s*;(?=\))/g, "}");
  content = content.replace(/}\s*;(?=\s*>)/g, "}");

  // Fix return types
  content = content.replace(/\): void {/g, "): JSX.Element {");
  content = content.replace(/\): void =>/g, "): JSX.Element =>");
  content = content.replace(/\): void\s*(?!=>)/g, "): JSX.Element");

  // Fix malformed function parameters
  content = content.replace(/(\w+)\s+(\w+)(?=\s*[:\)])/g, "$1, $2");

  // Fix missing commas in type declarations
  content = content.replace(/(\w+)\s+(\w+)(?=\s*[:\)])/g, "$1, $2");

  // Fix missing braces and semicolons
  content = content.replace(/(\w+)\s*=\s*{([^}]*)}\s*(?![;\n])/g, "$1 = {$2};");

  // Fix malformed JSX props
  content = content.replace(/props\s*}\s*\/>/g, "props} />");

  // Fix unused variables
  content = content.replace(
    /\b(\w+) is defined but never used\./g,
    (match, varName) => {
      return `_${varName} is defined but never used.`;
    }
  );

  // Fix non-null assertions
  content = content.replace(/(\w+)!/g, "$1 ?? null");

  // Fix malformed interface declarations
  content = content.replace(/interface\s+(\w+)\s*{}/g, "interface $1 { }");

  // Fix malformed try-catch blocks
  content = content.replace(/catch\s*\((.*?)\):\s*void/g, "catch ($1)");

  // Fix malformed async function declarations
  content = content.replace(
    /async\s+function\s+(\w+)\s*\((.*?)\):\s*void/g,
    "async function $1($2): Promise<Response>"
  );

  // Fix malformed function declarations
  content = content.replace(
    /function\s+(\w+)\s*\((.*?)\):\s*void/g,
    "function $1($2): JSX.Element"
  );

  // Fix malformed arrow function declarations
  content = content.replace(
    /const\s+(\w+)\s*=\s*\((.*?)\):\s*void\s*=>/g,
    "const $1 = ($2): JSX.Element =>"
  );

  // Fix malformed type declarations
  content = content.replace(/type\s+(\w+)\s*=\s*{}/g, "type $1 = { }");

  // Fix malformed export declarations
  content = content.replace(
    /export\s+{\s*(.*?)\s*}\s*:\s*void/g,
    "export { $1 }"
  );

  // Fix malformed variable declarations
  content = content.replace(
    /(\w+)\s*:\s*{\s*\.\.\.([^}]+)\s*}/g,
    "$1: { ...$2 }"
  );

  // Fix malformed object property assignments
  content = content.replace(/(\w+)\s*:\s*{\s*([^}]+)\s*}/g, "$1: { $2 }");

  // Fix malformed JSX closing tags
  content = content.replace(/:\s*void\s*<\//g, "</");

  // Fix malformed JSX attributes
  content = content.replace(
    /(\w+)\s*=\s*{\s*([^}]+)\s*}\s*;(?=\s*>)/g,
    "$1={$2}"
  );

  return content;
}

async function main() {
  try {
    const files = glob.sync("src/**/*.{ts,tsx}", {
      ignore: ["**/node_modules/**", "**/dist/**"],
    });

    for (const file of files) {
      console.log(`Processing ${file}...`);
      const content = fs.readFileSync(file, "utf8");
      const fixedContent = fixTypeErrors(content);

      if (content !== fixedContent) {
        fs.writeFileSync(file, fixedContent);
        console.log(`Fixed type errors in ${file}`);
      }
    }

    console.log("Done fixing type errors!");
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

main();
