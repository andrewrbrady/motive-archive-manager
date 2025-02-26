/**
 * Migration script to update hard drives to use the new location model
 *
 * This script:
 * 1. Fetches all hard drives
 * 2. For each hard drive with a location string, tries to find a matching location in the locations collection
 * 3. Updates the hard drive with the locationId
 *
 * Run with: npx ts-node -r tsconfig-paths/register src/scripts/migrate-hard-drives-locations.ts
 */

import { MongoClient, ObjectId } from "mongodb";
import { config } from "dotenv";

// Load environment variables
config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017";
const DB_NAME = "motive_archive";

async function main() {
  console.log("Starting hard drives location migration...");

  // Connect to MongoDB
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log("Connected to MongoDB");

    const db = client.db(DB_NAME);
    const hardDrivesCollection = db.collection("hard_drives");
    const locationsCollection = db.collection("locations");

    // Get all hard drives
    const hardDrives = await hardDrivesCollection.find({}).toArray();
    console.log(`Found ${hardDrives.length} hard drives`);

    // Get all locations
    const locations = await locationsCollection.find({}).toArray();
    console.log(`Found ${locations.length} locations`);

    if (locations.length === 0) {
      console.error("No locations found. Please create locations first.");
      return;
    }

    // Create a map of location names to IDs for quick lookup
    const locationMap = new Map();
    locations.forEach((location) => {
      locationMap.set(location.name.toLowerCase(), location._id.toString());
    });

    // Track migration statistics
    let updated = 0;
    let skipped = 0;
    let notFound = 0;

    // Process each hard drive
    for (const drive of hardDrives) {
      // Skip if the drive already has a locationId
      if (drive.locationId) {
        console.log(
          `Hard drive ${drive.label} already has locationId: ${drive.locationId}`
        );
        skipped++;
        continue;
      }

      // Skip if the drive doesn't have a location
      if (!drive.location) {
        console.log(`Hard drive ${drive.label} doesn't have a location`);
        skipped++;
        continue;
      }

      // Try to find a matching location
      const locationName = drive.location.toLowerCase();
      let locationId = null;

      // Exact match
      if (locationMap.has(locationName)) {
        locationId = locationMap.get(locationName);
      } else {
        // Try to find a partial match
        for (const [name, id] of locationMap.entries()) {
          if (locationName.includes(name) || name.includes(locationName)) {
            locationId = id;
            console.log(
              `Found partial match for "${drive.location}": "${name}"`
            );
            break;
          }
        }
      }

      if (locationId) {
        // Update the hard drive
        await hardDrivesCollection.updateOne(
          { _id: drive._id },
          {
            $set: {
              locationId: locationId,
              updatedAt: new Date(),
            },
          }
        );
        console.log(
          `Updated hard drive ${drive.label} with locationId: ${locationId}`
        );
        updated++;
      } else {
        console.log(`No matching location found for "${drive.location}"`);
        notFound++;
      }
    }

    console.log("\nMigration complete!");
    console.log(`Updated: ${updated}`);
    console.log(`Skipped: ${skipped}`);
    console.log(`Not found: ${notFound}`);
  } catch (error) {
    console.error("Error during migration:", error);
  } finally {
    await client.close();
    console.log("Disconnected from MongoDB");
  }
}

main().catch(console.error);
