/**
 * Script to identify and remove duplicate car images from the database
 *
 * This script:
 * 1. Fetches all cars from the database
 * 2. For each car, checks for duplicate images based on URL
 * 3. Keeps one instance of each unique image and removes duplicates
 * 4. Updates the car's imageIds array to remove references to deleted images
 *
 * Usage:
 *   - Dry run (no deletion): node scripts/fix-duplicate-images.js
 *   - Delete duplicates: node scripts/fix-duplicate-images.js --delete
 */

import dotenv from "dotenv";
import { ObjectId } from "mongodb";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { MongoClient } from "mongodb";

// Setup environment for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Simple dotenv configuration that works in other scripts
dotenv.config();

// Check if --delete flag is provided
const DELETE_MODE = process.argv.includes("--delete");

// Stats for reporting
const stats = {
  carsProcessed: 0,
  carsWithDuplicates: 0,
  totalDuplicatesRemoved: 0,
  totalImagesChecked: 0,
  totalCarsUpdated: 0,
  totalDanglingReferences: 0,
  totalDanglingReferencesFixed: 0,
  errors: 0,
};

/**
 * Find duplicate images for a specific car
 */
async function processCarImages(db, car) {
  const carId = car._id;
  console.log(
    `\nProcessing car: ${car.make || "Unknown"} ${car.model || "Unknown"} (${
      car.year || "Unknown"
    }) - ID: ${carId}`
  );

  // Skip if car has no imageIds
  if (
    !car.imageIds ||
    !Array.isArray(car.imageIds) ||
    car.imageIds.length === 0
  ) {
    console.log(`  No images found for this car, skipping`);
    return 0;
  }

  // Convert string IDs to ObjectIds for querying
  const imageObjectIds = car.imageIds.map((id) => {
    return typeof id === "string" ? new ObjectId(id) : id;
  });

  // Fetch all images for this car
  const images = await db
    .collection("images")
    .find({
      _id: { $in: imageObjectIds },
    })
    .toArray();

  stats.totalImagesChecked += images.length;
  console.log(
    `  Found ${images.length} images for this car (out of ${car.imageIds.length} IDs in car.imageIds)`
  );

  // Check for missing images (references to non-existent images)
  const foundImageIds = new Set(images.map((img) => img._id.toString()));
  const missingImageIds = car.imageIds
    .filter((id) => !foundImageIds.has(id.toString()))
    .map((id) => id.toString());

  if (missingImageIds.length > 0) {
    console.log(
      `  Found ${
        missingImageIds.length
      } references to non-existent images: ${missingImageIds.join(", ")}`
    );
    stats.totalDanglingReferences += missingImageIds.length;

    if (DELETE_MODE) {
      try {
        // Update the car to remove references to non-existent images
        const updateResult = await db
          .collection("cars")
          .updateOne(
            { _id: carId },
            { $pull: { imageIds: { $in: missingImageIds } } }
          );

        if (updateResult.modifiedCount > 0) {
          console.log(
            `  Updated car ${carId} to remove references to non-existent images`
          );
          stats.totalDanglingReferencesFixed += missingImageIds.length;
          stats.totalCarsUpdated++;
        }
      } catch (error) {
        console.error(`  Error removing dangling references: ${error.message}`);
        stats.errors++;
      }
    }
  }

  // Create a map to track unique images by URL
  const uniqueImages = new Map();
  const duplicates = [];

  // Identify duplicates
  for (const image of images) {
    // Standardize URL for comparison (remove trailing /public if present)
    const standardUrl = image.url.endsWith("/public")
      ? image.url.slice(0, -7)
      : image.url;

    if (uniqueImages.has(standardUrl)) {
      // This is a duplicate
      duplicates.push({
        original: uniqueImages.get(standardUrl),
        duplicate: image,
      });
    } else {
      // First time seeing this URL
      uniqueImages.set(standardUrl, image);
    }
  }

  if (duplicates.length === 0) {
    console.log(`  No duplicates found for this car`);
    return 0;
  }

  console.log(`  Found ${duplicates.length} duplicate images`);
  stats.carsWithDuplicates++;
  stats.totalDuplicatesRemoved += duplicates.length;

  // Get the IDs of images to remove
  const idsToRemove = duplicates.map((dup) => dup.duplicate._id);

  // Create a list of IDs to keep (for updating the car)
  const imageIdsToKeep = images
    .filter(
      (img) => !idsToRemove.some((id) => id.toString() === img._id.toString())
    )
    .map((img) => img._id);

  console.log(`  Keeping ${imageIdsToKeep.length} unique images`);

  // Log what would be deleted
  console.log(
    `  ${
      DELETE_MODE ? "Deleting" : "Would delete"
    } the following images: ${idsToRemove
      .map((id) => id.toString())
      .join(", ")}`
  );

  if (DELETE_MODE) {
    try {
      // 1. Delete the duplicate images from the images collection
      const deleteResult = await db.collection("images").deleteMany({
        _id: { $in: idsToRemove },
      });

      console.log(`  Deleted ${deleteResult.deletedCount} duplicate images`);

      // 2. Update the car's imageIds array to remove references to deleted images
      // Convert any ObjectIds to strings for comparison
      const imageIdsToKeepStrings = imageIdsToKeep.map((id) => id.toString());
      const carImageIdsToKeep = car.imageIds
        .filter((id) => imageIdsToKeepStrings.includes(id.toString()))
        .map((id) => (typeof id === "string" ? id : id.toString()));

      const updateResult = await db
        .collection("cars")
        .updateOne({ _id: carId }, { $set: { imageIds: carImageIdsToKeep } });

      if (updateResult.modifiedCount > 0) {
        console.log(
          `  Updated car ${carId} to remove references to deleted images`
        );
        stats.totalCarsUpdated++;
      } else {
        console.log(`  No update needed for car ${carId}`);
      }
    } catch (error) {
      console.error(`  Error deleting duplicate images: ${error.message}`);
      stats.errors++;
    }
  }

  return duplicates.length;
}

