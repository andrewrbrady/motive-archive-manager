import { MongoClient } from "mongodb";
import * as dotenv from "dotenv";

// Load environment variables from .env.local
dotenv.config({ path: ".env.local" });

async function checkCollections() {
  if (!process.env.MONGODB_URI) {
    console.error("Error: MONGODB_URI is not defined in .env.local");
    process.exit(1);
  }

  const client = new MongoClient(process.env.MONGODB_URI);

  try {
    console.log("Connecting to MongoDB...");
    await client.connect();
    console.log("Successfully connected to MongoDB!");

    const dbName = process.env.MONGODB_DB || "motive_archive";
    const db = client.db(dbName);

    // List all collections
    const collections = await db.listCollections().toArray();
    console.log("\nExisting collections:");
    collections.forEach((collection) => {
      console.log(`- ${collection.name}`);
    });

    // Check if advanced_mdx_files collection exists
    const hasAdvancedMDX = collections.some(
      (c) => c.name === "advanced_mdx_files"
    );

    if (!hasAdvancedMDX) {
      console.log("\nCreating advanced_mdx_files collection...");
      await db.createCollection("advanced_mdx_files");
      // Create index on filename field
      await db
        .collection("advanced_mdx_files")
        .createIndex({ filename: 1 }, { unique: true, background: true });
      console.log(
        "Successfully created advanced_mdx_files collection with index!"
      );
    } else {
      console.log("\nadvanced_mdx_files collection already exists");
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await client.close();
  }
}

checkCollections();
