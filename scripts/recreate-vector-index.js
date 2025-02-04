import { MongoClient } from "mongodb";
import * as dotenv from "dotenv";
dotenv.config();

async function recreateVectorIndex() {
  if (!process.env.MONGODB_URI) {
    console.error("MONGODB_URI environment variable is not set");
    process.exit(1);
  }

  const client = new MongoClient(process.env.MONGODB_URI);

  try {
    await client.connect();
    const db = client.db();

    // Drop all search indexes
    try {
      const listCommand = {
        listSearchIndexes: "research_vectors",
      };
      const indexes = await db.command(listCommand);
      console.log("Current search indexes:", indexes);

      for (const index of indexes.indexes) {
        try {
          await db.collection("research_vectors").dropSearchIndex(index.name);
          console.log(`Dropped search index: ${index.name}`);
        } catch (dropError) {
          console.warn(
            `Error dropping index ${index.name}:`,
            dropError.message
          );
        }
      }
    } catch (error) {
      console.log("Error listing indexes:", error.message);
    }

    // Create the new vector search index
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

    const result = await db.command(command);
    console.log("Created new vector search index:", result);

    // Create regular indexes
    await db.collection("research_vectors").createIndexes([
      {
        key: { "metadata.carId": 1 },
        name: "metadata_carId",
      },
      {
        key: { "metadata.fileId": 1 },
        name: "metadata_fileId",
      },
    ]);
    console.log("Created regular indexes");
  } catch (error) {
    console.error("Error recreating indexes:", error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

recreateVectorIndex();
