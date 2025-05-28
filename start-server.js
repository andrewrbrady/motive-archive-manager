#!/usr/bin/env node

import { spawn } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log("🚀 Starting Motive Archive Manager...");

// Check if we're in standalone mode
const isStandalone = process.env.NEXT_BUILD_OUTPUT === "standalone";

if (isStandalone) {
  console.log("📦 Running in standalone mode");

  // Start the standalone server
  const serverPath = join(__dirname, ".next/standalone/server.js");
  const server = spawn("node", [serverPath], {
    stdio: "inherit",
    env: {
      ...process.env,
      PORT: process.env.PORT || "3000",
      HOSTNAME: process.env.HOSTNAME || "0.0.0.0",
    },
  });

  server.on("error", (err) => {
    console.error("❌ Failed to start server:", err);
    process.exit(1);
  });

  server.on("exit", (code) => {
    console.log(`🛑 Server exited with code ${code}`);
    process.exit(code);
  });
} else {
  console.log("🔧 Running in development mode");

  // Start the regular Next.js server
  const server = spawn("npx", ["next", "start"], {
    stdio: "inherit",
    env: {
      ...process.env,
      PORT: process.env.PORT || "3000",
    },
  });

  server.on("error", (err) => {
    console.error("❌ Failed to start server:", err);
    process.exit(1);
  });

  server.on("exit", (code) => {
    console.log(`🛑 Server exited with code ${code}`);
    process.exit(code);
  });
}

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("\n🛑 Shutting down gracefully...");
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\n🛑 Shutting down gracefully...");
  process.exit(0);
});
