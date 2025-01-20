import { MongoClient } from "mongodb";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const LOCAL_MONGODB_URI = "mongodb://localhost:27017";
const ATLAS_MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = "motive_archive";
const COLLECTION_NAME = "cars";

async function migrateCarsToAtlas() {
  if (!ATLAS_MONGODB_URI) {
    console.error("Error: MONGODB_URI is not defined in .env.local");
    process.exit(1);
  }

  const localClient = new MongoClient(LOCAL_MONGODB_URI);
  const atlasClient = new MongoClient(ATLAS_MONGODB_URI);

  try {
    await localClient.connect();
    console.log("Connected to local MongoDB");

    await atlasClient.connect();
    console.log("Connected to MongoDB Atlas");

    const localDb = localClient.db(DB_NAME);
    const atlasDb = atlasClient.db(DB_NAME);

    // Get count of documents in local collection
    const localCount = await localDb
      .collection(COLLECTION_NAME)
      .countDocuments();
    console.log(
      `Found ${localCount} documents in local ${COLLECTION_NAME} collection`
    );

    // Get all documents from local collection
    const documents = await localDb
      .collection(COLLECTION_NAME)
      .find({})
      .toArray();

    if (documents.length === 0) {
      console.log("No documents found in local collection");
      return;
    }

    // Check if documents already exist in Atlas
    const atlasCount = await atlasDb
      .collection(COLLECTION_NAME)
      .countDocuments();
    console.log(
      `Found ${atlasCount} existing documents in Atlas ${COLLECTION_NAME} collection`
    );

    if (atlasCount > 0) {
      const proceed = await askForConfirmation(
        "Documents already exist in Atlas. Do you want to proceed and potentially create duplicates? (y/n): "
      );
      if (!proceed) {
        console.log("Migration cancelled");
        return;
      }
    }

    // Insert documents into Atlas collection
    console.log(`Migrating ${documents.length} documents to Atlas...`);
    const result = await atlasDb
      .collection(COLLECTION_NAME)
      .insertMany(documents);

    console.log(
      `Successfully migrated ${result.insertedCount} documents to Atlas`
    );
  } catch (error) {
    console.error("Error during migration:", error);
  } finally {
    await localClient.close();
    await atlasClient.close();
  }
}

// Helper function to ask for confirmation
function askForConfirmation(question: string): Promise<boolean> {
  return new Promise((resolve) => {
    process.stdout.write(question);
    process.stdin.once("data", (data) => {
      const answer = data.toString().trim().toLowerCase();
      resolve(answer === "y" || answer === "yes");
    });
  });
}

// Run the migration
migrateCarsToAtlas();
