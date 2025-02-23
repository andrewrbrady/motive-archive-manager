import { MongoClient, ObjectId } from "mongodb";
import * as dotenv from "dotenv";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB || "motive_archive";

if (!MONGODB_URI) {
  throw new Error("Please add your Mongo URI to .env");
}

async function main() {
  console.log("Starting raw asset locations migration...");
  const client = await MongoClient.connect(MONGODB_URI as string);
  const db = client.db(DB_NAME);

  try {
    // Get all raw assets
    const rawCollection = db.collection("raw");
    const hardDrivesCollection = db.collection("hard_drives");

    console.log("Fetching all raw assets...");
    const rawAssets = await rawCollection.find({}).toArray();
    console.log(`Found ${rawAssets.length} raw assets`);

    // Get all hard drives for label matching
    console.log("Fetching all hard drives...");
    const hardDrives = await hardDrivesCollection.find({}).toArray();
    console.log(`Found ${hardDrives.length} hard drives`);

    // Create a map of labels to hard drive IDs
    const driveMap = new Map(
      hardDrives.map((drive) => [drive.label.toLowerCase(), drive._id])
    );

    let updated = 0;
    let skipped = 0;
    let errors = 0;
    const unmatchedLocations = new Set<string>();

    // Process each raw asset
    for (const asset of rawAssets) {
      try {
        if (!Array.isArray(asset.locations)) {
          console.log(`Skipping asset ${asset._id} - no locations array`);
          skipped++;
          continue;
        }

        // Skip if locations are already ObjectIds
        if (asset.locations.every((loc) => loc instanceof ObjectId)) {
          console.log(
            `Skipping asset ${asset._id} - locations already migrated`
          );
          skipped++;
          continue;
        }

        // Map string locations to hard drive IDs
        const newLocations = asset.locations
          .map((location) => {
            const driveId = driveMap.get(location.toLowerCase());
            if (!driveId) {
              unmatchedLocations.add(location);
              return null;
            }
            return driveId;
          })
          .filter((id): id is ObjectId => id !== null);

        // Update the asset with the new location IDs
        await rawCollection.updateOne(
          { _id: asset._id },
          {
            $set: {
              locations: newLocations,
              updatedAt: new Date(),
            },
          }
        );

        updated++;
        if (updated % 100 === 0) {
          console.log(`Processed ${updated} assets...`);
        }
      } catch (error) {
        console.error(`Error processing asset ${asset._id}:`, error);
        errors++;
      }
    }

    console.log("\nMigration completed:");
    console.log(`- Updated: ${updated}`);
    console.log(`- Skipped: ${skipped}`);
    console.log(`- Errors: ${errors}`);

    if (unmatchedLocations.size > 0) {
      console.log("\nUnmatched locations:");
      console.log(Array.from(unmatchedLocations).join("\n"));

      // Create hard drives for unmatched locations
      console.log("\nCreating hard drives for unmatched locations...");
      for (const location of unmatchedLocations) {
        try {
          const existingDrive = await hardDrivesCollection.findOne({
            label: location,
          });
          if (!existingDrive) {
            await hardDrivesCollection.insertOne({
              label: location,
              capacity: {
                total: 0,
                used: 0,
                available: 0,
              },
              type: "HDD",
              interface: "USB",
              status: "Unknown",
              rawAssets: [],
              createdAt: new Date(),
              updatedAt: new Date(),
            });
            console.log(`Created hard drive for: ${location}`);
          }
        } catch (error) {
          console.error(`Error creating hard drive for ${location}:`, error);
        }
      }
    }
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  } finally {
    await client.close();
    console.log("MongoDB connection closed");
  }
}

main().catch(console.error);
