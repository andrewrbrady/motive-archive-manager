import { MongoClient } from "mongodb";
import * as dotenv from "dotenv";
dotenv.config();

const COLLECTION_NAME = "research_vectors";

async function checkIndexes() {
  if (!process.env.MONGODB_URI) {
    console.error("MONGODB_URI environment variable is not set");
    process.exit(1);
  }

  const client = new MongoClient(process.env.MONGODB_URI);

  try {
    await client.connect();
    console.log("Connected to MongoDB");

    const db = client.db();

    // List regular indexes
    console.log("\nRegular indexes:");
    const regularIndexes = await db
      .collection(COLLECTION_NAME)
      .listIndexes()
      .toArray();
    console.log(JSON.stringify(regularIndexes, null, 2));

    // List search indexes
    console.log("\nSearch indexes:");
    const searchIndexes = await db
      .collection(COLLECTION_NAME)
      .listSearchIndexes()
      .toArray();
    console.log(JSON.stringify(searchIndexes, null, 2));
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

checkIndexes();
