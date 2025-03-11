#!/usr/bin/env node

// This script runs the standardization process for raw_assets
// It removes the 'cars' field and ensures 'carIds' is properly set

import "dotenv/config";
import { standardizeRawAssets } from "./standardize-raw-assets.js";

console.log("Starting raw_assets standardization process...");
console.log("This will:");
console.log("1. Ensure all documents with cars data have proper carIds");
console.log("2. Remove the cars field from all documents");
console.log("");
console.log("MongoDB URI:", process.env.MONGODB_URI ? "✓ Set" : "✗ Missing");
console.log(
  "MongoDB DB:",
  process.env.MONGODB_DB || "motive_archive (default)"
);
console.log("");

// Add a 3-second delay to allow the user to cancel if needed
console.log("Starting in 3 seconds... Press Ctrl+C to cancel");

setTimeout(() => {
  standardizeRawAssets()
    .then((result) => {
      console.log("\nStandardization completed successfully!");
      console.log("Summary:");
      console.log(
        `- Processed ${result.processedCount} assets with 'cars' field but missing 'carIds'`
      );
      console.log(`- Updated carIds for ${result.updatedCount} assets`);
      console.log(
        `- Removed 'cars' field from ${result.removedCarsField} assets`
      );
      console.log(
        `- Remaining assets with 'cars' field: ${result.remainingWithCars}`
      );

      if (result.remainingWithCars > 0) {
        console.log("\nWARNING: Some assets still have the cars field.");
        console.log(
          "You may need to run this script again or check those documents manually."
        );
      } else {
        console.log(
          "\nSuccess! All assets have been standardized to use only carIds."
        );
      }

      process.exit(0);
    })
    .catch((error) => {
      console.error("\nError during standardization:", error);
      process.exit(1);
    });
}, 3000);