/**
 * Check for orphaned images (images without a car reference)
 */
async function checkForOrphanedImages(db) {
  console.log(
    "\nChecking for orphaned images (images not referenced by any car)..."
  );

  try {
    // Get all car IDs
    const carIds = await db
      .collection("cars")
      .find({}, { projection: { _id: 1 } })
      .toArray()
      .then((cars) => cars.map((car) => car._id.toString()));

    console.log(`Found ${carIds.length} cars in the database`);

    // Find images not associated with any car
    const orphanedImages = await db
      .collection("images")
      .find({
        carId: { $exists: true, $nin: carIds.map((id) => new ObjectId(id)) },
      })
      .toArray();

    console.log(`Found ${orphanedImages.length} orphaned images`);

    if (orphanedImages.length > 0) {
      console.log(
        `Orphaned image IDs: ${orphanedImages
          .map((img) => img._id.toString())
          .join(", ")}`
      );

      if (DELETE_MODE) {
        try {
          // Delete orphaned images
          const deleteResult = await db.collection("images").deleteMany({
            _id: { $in: orphanedImages.map((img) => img._id) },
          });

          console.log(`Deleted ${deleteResult.deletedCount} orphaned images`);
        } catch (error) {
          console.error(`Error deleting orphaned images: ${error.message}`);
          stats.errors++;
        }
      }
    }
  } catch (error) {
    console.error(`Error checking for orphaned images: ${error.message}`);
    stats.errors++;
  }
}

async function main() {
  console.log(`Running in ${DELETE_MODE ? "DELETE" : "DRY RUN"} mode`);
  console.log(
    `To ${DELETE_MODE ? "disable" : "enable"} deletion, run with${
      DELETE_MODE ? "out" : ""
    } the --delete flag`
  );

  // Connect to MongoDB using the common pattern from successful scripts
  const client = await MongoClient.connect(process.env.MONGODB_URI);
  const db = client.db(process.env.MONGODB_DB || "motive_archive");

  try {
    console.log(`Connected to database: ${db.databaseName}`);

    // Add more detailed logging
    console.log("Starting to query for cars...");
    console.time("car-query");

    // Process all cars now that we've confirmed the script works
    const cars = await db.collection("cars").find({}).toArray();

    console.timeEnd("car-query");
    console.log(`Found ${cars.length} cars in the database`);

    if (cars.length === 0) {
      console.log("No cars found! Checking if the 'cars' collection exists...");
      const collections = await db.listCollections().toArray();
      console.log("Available collections:");
      collections.forEach((c) => console.log(` - ${c.name}`));
    }

    // Process each car with more detailed logging
    console.log("Starting to process cars...");
    for (const car of cars) {
      try {
        console.log(
          `Processing car ${stats.carsProcessed + 1}/${cars.length}: ${car._id}`
        );
        stats.carsProcessed++;

        // Set a timeout to detect if the process is hanging
        const timeout = setTimeout(() => {
          console.warn(
            `⚠️ Warning: Processing car ${car._id} is taking longer than expected (>30s)`
          );
        }, 30000);

        await processCarImages(db, car);

        // Clear the timeout if processing completes normally
        clearTimeout(timeout);
      } catch (error) {
        console.error(`Error processing car ${car._id}:`, error);
        console.error(error.stack);
        stats.errors++;
      }

      // Log progress after each car
      console.log(
        `Progress: ${stats.carsProcessed}/${cars.length} cars processed`
      );
    }

    // Check for orphaned images with timeout and error handling
    console.log("Starting orphaned images check...");
    try {
      const orphanedTimeout = setTimeout(() => {
        console.warn(
          "⚠️ Warning: Orphaned images check is taking longer than expected (>60s)"
        );
      }, 60000);

      await checkForOrphanedImages(db);

      clearTimeout(orphanedTimeout);
      console.log("Completed orphaned images check");
    } catch (error) {
      console.error("Error checking for orphaned images:", error);
      console.error(error.stack);
      stats.errors++;
    }

    // Print summary statistics
    console.log("\n======== SUMMARY ========");
    console.log(`Cars processed: ${stats.carsProcessed}`);
    console.log(`Cars with duplicates: ${stats.carsWithDuplicates}`);
    console.log(`Total images checked: ${stats.totalImagesChecked}`);
    console.log(`Total duplicates found: ${stats.totalDuplicatesRemoved}`);
    console.log(
      `Total dangling references found: ${stats.totalDanglingReferences}`
    );
    if (DELETE_MODE) {
      console.log(`Cars updated: ${stats.totalCarsUpdated}`);
      console.log(
        `Dangling references fixed: ${stats.totalDanglingReferencesFixed}`
      );
    }
    console.log(`Errors encountered: ${stats.errors}`);
    console.log("=========================");

    if (!DELETE_MODE) {
      console.log("\nThis was a DRY RUN. No images were deleted.");
      console.log("To actually remove duplicates, run with the --delete flag.");
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await client.close();
    console.log("MongoDB connection closed");
    console.log("Finished processing");
  }
}

main().catch(console.error);
