#!/usr/bin/env node

/**
 * 🚀 CAR TABS PERFORMANCE AUDIT TOOL
 *
 * Based on successful CarCopywriter optimization (903 lines → 229 lines, 80% faster)
 * Systematically measures and identifies performance bottlenecks across all car tabs
 */

const fs = require("fs");
const path = require("path");

// Configuration
const CAR_ID = "67d13094dc27b630a36fb449"; // Replace with actual car ID
const BASE_URL = "http://localhost:3000";
const COMPONENTS_DIR = "./src/components/cars";
const OUTPUT_FILE = "./car-tabs-performance-report.json";

// Tab configurations from CarTabs.tsx
const TAB_CONFIGS = [
  {
    name: "Image Gallery",
    value: "gallery",
    component: "CarImageGallery",
    file: "cars/CarImageGallery.tsx",
    priority: "HIGH", // Default tab, needs to be fast
    expectedAPIs: ["images", "cloudflare"],
    criticalPath: true,
  },
  {
    name: "Attached Galleries",
    value: "car-galleries",
    component: "CarGalleries",
    file: "cars/CarGalleries.tsx",
    priority: "MEDIUM",
    expectedAPIs: ["galleries"],
    criticalPath: false,
  },
  {
    name: "Specifications",
    value: "specs",
    component: "Specifications",
    file: "cars/Specifications.tsx",
    priority: "MEDIUM",
    expectedAPIs: ["cars"],
    criticalPath: false,
  },
  {
    name: "Copywriter",
    value: "captions",
    component: "CarCopywriter",
    file: "copywriting/CarCopywriter.tsx",
    priority: "HIGH", // Already optimized - baseline
    expectedAPIs: ["events", "system-prompts", "captions", "length-settings"],
    criticalPath: true,
    optimized: true, // Mark as already optimized
  },
  {
    name: "Inspections",
    value: "inspections",
    component: "InspectionTab",
    file: "cars/InspectionTab.tsx",
    priority: "MEDIUM",
    expectedAPIs: ["inspections"],
    criticalPath: false,
  },
  {
    name: "Documentation",
    value: "documentation",
    component: "DocumentationFiles",
    file: "DocumentationFiles.tsx",
    priority: "MEDIUM",
    expectedAPIs: ["files", "documents"],
    criticalPath: false,
  },
  {
    name: "Deliverables",
    value: "deliverables",
    component: "DeliverablesTab",
    file: "deliverables/DeliverablesTab.tsx",
    priority: "HIGH", // Complex component with batch operations
    expectedAPIs: ["deliverables"],
    criticalPath: false,
  },
  {
    name: "Events",
    value: "events",
    component: "EventsTab",
    file: "cars/EventsTab.tsx",
    priority: "MEDIUM",
    expectedAPIs: ["events"],
    criticalPath: false,
  },
  {
    name: "Calendar",
    value: "calendar",
    component: "CalendarTab",
    file: "cars/CalendarTab.tsx",
    priority: "MEDIUM",
    expectedAPIs: ["events", "deliverables"],
    criticalPath: false,
  },
];

/**
 * Component complexity analyzer
 */
