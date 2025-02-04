import { MongoClient } from "mongodb";
import * as dotenv from "dotenv";
dotenv.config();

async function createVectorIndex() {
  const client = new MongoClient(process.env.MONGODB_URI);

  try {
    await client.connect();
    const db = client.db();

    // Create vector search index
    await db.collection("research_vectors").createIndex(
      {
        embedding: "vector",
        text: "text",
        "metadata.carId": 1,
      },
      {
        name: "default",
        vectorSearchOptions: {
          numDimensions: 1536,
          similarity: "cosine",
        },
      }
    );

    console.log("Successfully created vector search index");
  } catch (error) {
    console.error("Error creating vector search index:", error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

createVectorIndex();
