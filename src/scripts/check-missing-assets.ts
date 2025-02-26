import { MongoClient, ObjectId } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

async function checkMissingAssets() {
  try {
    const client = new MongoClient(process.env.MONGODB_URI as string);
    await client.connect();
    const db = client.db();

    // Get the problematic drive
    const drive = await db.collection("hard_drives").findOne({
      _id: new ObjectId("67bd4ddfd3cffa315f768a55"),
    });

    if (!drive) {
      console.log("Drive not found");
      await client.close();
      return;
    }

    console.log("Drive details:");
    console.log(`Label: ${drive.label}`);
    console.log(`System Name: ${drive.systemName}`);
    console.log(`Raw Assets Count: ${drive.rawAssets?.length || 0}`);

    // Check each raw asset
    if (drive.rawAssets && drive.rawAssets.length > 0) {
      console.log("\nChecking raw assets:");
      let foundCount = 0;
      let missingCount = 0;

      for (const assetId of drive.rawAssets) {
        try {
          const asset = await db.collection("raw_assets").findOne({
            _id: new ObjectId(assetId),
          });

          if (asset) {
            foundCount++;
            console.log(`Asset ${assetId}: FOUND`);
          } else {
            missingCount++;
            console.log(`Asset ${assetId}: MISSING`);
          }
        } catch (error) {
          console.error(`Error checking asset ${assetId}:`, error);
        }
      }

      console.log(
        `\nSummary: Found ${foundCount} assets, Missing ${missingCount} assets`
      );
    }

    await client.close();
    console.log("Database connection closed");
  } catch (error) {
    console.error("Error:", error);
  }
}

checkMissingAssets();
