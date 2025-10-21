import fs from "fs";
import path from "path";

// Workspace-relative helpers
const repoRoot = process.cwd();
const modelsDir = path.join(repoRoot, "src", "models");
const apiDir = path.join(repoRoot, "src", "app", "api");

type Violation = {
  file: string;
  rule: string;
  detail: string;
};

function readFile(p: string): string {
  return fs.readFileSync(p, "utf8");
}

function listFilesRecursive(dir: string, suffix = ".ts"): string[] {
  const out: string[] = [];
  const stack: string[] = [dir];
  while (stack.length) {
    const d = stack.pop()!;
    const entries = fs.readdirSync(d, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(d, e.name);
      if (e.isDirectory()) {
        stack.push(full);
      } else if (e.isFile() && e.name.endsWith(suffix)) {
        out.push(full);
      }
    }
  }
  return out;
}

function stripComments(code: string): string {
  // remove block comments and line comments
  const noBlock = code.replace(/\/\*[\s\S]*?\*\//g, "");
  const noLine = noBlock.replace(/(^|\s)\/\/.*$/gm, "");
  return noLine;
}

function main() {
  const violations: Violation[] = [];

  // 1) Build set of mongoose-backed model import names
  const modelFiles = listFilesRecursive(modelsDir, ".ts");
  const mongooseModels = new Set<string>();
  for (const mf of modelFiles) {
    const src = readFile(mf);
    const code = stripComments(src);
    if (src.includes("import mongoose")) {
      const name = path.basename(mf).replace(/\.ts$/, "");
      mongooseModels.add(name);
      // Rule C: Ensure models do not auto-connect
      if (/\bdbConnect\s*\(\)/.test(code)) {
        violations.push({
          file: path.relative(repoRoot, mf),
          rule: "C: model-auto-connect",
          detail: "Model imports dbConnect() at module scope; remove auto-connect.",
        });
      }
    }
  }

  // 2) Scan API route files for mixed-driver or missing dbConnect
  const apiFiles = listFilesRecursive(apiDir, ".ts").filter((p) => p.endsWith("/route.ts"));
  for (const af of apiFiles) {
    const rel = path.relative(repoRoot, af);
    const src = readFile(af);
    const code = stripComments(src);
    const importedModels = Array.from(mongooseModels).filter((m) =>
      src.includes(`@/models/${m}`)
    );
    if (importedModels.length === 0) continue;

    const usesNative =
      code.includes("getDatabase(") ||
      code.includes("getMongoClient(") ||
      code.includes("connectToDatabase(") ||
      /\bnew\s+MongoClient\b/.test(code) ||
      /\bdb\.collection\s*\(/.test(code);

    // Rule A: Mixed driver usage (Mongoose + native helpers in the same route)
    if (usesNative) {
      violations.push({
        file: rel,
        rule: "A: mixed-driver",
        detail: `Imports Mongoose models (${importedModels.join(", ")}) and native driver helpers in the same route. Use one driver per route.`,
      });
    }

    // Rule B: Must call dbConnect() if importing any Mongoose model
    const hasDbConnectCall = /\bawait\s+dbConnect\s*\(\)/.test(code) || /\bdbConnect\s*\(\)/.test(code);
    if (!hasDbConnectCall) {
      violations.push({
        file: rel,
        rule: "B: missing-dbConnect",
        detail: `Imports Mongoose models (${importedModels.join(", ")}) but no dbConnect() call found.`,
      });
    }
  }

  if (violations.length) {
    console.error("MongoDB usage audit FAILED with violations:\n");
    for (const v of violations) {
      console.error(`- [${v.rule}] ${v.file}: ${v.detail}`);
    }
    process.exit(1);
  } else {
    console.log("MongoDB usage audit passed: no violations found.");
  }
}

main();
