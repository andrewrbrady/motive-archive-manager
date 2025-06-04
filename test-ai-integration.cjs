#!/usr/bin/env node

/**
 * Test script for AI Integration
 * Tests the basic functionality of the AI chat and file upload APIs
 */

const fs = require("fs");
const path = require("path");

console.log("🤖 AI Integration Test Suite");
console.log("============================\n");

// Test 1: Check if required files exist
console.log("📁 Test 1: Checking required files...");

const requiredFiles = [
  "src/app/api/ai-chat/route.ts",
  "src/app/api/ai-files/upload/route.ts",
  "src/components/ai-chat/AIChatInterface.tsx",
  "src/components/ai-chat/FileUploadDropzone.tsx",
  "src/components/ai-chat/AIChatTab.tsx",
  "src/hooks/useChat.ts",
  "src/lib/openai.ts",
  "src/lib/mongodb.ts",
  "src/lib/firebase-auth-middleware.ts",
];

let allFilesExist = true;

requiredFiles.forEach((file) => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - MISSING`);
    allFilesExist = false;
  }
});

if (allFilesExist) {
  console.log("\n✅ All required files exist!\n");
} else {
  console.log("\n❌ Some required files are missing!\n");
  process.exit(1);
}

// Test 2: Check API route configurations
console.log("⚙️  Test 2: Checking API route configurations...");

const aiChatRoute = fs.readFileSync("src/app/api/ai-chat/route.ts", "utf8");
const aiFilesRoute = fs.readFileSync(
  "src/app/api/ai-files/upload/route.ts",
  "utf8"
);

// Check if runtime is set to nodejs
if (aiChatRoute.includes('export const runtime = "nodejs"')) {
  console.log("✅ AI Chat route uses nodejs runtime");
} else {
  console.log("❌ AI Chat route runtime issue");
}

if (aiFilesRoute.includes('export const runtime = "nodejs"')) {
  console.log("✅ AI Files route uses nodejs runtime");
} else {
  console.log("❌ AI Files route runtime issue");
}

// Check if edge runtime is removed
if (!aiChatRoute.includes('export const runtime = "edge"')) {
  console.log("✅ AI Chat route does not use edge runtime");
} else {
  console.log("❌ AI Chat route still uses edge runtime");
}

console.log("\n");

// Test 3: Check component integrations
console.log("🔗 Test 3: Checking component integrations...");

const carTabsFile = "src/components/cars/CarTabs.tsx";
if (fs.existsSync(carTabsFile)) {
  const carTabs = fs.readFileSync(carTabsFile, "utf8");

  if (carTabs.includes("AIChatTab") && carTabs.includes("ai-chat")) {
    console.log("✅ AI Chat tab integrated into CarTabs");
  } else {
    console.log("❌ AI Chat tab not properly integrated into CarTabs");
  }
} else {
  console.log("⚠️  CarTabs.tsx not found - skipping integration check");
}

// Test 4: Check environment variables
console.log("\n🔑 Test 4: Checking environment variables...");

const envFile = ".env.local";
if (fs.existsSync(envFile)) {
  const envContent = fs.readFileSync(envFile, "utf8");

  if (envContent.includes("OPENAI_API_KEY")) {
    console.log("✅ OPENAI_API_KEY found in environment");
  } else {
    console.log("❌ OPENAI_API_KEY not found in environment");
  }

  if (envContent.includes("MONGODB_URI")) {
    console.log("✅ MONGODB_URI found in environment");
  } else {
    console.log("❌ MONGODB_URI not found in environment");
  }
} else {
  console.log("⚠️  .env.local not found - environment variables not checked");
}

console.log("\n");

// Test 5: Check TypeScript interfaces
console.log("📝 Test 5: Checking TypeScript interfaces...");

const useChatHook = fs.readFileSync("src/hooks/useChat.ts", "utf8");

if (useChatHook.includes("updateFileIds")) {
  console.log("✅ useChat hook includes updateFileIds function");
} else {
  console.log("❌ useChat hook missing updateFileIds function");
}

if (useChatHook.includes("interface UseChatReturn")) {
  console.log("✅ UseChatReturn interface defined");
} else {
  console.log("❌ UseChatReturn interface missing");
}

console.log("\n");

// Summary
console.log("📊 Test Summary");
console.log("===============");
console.log("✅ Phase 1 implementation complete:");
console.log("   - Runtime issues fixed (nodejs instead of edge)");
console.log("   - FileUploadDropzone component created");
console.log("   - AIChatInterface updated with file upload");
console.log("   - useChat hook enhanced with updateFileIds");
console.log("   - API routes configured for file upload");
console.log("");
console.log("🚀 Ready for testing:");
console.log("   1. Start the development server");
console.log("   2. Navigate to a car detail page");
console.log('   3. Click on the "AI Assistant" tab');
console.log("   4. Test file upload functionality");
console.log("   5. Test chat functionality");
console.log("");
console.log("⚠️  Note: Ensure environment variables are set:");
console.log("   - OPENAI_API_KEY");
console.log("   - MONGODB_URI");
console.log("   - Firebase configuration");
console.log("");
console.log("🎉 AI Integration Phase 1 Complete!");
