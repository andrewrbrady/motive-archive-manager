import { MongoClient, ObjectId } from "mongodb";
import { HardDrive } from "@/models/hard-drive";
import * as dotenv from "dotenv";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB || "motive_archive";

if (!MONGODB_URI) {
  throw new Error("Please add your Mongo URI to .env");
}

async function main() {
  console.log("Starting hard drive migration...");
  const client = await MongoClient.connect(MONGODB_URI as string);
  const db = client.db(DB_NAME);

  try {
    // Get all raw assets
    console.log("Fetching raw assets...");
    const rawCollection = db.collection("raw");
    const count = await rawCollection.countDocuments();
    console.log(`Total raw assets in collection: ${count}`);

    const rawAssets = await rawCollection.find({}).toArray();
    console.log(`Successfully fetched ${rawAssets.length} raw assets`);

    // Create a map to store location -> assets mapping
    const locationAssetsMap = new Map<string, ObjectId[]>();

    // Build the location -> assets mapping
    console.log("Processing raw assets to extract storage locations...");
    let assetsWithLocations = 0;
    rawAssets.forEach((asset) => {
      if (asset.locations && Array.isArray(asset.locations)) {
        assetsWithLocations++;
        asset.locations.forEach((location: string) => {
          const trimmedLocation = location.trim();
          if (trimmedLocation) {
            const existingAssets = locationAssetsMap.get(trimmedLocation) || [];
            locationAssetsMap.set(trimmedLocation, [
              ...existingAssets,
              asset._id,
            ]);
          }
        });
      }
    });

    console.log(`Found ${assetsWithLocations} assets with locations`);
    console.log(`Found ${locationAssetsMap.size} unique storage locations`);

    if (locationAssetsMap.size === 0) {
      console.log(
        "No storage locations found in raw assets. Checking raw asset data:"
      );
      console.log(
        "Sample of first few raw assets:",
        JSON.stringify(rawAssets.slice(0, 3), null, 2)
      );
      return;
    }

    // Create hard drives for each location with their associated assets
    const results = {
      created: 0,
      skipped: 0,
      errors: 0,
    };

    for (const [location, assetIds] of locationAssetsMap.entries()) {
      try {
        // Check if drive already exists
        const existingDrive = await db
          .collection("hard_drives")
          .findOne({ label: location });

        if (existingDrive) {
          console.log(`Updating existing drive: ${location}`);
          // Update existing drive with asset references
          await db.collection("hard_drives").updateOne(
            { _id: existingDrive._id },
            {
              $addToSet: { rawAssets: { $each: assetIds } },
              $set: { updatedAt: new Date() },
            }
          );
          results.skipped++;
          continue;
        }

        // Create new hard drive with asset references
        const newDrive = {
          label: location,
          capacity: {
            total: 0, // Set to 0 as we don't know the actual capacity
          },
          type: "HDD", // Default type
          interface: "USB", // Default interface
          status: "In Use",
          location: "Studio", // Default location
          notes: "Created from raw asset location migration",
          rawAssets: assetIds,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        await db.collection("hard_drives").insertOne(newDrive);

        console.log(
          `Created hard drive for: ${location} with ${assetIds.length} assets`
        );
        results.created++;
      } catch (error) {
        console.error(`Error creating hard drive for ${location}:`, error);
        results.errors++;
      }
    }

    console.log("\nMigration completed:");
    console.log(`- Created: ${results.created}`);
    console.log(`- Skipped (Updated): ${results.skipped}`);
    console.log(`- Errors: ${results.errors}`);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  } finally {
    await client.close();
    console.log("MongoDB connection closed");
  }
}

main().catch(console.error);
