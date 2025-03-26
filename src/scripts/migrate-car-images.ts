/**
 * Migration script to convert car image arrays to organized map structure
 *
 * This script takes the existing array of image IDs and organizes them
 * into a Map with categories: exterior, interior, engine, damage, documents, and other
 */

import { MongoClient, ObjectId } from "mongodb";
import path from "path";
import dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB || "motive_archive";

if (!MONGODB_URI) {
  throw new Error("Please add your Mongo URI to .env.local");
}

const BATCH_SIZE = 50;

// Define image categories and keywords to help classify
const IMAGE_CATEGORIES = {
  exterior: [
    "exterior",
    "front",
    "rear",
    "side",
    "wheel",
    "tire",
    "body",
    "paint",
    "outside",
  ],
  interior: [
    "interior",
    "seat",
    "dashboard",
    "steering",
    "console",
    "cabin",
    "inside",
  ],
  engine: ["engine", "motor", "bay", "mechanical", "under hood", "underhood"],
  damage: [
    "damage",
    "dent",
    "scratch",
    "accident",
    "repair",
    "issue",
    "problem",
  ],
  documents: [
    "document",
    "title",
    "registration",
    "paper",
    "certificate",
    "receipt",
  ],
  other: [],
};

// Function to categorize an image based on its filename or metadata
function categorizeImage(image: any): string {
  // Default category
  let category = "other";

  // If no image or no filename, return default
  if (!image || !image.filename) return category;

  const filename = image.filename.toLowerCase();

  // Check each category for matching keywords
  for (const [cat, keywords] of Object.entries(IMAGE_CATEGORIES)) {
    if (keywords.some((keyword) => filename.includes(keyword))) {
      return cat;
    }
  }

  // If no matches found, return default
  return category;
}

async function migrateCarImages() {
  let client;
  try {
    // Connect to MongoDB
    client = new MongoClient(MONGODB_URI as string);
    await client.connect();
    const db = client.db(DB_NAME);

    // Get collections
    const carsCollection = db.collection("cars");
    const imagesCollection = db.collection("images");

    // Find total count for progress reporting
    const totalCars = await carsCollection.countDocuments();
    console.log(`Found ${totalCars} cars to process`);

    let processedCount = 0;
    let skippedCount = 0;
    let updatedCount = 0;

    // Process cars in batches to avoid memory issues
    let hasMore = true;
    let lastId: ObjectId | null = null;

    while (hasMore) {
      // Build query for the next batch
      const query: any = {};
      if (lastId) {
        query._id = { $gt: lastId };
      }

      // Fetch a batch of cars
      const cars = await carsCollection
        .find(query)
        .sort({ _id: 1 })
        .limit(BATCH_SIZE)
        .toArray();

      // If no cars returned, we're done
      if (cars.length === 0) {
        hasMore = false;
        continue;
      }

      // Update the lastId for the next batch
      lastId = cars[cars.length - 1]._id;

      // Process each car in the batch
      for (const car of cars) {
        processedCount++;

        // Skip cars that already have the new structure
        if (
          car.images &&
          typeof car.images === "object" &&
          car.images instanceof Map
        ) {
          skippedCount++;
          continue;
        }

        // Initialize the new images map structure with proper typing
        const newImagesMap: Map<string, string[]> = new Map([
          ["exterior", []],
          ["interior", []],
          ["engine", []],
          ["damage", []],
          ["documents", []],
          ["other", []],
        ]);

        // Get the existing imageIds
        const imageIds =
          car.imageIds ||
          (car.images && Array.isArray(car.images) ? car.images : []);

        if (imageIds && imageIds.length > 0) {
          // Fetch the actual image documents
          const imageObjectIds = imageIds.map((id: string) =>
            typeof id === "string" ? new ObjectId(id) : id
          );

          const images = await imagesCollection
            .find({ _id: { $in: imageObjectIds } })
            .toArray();

          // Categorize images and add to the appropriate category
          for (const image of images) {
            const category = categorizeImage(image);
            const imageIdStr = image._id.toString();
            const categoryArray = newImagesMap.get(category) || [];
            categoryArray.push(imageIdStr);
            newImagesMap.set(category, categoryArray);
          }

          // Update the car with the new images structure
          await carsCollection.updateOne(
            { _id: car._id },
            {
              $set: {
                images: Object.fromEntries(newImagesMap),
                // Keep the flat array for backward compatibility
                imageIds: imageIds.map((id: any) => id.toString()),
              },
            }
          );

          updatedCount++;
        }

        // Log progress
        if (processedCount % 100 === 0 || processedCount === totalCars) {
          console.log(
            `Processed ${processedCount}/${totalCars} cars (${Math.round(
              (processedCount / totalCars) * 100
            )}%)`
          );
        }
      }
    }

    console.log("\nMigration completed!");
    console.log(`Processed: ${processedCount} cars`);
    console.log(`Updated: ${updatedCount} cars`);
    console.log(`Skipped (already migrated): ${skippedCount} cars`);
  } catch (error) {
    console.error("Error in migration:", error);
  } finally {
    if (client) {
      await client.close();
      console.log("Database connection closed");
    }
  }
}

// Run the migration
migrateCarImages().catch(console.error);
