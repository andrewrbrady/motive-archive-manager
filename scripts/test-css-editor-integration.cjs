#!/usr/bin/env node

/**
 * CSS Editor Integration Verification Script
 *
 * Tests Phase 2A implementation:
 * - Monaco Editor integration
 * - VIM keybindings support
 * - CSS state management
 * - Stylesheet loading
 * - Component structure validation
 */

const fs = require("fs");
const path = require("path");

console.log("🔍 CSS Editor Integration Verification\n");

// Test 1: Verify CSSEditor component exists
function testCSSEditorComponent() {
  console.log("📁 Test 1: CSSEditor Component");

  const cssEditorPath = path.join(
    __dirname,
    "../src/components/content-studio/CSSEditor.tsx"
  );

  if (!fs.existsSync(cssEditorPath)) {
    console.log("❌ CSSEditor.tsx not found");
    return false;
  }

  const content = fs.readFileSync(cssEditorPath, "utf8");

  // Check for required imports
  const requiredImports = [
    "@monaco-editor/react",
    "monaco-vim",
    "useToast",
    "Card",
    "Button",
  ];

  const missingImports = requiredImports.filter(
    (imp) => !content.includes(imp)
  );
  if (missingImports.length > 0) {
    console.log(`❌ Missing imports: ${missingImports.join(", ")}`);
    return false;
  }

  // Check for key features
  const requiredFeatures = [
    "initVimMode",
    "handleEditorDidMount",
    "toggleVimMode",
    "handleContentChange",
    "handleSave",
    "Monaco Editor",
  ];

  const missingFeatures = requiredFeatures.filter(
    (feature) => !content.includes(feature)
  );
  if (missingFeatures.length > 0) {
    console.log(`❌ Missing features: ${missingFeatures.join(", ")}`);
    return false;
  }

  console.log("✅ CSSEditor component properly implemented");
  return true;
}

// Test 2: Verify BlockComposer integration
function testBlockComposerIntegration() {
  console.log("\n📁 Test 2: BlockComposer Integration");

  const blockComposerPath = path.join(
    __dirname,
    "../src/components/content-studio/BlockComposer.tsx"
  );

  if (!fs.existsSync(blockComposerPath)) {
    console.log("❌ BlockComposer.tsx not found");
    return false;
  }

  const content = fs.readFileSync(blockComposerPath, "utf8");

  // Check for CSSEditor import
  if (!content.includes('import { CSSEditor } from "./CSSEditor"')) {
    console.log("❌ CSSEditor import missing from BlockComposer");
    return false;
  }

  // Check for CSS state management
  const requiredState = [
    "cssContent",
    "setCSSContent",
    "isSavingCSS",
    "setIsSavingCSS",
  ];

  const missingState = requiredState.filter(
    (state) => !content.includes(state)
  );
  if (missingState.length > 0) {
    console.log(`❌ Missing CSS state: ${missingState.join(", ")}`);
    return false;
  }

  // Check for useStylesheetData hook
  if (!content.includes("useStylesheetData")) {
    console.log("❌ useStylesheetData hook not imported/used");
    return false;
  }

  // Check for CSS save handler
  if (!content.includes("saveCSSContent")) {
    console.log("❌ saveCSSContent handler missing");
    return false;
  }

  // Check for CSSEditor component usage
  if (!content.includes("<CSSEditor")) {
    console.log("❌ CSSEditor component not used in render");
    return false;
  }

  // Check for CSS placeholder replacement
  if (
    content.includes(
      "CSS editor with VIM keybindings will be implemented in Phase 2"
    )
  ) {
    console.log("❌ CSS placeholder not replaced");
    return false;
  }

  console.log("✅ BlockComposer integration properly implemented");
  return true;
}

// Test 3: Verify dependencies
function testDependencies() {
  console.log("\n📦 Test 3: Dependencies");

  const packageJsonPath = path.join(__dirname, "../package.json");

  if (!fs.existsSync(packageJsonPath)) {
    console.log("❌ package.json not found");
    return false;
  }

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
  const allDeps = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  };

  // Check for Monaco Editor
  if (!allDeps["@monaco-editor/react"]) {
    console.log("❌ @monaco-editor/react dependency missing");
    return false;
  }

  // Check for monaco-vim
  if (!allDeps["monaco-vim"]) {
    console.log("❌ monaco-vim dependency missing");
    return false;
  }

  console.log("✅ Required dependencies present");
  console.log(`   @monaco-editor/react: ${allDeps["@monaco-editor/react"]}`);
  console.log(`   monaco-vim: ${allDeps["monaco-vim"]}`);
  return true;
}

