import { MongoClient, ObjectId } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

async function fixHardDrivesInvalidAssets() {
  try {
    const client = new MongoClient(process.env.MONGODB_URI as string);
    await client.connect();
    const db = client.db();

    console.log(
      "Starting to check all hard drives for invalid raw asset references..."
    );

    // Get all hard drives
    const hardDrives = await db.collection("hard_drives").find({}).toArray();
    console.log(`Found ${hardDrives.length} hard drives to check`);

    let totalFixed = 0;
    let totalInvalidAssets = 0;

    // Process each hard drive
    for (const drive of hardDrives) {
      const driveId = drive._id.toString();
      const rawAssets = drive.rawAssets || [];

      if (rawAssets.length === 0) {
        console.log(
          `Drive ${drive.label} (${driveId}): No raw assets to check`
        );
        continue;
      }

      console.log(
        `\nChecking drive ${drive.label} (${driveId}): ${rawAssets.length} raw assets`
      );

      // Check each raw asset and collect valid ones
      const validAssetIds: ObjectId[] = [];
      const invalidAssetIds: string[] = [];

      for (const assetId of rawAssets) {
        try {
          const asset = await db.collection("raw_assets").findOne({
            _id: new ObjectId(assetId.toString()),
          });

          if (asset) {
            validAssetIds.push(new ObjectId(assetId.toString()));
          } else {
            invalidAssetIds.push(assetId.toString());
          }
        } catch (error) {
          console.error(`Error checking asset ${assetId}:`, error);
          invalidAssetIds.push(assetId.toString());
        }
      }

      // If there are invalid assets, update the drive
      if (invalidAssetIds.length > 0) {
        console.log(
          `Drive ${drive.label}: Found ${invalidAssetIds.length} invalid assets to remove`
        );

        // Update the drive with only valid asset IDs
        const updateResult = await db
          .collection("hard_drives")
          .updateOne(
            { _id: new ObjectId(driveId) },
            { $set: { rawAssets: validAssetIds } }
          );

        if (updateResult.modifiedCount > 0) {
          totalFixed++;
          totalInvalidAssets += invalidAssetIds.length;
          console.log(
            `Drive ${drive.label}: Successfully removed ${invalidAssetIds.length} invalid assets`
          );
        } else {
          console.log(`Drive ${drive.label}: No changes made`);
        }
      } else {
        console.log(
          `Drive ${drive.label}: All ${validAssetIds.length} assets are valid`
        );
      }
    }

    console.log("\nSummary:");
    console.log(`Total hard drives checked: ${hardDrives.length}`);
    console.log(`Hard drives fixed: ${totalFixed}`);
    console.log(`Total invalid assets removed: ${totalInvalidAssets}`);

    await client.close();
    console.log("\nDatabase connection closed");
  } catch (error) {
    console.error("Error:", error);
  }
}

fixHardDrivesInvalidAssets();
