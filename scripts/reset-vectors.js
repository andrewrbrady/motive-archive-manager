import { MongoClient } from "mongodb";
import * as dotenv from "dotenv";
dotenv.config();

async function resetVectors() {
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

    // Drop the collection if it exists
    try {
      await db.collection(collection).drop();
      console.log("Dropped research_vectors collection");
    } catch (error) {
      if (error.code === 26) {
        console.log("Collection does not exist, nothing to drop");
      } else {
        console.error("Error dropping collection:", error);
      }
    }

    // Create the collection
    await db.createCollection(collection);
    console.log("Created research_vectors collection");

    // Drop any existing search indexes
    try {
      const indexes = await db
        .collection(collection)
        .listSearchIndexes()
        .toArray();
      for (const index of indexes) {
        await db.command({
          dropSearchIndex: collection,
          name: index.name,
        });
        console.log(`Dropped search index: ${index.name}`);
      }
    } catch (error) {
      // Ignore errors when no indexes exist
      console.log("No existing search indexes to drop");
    }

    // Wait a moment to ensure indexes are fully dropped
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Create the vector search index
    try {
      const command = {
        createSearchIndexes: collection,
        indexes: [
          {
            name: "vector_search",
            definition: {
              mappings: {
                dynamic: false,
                fields: {
                  embedding: {
                    dimensions: 1536,
                    similarity: "cosine",
                    type: "knnVector",
                  },
                  pageContent: {
                    type: "string",
                  },
                  "metadata.carId": {
                    type: "token",
                  },
                  "metadata.fileId": {
                    type: "token",
                  },
                  "metadata.fileName": {
                    type: "string",
                  },
                  "metadata.chunk": {
                    type: "number",
                  },
                },
              },
            },
          },
        ],
      };

      await db.command(command);
      console.log("Created vector search index");
    } catch (error) {
      console.error("Error creating vector search index:", error);
      throw error;
    }
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

resetVectors();
