// Script to add a test raw asset to the database
import dotenv from "dotenv";
import { MongoClient, ObjectId } from "mongodb";

dotenv.config();

async function main() {
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB || "motive_archive";

  if (!uri) {
    console.error("MONGODB_URI not found in environment variables");
    process.exit(1);
  }

  console.log(`Connecting to MongoDB database: ${dbName}`);

  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log("Connected to MongoDB");

    const db = client.db(dbName);
    const rawAssetsCollection = db.collection("raw_assets");

    // Get an existing hard drive ID
    const hardDrivesCollection = db.collection("hard_drives");
    const hardDrives = await hardDrivesCollection.find({}).limit(1).toArray();

    if (!hardDrives.length) {
      console.error("No hard drives found in the database");
      return;
    }

    const hardDriveId = hardDrives[0]._id;

    // Create a test raw asset
    const testAsset = {
      date: new Date().toISOString().slice(2, 10).replace(/-/g, ""),
      description: "Test Raw Asset created by script",
      hardDriveIds: [hardDriveId],
      carIds: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    console.log("Creating test raw asset:", testAsset);

    const result = await rawAssetsCollection.insertOne(testAsset);

    console.log(`Raw asset created with ID: ${result.insertedId}`);
    console.log("Done!");
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await client.close();
  }
}

main()
  .then(() => console.log("Script completed successfully"))
  .catch(console.error);
