import { MongoClient } from "mongodb";
import * as dotenv from "dotenv";
dotenv.config();

async function setupVectorSearch() {
  if (!process.env.MONGODB_URI) {
    console.error("MONGODB_URI environment variable is not set");
    process.exit(1);
  }

  const client = new MongoClient(process.env.MONGODB_URI);

  try {
    await client.connect();
    const db = client.db();

    // Drop existing index if it exists
    try {
      await db.collection("research_vectors").dropIndex("vector_search");
    } catch (error) {
      console.log("No existing index to drop");
    }

    // Create the vector search index
    const command = {
      createSearchIndexes: "research_vectors",
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
                text: {
                  type: "string",
                },
                metadata: {
                  type: "document",
                  fields: {
                    carId: { type: "string" },
                    fileId: { type: "string" },
                    fileName: { type: "string" },
                    chunk: { type: "number" },
                  },
                },
              },
            },
          },
        },
      ],
    };

    const result = await db.command(command);
    console.log("Vector search index created:", result);

    // Create regular indexes for metadata fields
    await db
      .collection("research_vectors")
      .createIndex({ "metadata.carId": 1 }, { name: "metadata_carId" });

    await db
      .collection("research_vectors")
      .createIndex({ "metadata.fileId": 1 }, { name: "metadata_fileId" });

    console.log("Regular indexes created");
  } catch (error) {
    console.error("Error creating indexes:", error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

setupVectorSearch();
