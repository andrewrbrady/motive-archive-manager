import { MongoClient, ObjectId } from "mongodb";
import fetch from "node-fetch";
import { config } from "dotenv";

// Load both .env and .env.local
config({ path: ".env" });
config({ path: ".env.local" });

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB || "motive_archive";
const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;

async function main() {
  if (!MONGODB_URI) {
    console.error("Error: MONGODB_URI not found in .env or .env.local");
    process.exit(1);
  }

  if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_API_TOKEN) {
    console.error(
      "Error: Cloudflare credentials not found in .env or .env.local"
    );
    process.exit(1);
  }

  console.log("Starting migration...");
  const client = await MongoClient.connect(MONGODB_URI);
  const db = client.db(DB_NAME);

  try {
    // Clean up: Drop existing images collection if it exists
    try {
      await db.collection("images").drop();
      console.log("Dropped existing images collection");
    } catch (error) {
      // Collection might not exist, that's okay
      console.log("No existing images collection to drop");
    }

    // Create indexes for the images collection
    await db.collection("images").createIndex(
      { cloudflareId: 1 },
      {
        unique: true,
        partialFilterExpression: { cloudflareId: { $type: "string" } }, // Only index non-null values
      }
    );
    await db.collection("images").createIndex({ carId: 1 });

    const cars = await db
      .collection("cars")
      .find({ images: { $exists: true, $ne: [] } })
      .toArray();

    console.log(`Found ${cars.length} cars with images`);

    for (const car of cars) {
      console.log(`\nProcessing car ${car._id}...`);
      const imageIds = [];

      for (const image of car.images || []) {
        if (!image || !image.id) {
          console.log("  Skipping invalid image entry");
          continue;
        }

        console.log(`  Processing image ${image.id}...`);

        try {
          // Check if image already exists in images collection
          const existingImage = await db
            .collection("images")
            .findOne({ cloudflareId: image.id });

          if (existingImage) {
            console.log(
              "  Image already exists in images collection, skipping..."
            );
            imageIds.push(existingImage._id);
            continue;
          }

          // Fetch metadata from Cloudflare if needed
          let metadata = image.metadata;
          if (!metadata || Object.keys(metadata).length === 0) {
            console.log("  Fetching metadata from Cloudflare...");
            const response = await fetch(
              `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/images/v1/${image.id}`,
              {
                headers: {
                  Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
                },
              }
            );

            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            metadata = data.result.meta || {};
          }

          // Create new image document
          const imageDoc = {
            _id: new ObjectId(),
            cloudflareId: image.id,
            carId: car._id,
            url: image.url,
            filename: image.filename || `image-${image.id}`,
            metadata,
            createdAt: image.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          // Insert into images collection
          await db.collection("images").insertOne(imageDoc);
          console.log("  Created new image document");
          imageIds.push(imageDoc._id);
        } catch (error) {
          console.error(`  Error processing image ${image.id}:`, error.message);
          // Don't add the ID if there was an error creating the document
          continue;
        }
      }

      // Update car document to store only image IDs
      if (imageIds.length > 0) {
        await db.collection("cars").updateOne(
          { _id: car._id },
          {
            $set: {
              imageIds,
              updatedAt: new Date().toISOString(),
            },
            $unset: { images: "" }, // Remove the old images array
          }
        );
        console.log(`  Updated car with ${imageIds.length} image references`);
      } else {
        console.log("  No valid images found for this car");
      }
    }

    console.log("\nMigration completed!");

    // Print some stats
    const totalImages = await db.collection("images").countDocuments();
    const totalCarsWithImages = await db
      .collection("cars")
      .countDocuments({ imageIds: { $exists: true, $ne: [] } });

    console.log("\nFinal Statistics:");
    console.log(`Total images in new collection: ${totalImages}`);
    console.log(`Total cars with image references: ${totalCarsWithImages}`);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

main().catch(console.error);
