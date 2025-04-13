#!/usr/bin/env node

// This is a CommonJS script to avoid ES module issues
require("dotenv").config({ path: ".env" });
require("dotenv").config({ path: ".env.local" });

// Log important environment variables (without showing sensitive values)
console.log("Environment check:");
console.log("- NODE_ENV:", process.env.NODE_ENV);
console.log(
  "- MONGODB_URI:",
  process.env.MONGODB_URI ? "✓ defined" : "❌ missing"
);
console.log(
  "- FIREBASE_PROJECT_ID:",
  process.env.FIREBASE_PROJECT_ID ? "✓ defined" : "❌ missing"
);
console.log(
  "- FIREBASE_CLIENT_EMAIL:",
  process.env.FIREBASE_CLIENT_EMAIL ? "✓ defined" : "❌ missing"
);
console.log(
  "- FIREBASE_PRIVATE_KEY:",
  process.env.FIREBASE_PRIVATE_KEY ? "✓ defined" : "❌ missing"
);

// Set proper environment
process.env.NODE_ENV = process.env.NODE_ENV || "development";

// Run the script using tsx
const { execSync } = require("child_process");

try {
  console.log("\nRunning migration script...\n");

  // Execute the migration script with proper environment
  execSync("npx tsx src/scripts/migrate-deliverable-editors.ts", {
    stdio: "inherit",
    env: process.env,
  });

  console.log("\nMigration completed successfully");
  process.exit(0);
} catch (error) {
  console.error("\nMigration failed:", error.message);
  process.exit(1);
}
