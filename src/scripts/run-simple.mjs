#!/usr/bin/env node

import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import * as dotenv from "dotenv";

// Setup __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Process environment variables
const rootDir = path.resolve(__dirname, "../..");
dotenv.config({ path: path.join(rootDir, ".env") });
dotenv.config({ path: path.join(rootDir, ".env.local"), override: true });

console.log("Starting simple migration script runner...");
console.log("Current directory:", process.cwd());
console.log("Root directory:", rootDir);

// Run the migration script directly
try {
  const cmd = spawn(
    "tsx",
    [path.join(__dirname, "migrate-deliverable-editors.ts")],
    {
      stdio: "inherit",
      env: process.env,
    }
  );

  cmd.on("error", (error) => {
    console.error("Failed to start migration:", error);
    process.exit(1);
  });

  cmd.on("close", (code) => {
    if (code === 0) {
      console.log("Migration completed successfully");
    } else {
      console.error(`Migration exited with code ${code}`);
      process.exit(code || 1);
    }
  });
} catch (error) {
  console.error("Error executing migration:", error);
  process.exit(1);
}
