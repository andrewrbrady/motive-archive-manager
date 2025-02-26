import { MongoClient, ObjectId } from "mongodb";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB || "motive_archive";

if (!MONGODB_URI) {
  throw new Error("Please add your Mongo URI to .env");
}

async function checkHardDrive() {
  console.log("Checking hard drive with ID: 67bd4ddfd3cffa315f768a55");
  const client = await MongoClient.connect(MONGODB_URI as string);
  const db = client.db(DB_NAME);

  try {
    // Get the hard drive
    const drive = await db.collection("hard_drives").findOne({
      _id: new ObjectId("67bd4ddfd3cffa315f768a55"),
    });

    console.log("Drive details:");
    console.log(JSON.stringify(drive, null, 2));

    // Check how many raw assets are associated with this drive
    if (drive && drive.rawAssets) {
      console.log(`Number of raw assets: ${drive.rawAssets.length}`);

      // Get a sample of the raw assets
      if (drive.rawAssets.length > 0) {
        const sampleAssetIds = drive.rawAssets.slice(0, 3);
        console.log(
          "Sample asset IDs:",
          sampleAssetIds.map((id: ObjectId) => id.toString())
        );

        const sampleAssets = await Promise.all(
          sampleAssetIds.map((id: ObjectId) =>
            db
              .collection("raw_assets")
              .findOne({ _id: new ObjectId(id.toString()) })
          )
        );

        console.log("Sample assets:", JSON.stringify(sampleAssets, null, 2));
      }
    }

    // Compare with another drive that works
    console.log("\nComparing with another drive:");
    const otherDrives = await db
      .collection("hard_drives")
      .find({
        _id: { $ne: new ObjectId("67bd4ddfd3cffa315f768a55") },
      })
      .limit(1)
      .toArray();

    if (otherDrives.length > 0) {
      const otherDrive = otherDrives[0];
      console.log("Other drive ID:", otherDrive._id.toString());
      console.log("Other drive details:", JSON.stringify(otherDrive, null, 2));
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await client.close();
    console.log("Database connection closed");
  }
}

// Run the check
checkHardDrive().catch(console.error);
