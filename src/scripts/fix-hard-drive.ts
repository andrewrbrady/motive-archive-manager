import { MongoClient, ObjectId } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

async function fixHardDrive() {
  try {
    const client = new MongoClient(process.env.MONGODB_URI as string);
    await client.connect();
    const db = client.db();

    // Get the problematic drive
    const driveId = "67bd4ddfd3cffa315f768a55";
    const drive = await db.collection("hard_drives").findOne({
      _id: new ObjectId(driveId),
    });

    if (!drive) {
      console.log("Drive not found");
      await client.close();
      return;
    }

    console.log("Drive details before fix:");
    console.log(`Label: ${drive.label}`);
    console.log(`System Name: ${drive.systemName}`);
    console.log(`Raw Assets Count: ${drive.rawAssets?.length || 0}`);

    // Check each raw asset and collect valid ones
    const validAssetIds: ObjectId[] = [];
    const invalidAssetIds: string[] = [];

    if (drive.rawAssets && drive.rawAssets.length > 0) {
      console.log("\nChecking raw assets:");

      for (const assetId of drive.rawAssets) {
        try {
          const asset = await db.collection("raw_assets").findOne({
            _id: new ObjectId(assetId),
          });

          if (asset) {
            validAssetIds.push(new ObjectId(assetId));
            console.log(`Asset ${assetId}: VALID`);
          } else {
            invalidAssetIds.push(assetId.toString());
            console.log(`Asset ${assetId}: INVALID - will be removed`);
          }
        } catch (error) {
          console.error(`Error checking asset ${assetId}:`, error);
          invalidAssetIds.push(assetId.toString());
        }
      }

      // Update the drive with only valid asset IDs
      const updateResult = await db
        .collection("hard_drives")
        .updateOne(
          { _id: new ObjectId(driveId) },
          { $set: { rawAssets: validAssetIds } }
        );

      console.log("\nUpdate result:");
      console.log(`Matched count: ${updateResult.matchedCount}`);
      console.log(`Modified count: ${updateResult.modifiedCount}`);
      console.log(`Removed ${invalidAssetIds.length} invalid asset references`);

      // Get the updated drive
      const updatedDrive = await db.collection("hard_drives").findOne({
        _id: new ObjectId(driveId),
      });

      console.log("\nDrive details after fix:");
      if (updatedDrive) {
        console.log(`Label: ${updatedDrive.label}`);
        console.log(`System Name: ${updatedDrive.systemName}`);
        console.log(`Raw Assets Count: ${updatedDrive.rawAssets?.length || 0}`);
      } else {
        console.log("Could not retrieve updated drive details");
      }
    }

    await client.close();
    console.log("\nDatabase connection closed");
  } catch (error) {
    console.error("Error:", error);
  }
}

fixHardDrive();
