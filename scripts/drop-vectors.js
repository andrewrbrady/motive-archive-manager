import { MongoClient } from "mongodb";
import * as dotenv from "dotenv";
dotenv.config();

async function dropVectors() {
  if (!process.env.MONGODB_URI) {
    console.error("MONGODB_URI environment variable is not set");
    process.exit(1);
  }

  const client = new MongoClient(process.env.MONGODB_URI);

  try {
    await client.connect();
    console.log("Connected to MongoDB");

    const db = client.db();

    try {
      await db.collection("research_vectors").drop();
      console.log("Successfully dropped research_vectors collection");
    } catch (error) {
      if (error.code === 26) {
        console.log("Collection does not exist, nothing to drop");
      } else {
        console.error("Error dropping collection:", error);
      }
    }
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

dropVectors();
