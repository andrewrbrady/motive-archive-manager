import { MongoClient, ObjectId } from "mongodb";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB || "motive_archive";

if (!MONGODB_URI) {
  throw new Error("Please add your Mongo URI to .env");
}

async function reconcileRawAssetsAndHardDrives() {
  console.log("Starting reconciliation of raw assets and hard drives...");
  const client = await MongoClient.connect(MONGODB_URI as string);
  const db = client.db(DB_NAME);

  try {
    // Get all raw assets
    console.log("Fetching all raw assets...");
    const rawCollection = db.collection("raw_assets");
    const rawAssets = await rawCollection.find({}).toArray();
    console.log(`Found ${rawAssets.length} raw assets`);

    // Get all hard drives
    console.log("Fetching all hard drives...");
    const hardDrivesCollection = db.collection("hard_drives");
    const hardDrives = await hardDrivesCollection.find({}).toArray();
    console.log(`Found ${hardDrives.length} hard drives`);

    // Create a map of hard drive IDs to their raw assets
    const hardDriveMap = new Map();
    hardDrives.forEach((drive) => {
      hardDriveMap.set(drive._id.toString(), {
        drive,
        rawAssets: drive.rawAssets?.map((id: ObjectId) => id.toString()) || [],
      });
    });

    // Statistics for reporting
    const stats = {
      assetsWithoutValidHardDrives: 0,
      assetsWithInconsistentHardDrives: 0,
      drivesWithInconsistentAssets: 0,
      fixedAssetHardDrives: 0,
      fixedDriveAssets: 0,
      invalidHardDriveReferences: 0,
      invalidAssetReferences: 0,
    };

    // Check each raw asset
    console.log("Checking raw assets for inconsistencies...");
    for (const asset of rawAssets) {
      const assetId = asset._id.toString();
      const assetHardDriveIds =
        asset.hardDriveIds?.map((id: ObjectId) => id.toString()) || [];

      if (assetHardDriveIds.length === 0) {
        stats.assetsWithoutValidHardDrives++;
        continue;
      }

      let hasInconsistency = false;

      // For each hard drive in the asset
      for (const hardDriveId of assetHardDriveIds) {
        const driveInfo = hardDriveMap.get(hardDriveId);

        // If the hard drive doesn't exist
        if (!driveInfo) {
          console.log(
            `Warning: Asset ${assetId} references non-existent drive ${hardDriveId}`
          );
          stats.invalidHardDriveReferences++;
          continue;
        }

        // If the hard drive exists but doesn't have this asset
        if (!driveInfo.rawAssets.includes(assetId)) {
          console.log(`Adding asset ${assetId} to drive ${hardDriveId}`);
          await hardDrivesCollection.updateOne(
            { _id: new ObjectId(hardDriveId) },
            { $addToSet: { rawAssets: new ObjectId(assetId) } }
          );
          stats.fixedDriveAssets++;
          hasInconsistency = true;
        }
      }

      if (hasInconsistency) {
        stats.assetsWithInconsistentHardDrives++;
      }
    }

    // Check each hard drive
    console.log("Checking hard drives for inconsistencies...");
    for (const drive of hardDrives) {
      const driveId = drive._id.toString();
      const driveAssets =
        drive.rawAssets?.map((id: ObjectId) => id.toString()) || [];

      if (driveAssets.length === 0) {
        continue;
      }

      let hasInconsistency = false;

      // For each asset in the drive
      for (const assetId of driveAssets) {
        // Find the asset
        const asset = rawAssets.find((a) => a._id.toString() === assetId);

        // If the asset doesn't exist
        if (!asset) {
          console.log(
            `Warning: Drive ${driveId} references non-existent asset ${assetId}`
          );
          stats.invalidAssetReferences++;
          continue;
        }

        // Get the asset's hard drive IDs
        const assetHardDriveIds =
          asset.hardDriveIds?.map((id: ObjectId) => id.toString()) || [];

        // If the asset doesn't have this drive in its hard drive IDs
        if (!assetHardDriveIds.includes(driveId)) {
          console.log(
            `Adding drive ${driveId} to asset ${assetId} hard drive IDs`
          );
          await rawCollection.updateOne(
            { _id: new ObjectId(assetId) },
            { $addToSet: { hardDriveIds: new ObjectId(driveId) } }
          );
          stats.fixedAssetHardDrives++;
          hasInconsistency = true;
        }
      }

      if (hasInconsistency) {
        stats.drivesWithInconsistentAssets++;
      }
    }

    // Print summary
    console.log("\nReconciliation completed. Summary:");
    console.log(
      `- Assets without hard drives: ${stats.assetsWithoutValidHardDrives}`
    );
    console.log(
      `- Assets with inconsistent hard drives: ${stats.assetsWithInconsistentHardDrives}`
    );
    console.log(
      `- Drives with inconsistent assets: ${stats.drivesWithInconsistentAssets}`
    );
    console.log(`- Fixed asset hard drives: ${stats.fixedAssetHardDrives}`);
    console.log(`- Fixed drive assets: ${stats.fixedDriveAssets}`);
    console.log(
      `- Invalid hard drive references: ${stats.invalidHardDriveReferences}`
    );
    console.log(`- Invalid asset references: ${stats.invalidAssetReferences}`);
  } catch (error) {
    console.error("Error during reconciliation:", error);
  } finally {
    await client.close();
    console.log("Database connection closed");
  }
}

// Run the reconciliation
reconcileRawAssetsAndHardDrives().catch(console.error);
