import { MongoClient } from "mongodb";
import fetch from "node-fetch";
import * as dotenv from "dotenv";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB || "motive_archive";
const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;

if (!MONGODB_URI) {
  throw new Error("Please add your Mongo URI to .env");
}

if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_API_TOKEN) {
  throw new Error("Please add your Cloudflare credentials to .env");
}

/**
 * @typedef {Object} CloudflareImageMetadata
 * @property {string} [angle]
 * @property {string} [view]
 * @property {string} [movement]
 * @property {string} [tod]
 * @property {string} [side]
 * @property {string} [description]
 * @property {any} [aiAnalysis]
 */

/**
 * @typedef {Object} CarImage
 * @property {string} id
 * @property {string} url
 * @property {string} filename
 * @property {CloudflareImageMetadata} metadata
 * @property {string} createdAt
 * @property {string} updatedAt
 */

/**
 * @typedef {Object} Car
 * @property {string} _id
 * @property {CarImage[]} images
 */

/**
 * @typedef {Object} CloudflareResponse
 * @property {Object} result
 * @property {CloudflareImageMetadata} result.meta
 * @property {boolean} success
 */

/**
 * @param {string} imageId
 * @returns {Promise<CloudflareImageMetadata>}
 */
async function getCloudflareMetadata(imageId) {
  try {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/images/v1/${imageId}`,
      {
        headers: {
          Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(
        `Failed to fetch metadata for image ${imageId}: ${response.statusText}`
      );
    }

    const data = await response.json();
    return data.result.meta || {};
  } catch (error) {
    console.error(`Error fetching metadata for image ${imageId}:`, error);
    return {};
  }
}

/**
 * @param {any} db
 * @param {Car} car
 */
async function migrateCar(db, car) {
  console.log(`\nProcessing car ${car._id}...`);
  const updatedImages = [];

  for (const image of car.images || []) {
    console.log(`  Processing image ${image.id}...`);

    // Skip if metadata already exists
    if (image.metadata && Object.keys(image.metadata).length > 0) {
      console.log("  Metadata already exists, skipping...");
      updatedImages.push(image);
      continue;
    }

    // Fetch metadata from Cloudflare
    const metadata = await getCloudflareMetadata(image.id);

    // Update image with metadata
    updatedImages.push({
      ...image,
      metadata,
      updatedAt: new Date().toISOString(),
    });
  }

  // Update car in MongoDB
  if (updatedImages.length > 0) {
    await db.collection("cars").updateOne(
      { _id: car._id },
      {
        $set: {
          images: updatedImages,
          updatedAt: new Date().toISOString(),
        },
      }
    );
    console.log(`  Updated ${updatedImages.length} images for car ${car._id}`);
  }
}

async function main() {
  console.log("Starting image metadata migration...");
  const client = await MongoClient.connect(MONGODB_URI);
  const db = client.db(DB_NAME);

  try {
    // Get all cars with images
    const cars = await db
      .collection("cars")
      .find({ images: { $exists: true, $ne: [] } })
      .toArray();

    console.log(`Found ${cars.length} cars with images`);

    // Process each car
    for (const car of cars) {
      await migrateCar(db, car);
    }

    console.log("\nMigration completed successfully!");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

main().catch(console.error);