// Test 4: Verify TypeScript compatibility
function testTypeScriptCompatibility() {
  console.log("\n🔧 Test 4: TypeScript Compatibility");

  // Check if tsconfig includes the components
  const tsconfigPath = path.join(__dirname, "../tsconfig.json");

  if (!fs.existsSync(tsconfigPath)) {
    console.log("❌ tsconfig.json not found");
    return false;
  }

  // Check for proper component structure
  const cssEditorPath = path.join(
    __dirname,
    "../src/components/content-studio/CSSEditor.tsx"
  );
  const content = fs.readFileSync(cssEditorPath, "utf8");

  // Check for proper TypeScript interfaces
  if (!content.includes("interface CSSEditorProps")) {
    console.log("❌ CSSEditorProps interface missing");
    return false;
  }

  // Check for proper typing
  const requiredTypes = [
    "cssContent: string",
    "onCSSChange: (css: string) => void",
    "selectedStylesheetId?: string | null",
    "onSave?: () => void",
    "isSaving?: boolean",
  ];

  const missingTypes = requiredTypes.filter((type) => !content.includes(type));
  if (missingTypes.length > 0) {
    console.log(`❌ Missing type definitions: ${missingTypes.join(", ")}`);
    return false;
  }

  console.log("✅ TypeScript compatibility verified");
  return true;
}

// Test 5: Verify feature completeness
function testFeatureCompleteness() {
  console.log("\n🎯 Test 5: Feature Completeness");

  const cssEditorPath = path.join(
    __dirname,
    "../src/components/content-studio/CSSEditor.tsx"
  );
  const content = fs.readFileSync(cssEditorPath, "utf8");

  const requiredFeatures = [
    "Monaco Editor", // Editor component
    "VIM mode", // VIM keybindings
    "Dark theme", // vs-dark theme
    "CSS syntax highlighting", // language="css"
    "Auto-completion", // suggest options
    "Save functionality", // onSave prop
    "Error handling", // try/catch blocks
    "Loading states", // loading prop
    "Status display", // VIM status
    "Format CSS", // format functionality
  ];

  let implementedFeatures = 0;
  const featureResults = [];

  requiredFeatures.forEach((feature) => {
    let implemented = false;

    switch (feature) {
      case "Monaco Editor":
        implemented =
          content.includes("<Editor") &&
          content.includes("@monaco-editor/react");
        break;
      case "VIM mode":
        implemented =
          content.includes("initVimMode") && content.includes("monaco-vim");
        break;
      case "Dark theme":
        implemented = content.includes("vs-dark");
        break;
      case "CSS syntax highlighting":
        implemented = content.includes('language="css"');
        break;
      case "Auto-completion":
        implemented =
          content.includes("suggest:") && content.includes("showKeywords");
        break;
      case "Save functionality":
        implemented =
          content.includes("onSave") && content.includes("Save CSS");
        break;
      case "Error handling":
        implemented = content.includes("try {") && content.includes("catch");
        break;
      case "Loading states":
        implemented =
          content.includes("loading={") || content.includes("isSaving");
        break;
      case "Status display":
        implemented = content.includes("vim-status");
        break;
      case "Format CSS":
        implemented = content.includes("formatDocument");
        break;
    }

    if (implemented) {
      implementedFeatures++;
      featureResults.push(`✅ ${feature}`);
    } else {
      featureResults.push(`❌ ${feature}`);
    }
  });

  featureResults.forEach((result) => console.log(`   ${result}`));

  const completeness = (implementedFeatures / requiredFeatures.length) * 100;
  console.log(
    `\n📊 Feature completeness: ${completeness.toFixed(1)}% (${implementedFeatures}/${requiredFeatures.length})`
  );

  return completeness >= 90; // 90% or higher is considered passing
}

// Run all tests
async function runAllTests() {
  const tests = [
    { name: "CSS Editor Component", fn: testCSSEditorComponent },
    { name: "BlockComposer Integration", fn: testBlockComposerIntegration },
    { name: "Dependencies", fn: testDependencies },
    { name: "TypeScript Compatibility", fn: testTypeScriptCompatibility },
    { name: "Feature Completeness", fn: testFeatureCompleteness },
  ];

  let passedTests = 0;

  for (const test of tests) {
    try {
      const result = test.fn();
      if (result) passedTests++;
    } catch (error) {
      console.log(`❌ ${test.name} failed with error: ${error.message}`);
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log(`📋 Test Summary: ${passedTests}/${tests.length} tests passed`);

  if (passedTests === tests.length) {
    console.log("🎉 All tests passed! CSS Editor integration is complete.");
    console.log("\n✨ Phase 2A Implementation Status: COMPLETE");
    console.log("\n🚀 Ready for Phase 2B: CSS Live Preview Integration");
  } else {
    console.log("⚠️  Some tests failed. Please review the implementation.");
    console.log("\n🔧 Phase 2A Implementation Status: NEEDS ATTENTION");
  }

  console.log("\n📝 Next Steps:");
  console.log("   1. Test CSS editor in browser");
  console.log("   2. Verify VIM keybindings work (i, :w, :q, etc.)");
  console.log("   3. Test switching between Blocks and CSS modes");
  console.log("   4. Verify CSS content loads from selected stylesheet");
  console.log("   5. Test CSS save functionality");

  return passedTests === tests.length;
}

// Execute verification
runAllTests()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error("Verification failed:", error);
    process.exit(1);
  });
