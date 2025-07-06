#!/usr/bin/env node

/**
 * CSS Refresh Triggers Analysis Script
 *
 * This script analyzes the current CSS refresh mechanism to identify
 * what triggers full component re-renders when stylesheets are saved.
 *
 * Findings are used to implement CSS hot-reload optimization.
 */

const fs = require("fs");
const path = require("path");

console.log("🔍 CSS REFRESH TRIGGERS ANALYSIS");
console.log("=====================================\n");

// File paths to analyze
const filesToAnalyze = [
  "src/components/BlockComposer/StylesheetInjector.tsx",
  "src/hooks/useStylesheetData.ts",
  "src/components/content-studio/BlockComposer.tsx",
  "src/components/content-studio/renderers/RendererFactory.tsx",
];

// Patterns that indicate refresh triggers
const refreshTriggerPatterns = [
  {
    name: "useEffect Dependencies",
    pattern: /useEffect\(\s*\(\)\s*=>\s*\{[\s\S]*?\},\s*\[([\s\S]*?)\]/g,
    description: "Dependencies that trigger useEffect re-runs",
  },
  {
    name: "DOM Manipulation",
    pattern: /(\.remove\(\)|\.appendChild\(|document\.createElement)/g,
    description: "Direct DOM manipulation that could cause re-renders",
  },
  {
    name: "Cache Invalidation",
    pattern: /(invalidateStylesheetCache|stylesheetUpdateCounter)/g,
    description: "Cache invalidation mechanisms",
  },
  {
    name: "State Updates",
    pattern: /(setState|set[A-Z]\w*\()/g,
    description: "State updates that trigger re-renders",
  },
  {
    name: "React Key Changes",
    pattern: /(key=\{[^}]+\}|key="[^"]+"|key='[^']+')/g,
    description: "React key changes that force component re-creation",
  },
];

function analyzeFile(filePath) {
  console.log(`\n📄 ANALYZING: ${filePath}`);
  console.log("─".repeat(50));

  if (!fs.existsSync(filePath)) {
    console.log("❌ File not found");
    return;
  }

  const content = fs.readFileSync(filePath, "utf8");

  refreshTriggerPatterns.forEach((pattern) => {
    const matches = [...content.matchAll(pattern.pattern)];

    if (matches.length > 0) {
      console.log(`\n🔍 ${pattern.name}:`);
      console.log(`   Description: ${pattern.description}`);
      console.log(`   Matches found: ${matches.length}`);

      matches.forEach((match, index) => {
        if (index < 3) {
          // Show first 3 matches
          const lineNumber = content
            .substring(0, match.index)
            .split("\n").length;
          console.log(
            `   Line ${lineNumber}: ${match[0].substring(0, 80)}${match[0].length > 80 ? "..." : ""}`
          );
        }
      });

      if (matches.length > 3) {
        console.log(`   ... and ${matches.length - 3} more matches`);
      }
    }
  });
}

// Analyze each file
filesToAnalyze.forEach(analyzeFile);

console.log("\n\n🎯 KEY FINDINGS FOR CSS HOT-RELOAD OPTIMIZATION");
console.log("===============================================");

console.log(`
1. CURRENT REFRESH TRIGGERS:
   • StylesheetInjector removes and re-creates <style> elements on every update
   • useStylesheetData invalidates cache globally, triggering all listeners
   • DOM manipulation (remove/appendChild) causes browser reflow
   • stylesheetData dependency in useEffect triggers re-injection

2. OPTIMIZATION OPPORTUNITIES:
   • Update existing <style> element content instead of remove/re-create
   • Implement incremental CSS updates without full cache invalidation
   • Use CSS-only updates that don't trigger React re-renders
   • Preserve component state during CSS updates

3. IMPLEMENTATION STRATEGY:
   • Modify StylesheetInjector to update textContent instead of DOM manipulation
   • Add CSS hot-reload mechanism in useStylesheetData
   • Optimize preview component dependencies to prevent unnecessary re-renders
   • Use React.memo for components that don't need to re-render on CSS changes

4. RISK MITIGATION:
   • Preserve existing CSS comment parsing and dangerous selector detection
   • Maintain CSS scoping functionality
   • Ensure .cta-section and similar classes continue working
   • Add regression tests for CSS injection mechanism
`);

console.log(
  "\n✅ Analysis complete. Use findings to implement CSS hot-reload optimization.\n"
);
