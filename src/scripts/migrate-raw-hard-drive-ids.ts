import { MongoClient, ObjectId } from "mongodb";
import * as dotenv from "dotenv";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB || "motive_archive";

if (!MONGODB_URI) {
  throw new Error("Please add your Mongo URI to .env");
}

async function main() {
  console.log("Starting raw asset hard drive IDs migration...");
  const client = await MongoClient.connect(MONGODB_URI as string);
  const db = client.db(DB_NAME);

  try {
    // Get all raw assets
    const rawCollection = db.collection("raw_assets");
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
    const unmatchedHardDrives = new Set<string>();

    // Process each raw asset
    for (const asset of rawAssets) {
      try {
        // Check if the asset has locations field
        if (asset.locations) {
          console.log(`Processing asset ${asset._id} with locations field`);

          // Map string locations to hard drive IDs
          const newHardDriveIds = asset.locations
            .map((location: string | ObjectId) => {
              const locationStr =
                location instanceof ObjectId ? location.toString() : location;

              // If it's already an ObjectId, use it directly
              if (ObjectId.isValid(locationStr)) {
                return new ObjectId(locationStr);
              }

              // Otherwise, try to find a matching hard drive by label
              const driveId = driveMap.get(locationStr.toLowerCase());
              if (!driveId) {
                unmatchedHardDrives.add(locationStr);
                return null;
              }
              return driveId;
            })
            .filter((id: ObjectId | null): id is ObjectId => id !== null);

          // Update the asset with the new hard drive IDs and remove locations
          await rawCollection.updateOne(
            { _id: asset._id },
            {
              $set: {
                hardDriveIds: newHardDriveIds,
                updatedAt: new Date(),
              },
              $unset: { locations: "" },
            }
          );

          updated++;
          if (updated % 10 === 0) {
            console.log(`Processed ${updated} assets...`);
          }
        } else if (!asset.hardDriveIds) {
          // If neither locations nor hardDriveIds exist, set an empty array
          await rawCollection.updateOne(
            { _id: asset._id },
            {
              $set: {
                hardDriveIds: [],
                updatedAt: new Date(),
              },
            }
          );

          console.log(`Added empty hardDriveIds array to asset ${asset._id}`);
          updated++;
        } else {
          console.log(`Skipping asset ${asset._id} - already has hardDriveIds`);
          skipped++;
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

    if (unmatchedHardDrives.size > 0) {
      console.log("\nUnmatched hard drives:");
      console.log(Array.from(unmatchedHardDrives).join("\n"));

      // Create hard drives for unmatched locations
      console.log("\nCreating hard drives for unmatched hard drives...");
      for (const label of unmatchedHardDrives) {
        try {
          const existingDrive = await hardDrivesCollection.findOne({
            label: label,
          });
          if (!existingDrive) {
            await hardDrivesCollection.insertOne({
              label: label,
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
            console.log(`Created hard drive for: ${label}`);
          }
        } catch (error) {
          console.error(`Error creating hard drive for ${label}:`, error);
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