function analyzeComponentComplexity(filePath) {
  try {
    const fullPath = path.join(__dirname, "src/components", filePath);

    if (!fs.existsSync(fullPath)) {
      return { error: `File not found: ${fullPath}` };
    }

    const content = fs.readFileSync(fullPath, "utf8");

    const analysis = {
      totalLines: content.split("\n").length,
      useEffectCount: (content.match(/useEffect/g) || []).length,
      useStateCount: (content.match(/useState/g) || []).length,
      apiCallCount: (content.match(/api\.|fetch\(|useAPI/g) || []).length,
      importCount: (content.match(/^import /gm) || []).length,
      componentSize: getComponentSizeCategory(content.split("\n").length),
      hasLazyLoading: content.includes("lazy(") || content.includes("Suspense"),
      hasPagination: content.includes("limit") || content.includes("page"),
      hasErrorHandling: content.includes("try") && content.includes("catch"),
      hasLoadingStates:
        content.includes("isLoading") || content.includes("loading"),
      complexity: calculateComplexityScore(content),
    };

    return analysis;
  } catch (error) {
    return { error: error.message };
  }
}

function getComponentSizeCategory(lines) {
  if (lines < 100) return "SMALL";
  if (lines < 300) return "MEDIUM";
  if (lines < 500) return "LARGE";
  return "VERY_LARGE";
}

function calculateComplexityScore(content) {
  let score = 0;

  // Base complexity from size
  const lines = content.split("\n").length;
  score += Math.floor(lines / 50);

  // Hooks complexity
  score += (content.match(/useEffect/g) || []).length * 2;
  score += (content.match(/useState/g) || []).length;

  // API complexity
  score += (content.match(/api\.|fetch\(/g) || []).length * 3;

  // Form complexity
  score += (content.match(/onSubmit|handleSubmit/g) || []).length * 2;

  // Conditional rendering complexity
  score += (content.match(/\?\s*</g) || []).length;

  if (score < 10) return "LOW";
  if (score < 25) return "MEDIUM";
  if (score < 50) return "HIGH";
  return "VERY_HIGH";
}

/**
 * Generate optimization recommendations
 */
function generateOptimizationRecommendations(tabConfig, analysis) {
  const recommendations = [];

  // Size-based recommendations
  if (analysis.totalLines > 400) {
    recommendations.push({
      type: "ARCHITECTURE",
      priority: "HIGH",
      issue: `Component is ${analysis.totalLines} lines - too large`,
      solution:
        "Split into smaller components using the BaseCopywriter pattern",
      example: "Create BaseTab + specific tab implementation",
    });
  }

  // API optimization
  if (analysis.apiCallCount > 3 && !analysis.hasPagination) {
    recommendations.push({
      type: "API",
      priority: "HIGH",
      issue: `${analysis.apiCallCount} API calls without pagination`,
      solution: "Implement critical path + background loading pattern",
      example: "Load essential data first, non-critical data in background",
    });
  }

  // Loading states
  if (analysis.apiCallCount > 0 && !analysis.hasLoadingStates) {
    recommendations.push({
      type: "UX",
      priority: "MEDIUM",
      issue: "Missing loading states for API calls",
      solution: "Add skeleton loading and progressive enhancement",
      example: "Show immediate UI with placeholders while data loads",
    });
  }

  // Error handling
  if (analysis.apiCallCount > 0 && !analysis.hasErrorHandling) {
    recommendations.push({
      type: "RELIABILITY",
      priority: "MEDIUM",
      issue: "Missing error handling for API calls",
      solution: "Add try/catch blocks and error states",
      example: "Graceful degradation when APIs fail",
    });
  }

  // Critical path optimization
  if (tabConfig.criticalPath && analysis.complexity !== "LOW") {
    recommendations.push({
      type: "CRITICAL_PATH",
      priority: "VERY_HIGH",
      issue: "Critical path tab has high complexity",
      solution: "Apply aggressive optimization like CarCopywriter",
      example: "Reduce to essential data only, background load everything else",
    });
  }

  // Lazy loading
  if (!analysis.hasLazyLoading && analysis.totalLines > 200) {
    recommendations.push({
      type: "PERFORMANCE",
      priority: "MEDIUM",
      issue: "Large component not lazy loaded",
      solution: "Implement lazy loading with React.lazy()",
      example: 'const Component = lazy(() => import("./Component"))',
    });
  }

  return recommendations;
}

/**
 * Performance testing suggestions
 */
function generatePerformanceTests(tabConfig) {
  return {
    manual: [
      `Navigate to /cars/${CAR_ID}?tab=${tabConfig.value}`,
      "Open browser dev tools (F12)",
      "Go to Network tab and clear",
      "Refresh the page",
      "Measure time to first API response",
      "Measure time to UI interactive",
      "Note any slow (>1s) API calls",
    ],
    automated: {
      lighthouse: `npx lighthouse http://localhost:3000/cars/${CAR_ID}?tab=${tabConfig.value}`,
      loadTest: `curl -w "@curl-format.txt" -o /dev/null -s "http://localhost:3000/api/cars/${CAR_ID}/${tabConfig.value}"`,
    },
    targets: {
      tabSwitch: "<200ms (instant feel)",
      criticalPath: "<800ms (essential data)",
      totalLoad: "<1500ms (full functionality)",
      apiCalls: "<500ms each (database queries)",
    },
  };
}

/**
 * Main audit function
 */
function auditCarTabs() {
  console.log("🚀 Starting Car Tabs Performance Audit...\n");

  const auditResults = {
    timestamp: new Date().toISOString(),
    carId: CAR_ID,
    summary: {
      totalTabs: TAB_CONFIGS.length,
      highPriorityTabs: TAB_CONFIGS.filter((t) => t.priority === "HIGH").length,
      optimizedTabs: TAB_CONFIGS.filter((t) => t.optimized).length,
      criticalPathTabs: TAB_CONFIGS.filter((t) => t.criticalPath).length,
    },
    tabs: [],
  };

  TAB_CONFIGS.forEach((tabConfig) => {
    console.log(`📊 Analyzing ${tabConfig.name} (${tabConfig.component})...`);

    const analysis = analyzeComponentComplexity(tabConfig.file);
    const recommendations = analysis.error
      ? []
      : generateOptimizationRecommendations(tabConfig, analysis);
    const performanceTests = generatePerformanceTests(tabConfig);

    const tabAudit = {
      ...tabConfig,
      analysis,
      recommendations,
      performanceTests,
      optimizationPriority: getOptimizationPriority(
        tabConfig,
        analysis,
        recommendations
      ),
    };

    auditResults.tabs.push(tabAudit);

    // Log immediate insights
    if (analysis.error) {
      console.log(`   ❌ Error: ${analysis.error}`);
    } else {
      console.log(
        `   📏 Size: ${analysis.totalLines} lines (${analysis.componentSize})`
      );
      console.log(`   🔄 Complexity: ${analysis.complexity}`);
      console.log(`   🚨 Issues: ${recommendations.length} recommendations`);

      if (recommendations.length > 0) {
        const highPriority = recommendations.filter(
          (r) => r.priority === "HIGH" || r.priority === "VERY_HIGH"
        );
        console.log(
          `   🎯 High Priority: ${highPriority.length} critical issues`
        );
      }
    }
    console.log("");
  });

  // Generate priority matrix
  const priorityMatrix = generatePriorityMatrix(auditResults.tabs);
  auditResults.priorityMatrix = priorityMatrix;

  // Save results
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(auditResults, null, 2));

  console.log("📊 AUDIT COMPLETE!");
  console.log(`📄 Full report saved to: ${OUTPUT_FILE}`);
  console.log("\n🎯 OPTIMIZATION PRIORITY MATRIX:");

  priorityMatrix.forEach((tier) => {
    console.log(`\n${tier.tier}:`);
    tier.tabs.forEach((tab) => {
      console.log(`  • ${tab.name}: ${tab.reason}`);
    });
  });

  console.log("\n🚀 NEXT STEPS:");
  console.log("1. Focus on CRITICAL IMPACT tabs first");
  console.log("2. Apply CarCopywriter optimization pattern");
  console.log("3. Measure performance before/after changes");
  console.log("4. Use the generated performance tests");

  return auditResults;
}

function getOptimizationPriority(tabConfig, analysis, recommendations) {
  let score = 0;

  // Priority multipliers
  if (tabConfig.priority === "HIGH") score += 30;
  if (tabConfig.criticalPath) score += 25;
  if (tabConfig.optimized) score -= 50; // Already optimized

  // Complexity scoring
  if (analysis.complexity === "VERY_HIGH") score += 20;
  if (analysis.complexity === "HIGH") score += 15;
  if (analysis.totalLines > 400) score += 10;

  // Recommendation scoring
  score +=
    recommendations.filter((r) => r.priority === "VERY_HIGH").length * 15;
  score += recommendations.filter((r) => r.priority === "HIGH").length * 10;

  if (score >= 40) return "CRITICAL";
  if (score >= 25) return "HIGH";
  if (score >= 15) return "MEDIUM";
  return "LOW";
}

function generatePriorityMatrix(tabs) {
  const critical = tabs.filter((t) => t.optimizationPriority === "CRITICAL");
  const high = tabs.filter((t) => t.optimizationPriority === "HIGH");
  const medium = tabs.filter((t) => t.optimizationPriority === "MEDIUM");
  const low = tabs.filter((t) => t.optimizationPriority === "LOW");

  return [
    {
      tier: "🔥 CRITICAL IMPACT (Fix First)",
      tabs: critical.map((t) => ({
        name: t.name,
        reason: `${t.priority} priority, ${t.analysis.complexity} complexity, ${t.recommendations.length} issues`,
      })),
    },
    {
      tier: "⚡ HIGH IMPACT",
      tabs: high.map((t) => ({
        name: t.name,
        reason: `${t.analysis.totalLines} lines, ${t.analysis.apiCallCount} APIs`,
      })),
    },
    {
      tier: "📈 MEDIUM IMPACT",
      tabs: medium.map((t) => ({
        name: t.name,
        reason: `${t.analysis.componentSize} size, ${t.recommendations.length} recommendations`,
      })),
    },
    {
      tier: "✅ LOW IMPACT",
      tabs: low.map((t) => ({
        name: t.name,
        reason: t.optimized ? "Already optimized" : "Simple component",
      })),
    },
  ];
}

// Run the audit
if (require.main === module) {
  auditCarTabs();
}

module.exports = { auditCarTabs, analyzeComponentComplexity, TAB_CONFIGS };
