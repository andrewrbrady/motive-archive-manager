// Test script to verify environment configuration
require("dotenv").config({ path: ".env.local" });

console.log("🔍 ENVIRONMENT VERIFICATION");
console.log("=============================");
console.log(
  "CANVAS_EXTENSION_SERVICE_URL:",
  process.env.CANVAS_EXTENSION_SERVICE_URL
);
console.log("Expected: https://canvas-extension-s6vo3k273a-uc.a.run.app");
console.log(
  "Match:",
  process.env.CANVAS_EXTENSION_SERVICE_URL ===
    "https://canvas-extension-s6vo3k273a-uc.a.run.app"
    ? "✅ YES"
    : "❌ NO"
);
