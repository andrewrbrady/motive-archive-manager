import { MongoClient } from "mongodb";
import * as dotenv from "dotenv";
dotenv.config();

async function debugVectors() {
  if (!process.env.MONGODB_URI) {
    console.error("MONGODB_URI environment variable is not set");
    process.exit(1);
  }

  const client = new MongoClient(process.env.MONGODB_URI);

  try {
    await client.connect();
    console.log("Connected to MongoDB");

    const db = client.db();
    const collection = "research_vectors";

    // Get a sample document
    const sampleDoc = await db.collection(collection).findOne({});
    console.log("Sample document structure:");
    console.log(JSON.stringify(sampleDoc, null, 2));

    // Check the search index definition
    const indexes = await db
      .collection(collection)
      .listSearchIndexes()
      .toArray();
    console.log("\nSearch indexes:");
    console.log(JSON.stringify(indexes, null, 2));

    // Check documents for a specific car
    const carId = "6784b0e37a85711f907ba1ca";
    const carDocs = await db
      .collection(collection)
      .find({ "metadata.carId": carId })
      .limit(1)
      .toArray();
    console.log(`\nSample document for car ${carId}:`);
    console.log(JSON.stringify(carDocs[0], null, 2));
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

debugVectors();
