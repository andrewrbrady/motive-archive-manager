/**
 * Script to create locations from existing hard drive location strings
 *
 * This script:
 * 1. Fetches all hard drives
 * 2. Extracts unique location strings
 * 3. Creates location documents for each unique location
 *
 * Run with: node src/scripts/create-locations-from-hard-drives.js
 */

import { MongoClient, ObjectId } from "mongodb";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname } from "path";

// Initialize dotenv
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017";
const DB_NAME = "motive_archive";

async function main() {
  console.log("Starting location creation from hard drives...");

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

    // Extract unique location strings
    const locationSet = new Set();
    hardDrives.forEach((drive) => {
      if (
        drive.location &&
        typeof drive.location === "string" &&
        drive.location.trim() !== ""
      ) {
        locationSet.add(drive.location.trim());
      }
    });

    const uniqueLocations = Array.from(locationSet);
    console.log(`Found ${uniqueLocations.length} unique locations`);

    if (uniqueLocations.length === 0) {
      console.log("No locations found in hard drives.");
      return;
    }

    // Check for existing locations
    const existingLocations = await locationsCollection.find({}).toArray();
    console.log(
      `Found ${existingLocations.length} existing locations in the database`
    );

    const existingLocationNames = new Set(
      existingLocations.map((loc) => loc.name.toLowerCase())
    );

    // Create locations for each unique location string
    let created = 0;
    let skipped = 0;

    for (const locationName of uniqueLocations) {
      // Skip if location already exists
      if (existingLocationNames.has(locationName.toLowerCase())) {
        console.log(`Location "${locationName}" already exists, skipping`);
        skipped++;
        continue;
      }

      // Create a new location
      const locationDoc = {
        name: locationName,
        type: guessLocationType(locationName),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await locationsCollection.insertOne(locationDoc);
      console.log(
        `Created location "${locationName}" with ID: ${result.insertedId}`
      );
      created++;
    }

    console.log("\nLocation creation complete!");
    console.log(`Created: ${created}`);
    console.log(`Skipped: ${skipped}`);
  } catch (error) {
    console.error("Error during location creation:", error);
  } finally {
    await client.close();
    console.log("Disconnected from MongoDB");
  }
}

/**
 * Guess the location type based on the location name
 */
function guessLocationType(locationName) {
  const name = locationName.toLowerCase();

  if (name.includes("studio")) return "Studio";
  if (name.includes("office")) return "Office";
  if (name.includes("warehouse")) return "Warehouse";
  if (name.includes("storage")) return "Storage";
  if (name.includes("client")) return "Client Site";
  if (name.includes("shoot")) return "Shooting Location";

  // Default type
  return "Other";
}

main().catch(console.error);
