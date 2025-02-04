import { MongoClient } from "mongodb";
import * as dotenv from "dotenv";
dotenv.config();

const COLLECTION_NAME = "research_vectors";
const INDEX_NAME = "vector_search";

async function recreateIndex() {
  if (!process.env.MONGODB_URI) {
    console.error("MONGODB_URI environment variable is not set");
    process.exit(1);
  }

  const client = new MongoClient(process.env.MONGODB_URI);

  try {
    await client.connect();
    console.log("Connected to MongoDB");

    const db = client.db();

    // Drop existing search index
    try {
      await db.command({
        dropSearchIndex: COLLECTION_NAME,
        name: INDEX_NAME,
      });
      console.log("Dropped existing search index");
    } catch (e) {
      console.log("No existing search index to drop");
    }

    // Create the vector search index
    await db.command({
      createSearchIndexes: COLLECTION_NAME,
      indexes: [
        {
          name: INDEX_NAME,
          definition: {
            mappings: {
              dynamic: false,
              fields: {
                embedding: {
                  dimensions: 1536,
                  similarity: "cosine",
                  type: "knnVector",
                },
                "metadata.carId": {
                  type: "string",
                },
              },
            },
          },
        },
      ],
    });
    console.log("Created new vector search index");

    // Verify the index was created
    const indexes = await db
      .collection(COLLECTION_NAME)
      .listSearchIndexes()
      .toArray();
    console.log("\nCurrent search indexes:");
    console.log(JSON.stringify(indexes, null, 2));
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

recreateIndex();
