import { MongoClient } from "mongodb";
import { Collections } from "@/types/mongodb";

export async function createIndexes(client: MongoClient) {
  const db = client.db();
  const collections: Collections = {
    cars: db.collection("cars"),
    images: db.collection("images"),
    vectors: db.collection("vectors"),
  };

  // Create indexes for vectors collection
  try {
    await collections.vectors.createIndex({ vector: 1 });
  } catch (indexError) {
    // Ignore vector index errors as they might require special handling
    if (indexError instanceof Error) {
      console.warn(
        "Warning: Failed to create vector index:",
        indexError.message
      );
    } else {
      console.warn("Warning: Failed to create vector index:", indexError);
    }
  }

  // Create indexes for images collection
  try {
    await collections.images.createIndex({ carId: 1 });
  } catch (indexError) {
    if (indexError instanceof Error) {
      console.error("Error: Failed to create image index:", indexError.message);
    } else {
      console.error("Error: Failed to create image index:", indexError);
    }
  }

  console.log("Successfully created/verified indexes for collections");
}
