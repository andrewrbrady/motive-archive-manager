#!/usr/bin/env node

/**
 * Direct migration runner for deliverable editors
 * This file directly imports and runs the migration logic
 * to avoid any issues with ES modules vs CommonJS
 */

// First, make the script executable with proper permissions
import { chmod } from "fs/promises";
import { fileURLToPath } from "url";
import path from "path";

// Get current file path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

try {
  // Make this file executable (chmod +x)
  await chmod(__filename, 0o755);
  console.log("Set executable permissions on script file");

  // Import and run the migration function
  console.log("Starting migration...");

  // Import the migration function directly
  const { default: migrateDeliverableEditors } = await import(
    "./migrate-deliverable-editors.js"
  );

  // Run the migration
  if (typeof migrateDeliverableEditors === "function") {
    await migrateDeliverableEditors();
  } else {
    console.error("Migration function not found or not a function");
    process.exit(1);
  }
} catch (error) {
  console.error("Error running migration:", error);
  process.exit(1);
}
