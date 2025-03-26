// This script removes the 'images' property from car documents
// that have both 'images' and 'imageIds' fields.
// We want to standardize on using only 'imageIds' which are arrays of ObjectIds
// pointing to documents in the 'images' collection.

import { MongoClient, ObjectId } from "mongodb";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import fs from "fs";

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Try to load .env.local from parent directory
const envPath = resolve(__dirname, "../.env.local");
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  // Fallback to .env
  dotenv.config({ path: resolve(__dirname, "../.env") });
}

// MongoDB connection details
const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "motive_archive";

async function sanitizeCarImages() {
  if (!uri) {
    console.error("MONGODB_URI environment variable is not defined");
    process.exit(1);
  }

  console.log("Connecting to MongoDB...");
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log("Connected to MongoDB");

    const db = client.db(dbName);
    const carsCollection = db.collection("cars");

    // Find all car documents that have both 'images' and 'imageIds' fields
    const query = {
      images: { $exists: true },
      imageIds: { $exists: true },
    };

    // Count the number of documents that match the query
    const count = await carsCollection.countDocuments(query);
    console.log(
      `Found ${count} car documents with both 'images' and 'imageIds' fields`
    );

    if (count === 0) {
      console.log("No documents to sanitize.");
      return;
    }

    // Get a sample document to inspect
    const sampleDoc = await carsCollection.findOne(query);
    console.log("Sample document before sanitization:");
    console.log(
      JSON.stringify(
        {
          _id: sampleDoc._id,
          make: sampleDoc.make,
          model: sampleDoc.model,
          imageIds: sampleDoc.imageIds,
          hasImages: !!sampleDoc.images,
        },
        null,
        2
      )
    );

    // Update the documents by removing the 'images' field
    console.log("Starting sanitization...");
    const result = await carsCollection.updateMany(query, {
      $unset: { images: "" },
    });

    console.log(`Updated ${result.modifiedCount} documents`);

    // Verify a sample document after update
    if (result.modifiedCount > 0) {
      const updatedSampleDoc = await carsCollection.findOne({
        _id: sampleDoc._id,
      });
      console.log("Sample document after sanitization:");
      console.log(
        JSON.stringify(
          {
            _id: updatedSampleDoc._id,
            make: updatedSampleDoc.make,
            model: updatedSampleDoc.model,
            imageIds: updatedSampleDoc.imageIds,
            hasImages: !!updatedSampleDoc.images,
          },
          null,
          2
        )
      );
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await client.close();
    console.log("Disconnected from MongoDB");
  }
}

// Run the script
sanitizeCarImages().catch(console.error);
