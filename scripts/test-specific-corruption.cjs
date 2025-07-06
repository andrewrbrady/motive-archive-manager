// Test the specific regex pattern that's causing the corruption
const testCSS = `
.email-container {
  color: #1a1a1a;
  background-color: #ffffff;
  border-color: #ff0000;
}

#myid {
  color: #000000;
  background: #cccccc;
}

.another-class {
  color: #123456;
  text-decoration-color: #abcdef;
}
`;

console.log("TESTING SPECIFIC REGEX PATTERNS");
console.log("================================");

// Test the problematic regex
const problematicPattern = /#[^{]+\s*\{[^}]*\}/g;
console.log("\nTesting problematic pattern: /#[^{]+\\s*\\{[^}]*\\}/g");
console.log("This should only match ID selectors like #myid { ... }");
console.log("\nOriginal CSS:");
console.log(testCSS);

const matches = testCSS.match(problematicPattern);
console.log("\nMatches found:");
console.log(matches);

const result = testCSS.replace(problematicPattern, "");
console.log("\nResult after replacement:");
console.log(result);

// Test a better pattern that only matches ID selectors at the start of lines
const betterPattern = /^#[^\s{]+\s*\{[^}]*\}/gm;
console.log("\n\nTesting better pattern: /^#[^\\s{]+\\s*\\{[^}]*\\}/gm");
console.log("This should only match ID selectors at the start of lines");

const betterMatches = testCSS.match(betterPattern);
console.log("\nMatches found:");
console.log(betterMatches);

const betterResult = testCSS.replace(betterPattern, "");
console.log("\nResult after replacement:");
console.log(betterResult);

// Test with even more specific pattern
const bestPattern = /(?:^|\n)\s*#[a-zA-Z][a-zA-Z0-9_-]*\s*\{[^}]*\}/g;
console.log(
  "\n\nTesting best pattern: /(?:^|\\n)\\s*#[a-zA-Z][a-zA-Z0-9_-]*\\s*\\{[^}]*\\}/g"
);
console.log("This matches ID selectors more precisely");

const bestMatches = testCSS.match(bestPattern);
console.log("\nMatches found:");
console.log(bestMatches);

const bestResult = testCSS.replace(bestPattern, "");
console.log("\nResult after replacement:");
console.log(bestResult);
