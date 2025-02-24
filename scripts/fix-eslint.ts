import glob from "glob";
import { readFile, writeFile } from "fs/promises";
import * as ts from "typescript";
import path from "path";
import { promisify } from "util";

const globPromise = promisify(glob);

function isApiRouteHandler(node: ts.Node, filePath: string): boolean {
  if (!ts.isFunctionDeclaration(node) && !ts.isMethodDeclaration(node)) {
    return false;
  }

  const name = node.name?.getText();
  if (!name) {
    return false;
  }

  const httpMethods = ["GET", "POST", "PUT", "DELETE", "PATCH"];
  return filePath.includes("/api/") && httpMethods.includes(name);
}

async function fixExpressionExpectedErrors(filePath: string): Promise<void> {
  const sourceText = await readFile(filePath, "utf-8");
  const sourceFile = ts.createSourceFile(
    filePath,
    sourceText,
    ts.ScriptTarget.Latest,
    true
  );

  let result = sourceText;
  const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });

  // Find all functions with incorrect return type annotations
  function visit(node: ts.Node) {
    if (ts.isFunctionDeclaration(node) || ts.isArrowFunction(node)) {
      // Check if this is an API route handler
      const isApiRoute = isApiRouteHandler(node, filePath);

      if (isApiRoute && node.type) {
        // Replace void return type with Promise<Response>
        const start = node.type.pos;
        const end = node.type.end;
        result =
          result.slice(0, start) + ": Promise<Response>" + result.slice(end);
      } else if (node.type) {
        // For non-API route functions, just remove incorrect return type annotations
        const start = node.type.pos;
        const end = node.type.end;
        result = result.slice(0, start) + result.slice(end);
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  if (result !== sourceText) {
    await writeFile(filePath, result, "utf-8");
    console.log(`Fixed expression expected errors in ${filePath}`);
  }
}

async function fixMissingReturnTypes(filePath: string): Promise<void> {
  const sourceText = await readFile(filePath, "utf-8");
  const sourceFile = ts.createSourceFile(
    filePath,
    sourceText,
    ts.ScriptTarget.Latest,
    true
  );

  let result = sourceText;
  const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });

  // Find all functions without return types
  function visit(node: ts.Node) {
    if (
      (ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node)) &&
      !node.type
    ) {
      // Check if this is an API route handler
      const isApiRoute = isApiRouteHandler(node, filePath);

      const returnType = isApiRoute
        ? "Promise<Response>"
        : inferReturnType(node);
      if (returnType) {
        const pos = node.body ? node.body.pos : node.end;
        result = result.slice(0, pos) + `: ${returnType}` + result.slice(pos);
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  if (result !== sourceText) {
    await writeFile(filePath, result, "utf-8");
    console.log(`Fixed missing return types in ${filePath}`);
  }
}

function inferReturnType(
  node: ts.FunctionDeclaration | ts.MethodDeclaration
): string | null {
  if (!node.body) return null;

  let hasReturnStatement = false;
  let returnsJSX = false;
  let returnsVoid = true;

  function visit(node: ts.Node) {
    if (ts.isReturnStatement(node)) {
      hasReturnStatement = true;
      if (node.expression) {
        returnsVoid = false;
        if (
          ts.isJsxElement(node.expression) ||
          ts.isJsxFragment(node.expression)
        ) {
          returnsJSX = true;
        }
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(node.body);

  if (returnsJSX) return "React.ReactElement";
  if (!hasReturnStatement || returnsVoid) return "void";
  return "any"; // Default to any if we can't infer a more specific type
}

async function fixUnusedImports(filePath: string): Promise<void> {
  const sourceText = await readFile(filePath, "utf-8");
  const sourceFile = ts.createSourceFile(
    filePath,
    sourceText,
    ts.ScriptTarget.Latest,
    true
  );

  const usedIdentifiers = new Set<string>();
  const importedIdentifiers = new Map<string, ts.ImportDeclaration>();

  // Collect all imported identifiers
  sourceFile.forEachChild((node) => {
    if (ts.isImportDeclaration(node)) {
      const importClause = node.importClause;
      if (importClause && importClause.name) {
        importedIdentifiers.set(importClause.name.text, node);
      }
    }
  });

  // Collect all used identifiers
  function visit(node: ts.Node) {
    if (ts.isIdentifier(node)) {
      usedIdentifiers.add(node.text);
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);

  // Remove unused imports
  let result = sourceText;
  for (const [identifier, importDecl] of importedIdentifiers) {
    if (!usedIdentifiers.has(identifier)) {
      const start = importDecl.getStart(sourceFile);
      const end = importDecl.getEnd();
      result = result.slice(0, start) + result.slice(end);
    }
  }

  if (result !== sourceText) {
    await writeFile(filePath, result, "utf-8");
    console.log(`Fixed unused imports in ${filePath}`);
  }
}

async function main(): Promise<void> {
  try {
    const files = await globPromise("src/**/*.{ts,tsx}");

    for (const file of files) {
      console.log(`Processing ${file}...`);
      await fixExpressionExpectedErrors(file);
      await fixMissingReturnTypes(file);
      await fixUnusedImports(file);
    }
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

main();
