#!/usr/bin/env node
/**
 * Adds/updates MongoDB schema validation for the cars collection.
 * Enforces ObjectId arrays for imageIds, ObjectId for primaryImageId, and enum for status.
 *
 * Usage:
 *   MONGODB_URI="mongodb+srv://..." MONGODB_DB="motive_archive" node scripts/migrations/add-cars-validator.cjs
 */
const { MongoClient } = require("mongodb");

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB || process.env.DB_NAME || "motive_archive";

if (!MONGODB_URI) {
  console.error("Missing MONGODB_URI env var");
  process.exit(1);
}

async function run() {
  const client = new MongoClient(MONGODB_URI, { connectTimeoutMS: 10000, socketTimeoutMS: 45000 });
  await client.connect();
  const db = client.db(DB_NAME);

  const validator = {
    $jsonSchema: {
      bsonType: "object",
      required: ["make", "model", "price", "status"],
      properties: {
        make: { bsonType: "string" },
        model: { bsonType: "string" },
        status: { enum: ["available", "sold", "pending"] },
        price: {
          bsonType: "object",
          required: ["listPrice", "priceHistory"],
          properties: {
            listPrice: { bsonType: ["double", "int", "long", "null"] },
            soldPrice: { bsonType: ["double", "int", "long", "null"] },
            priceHistory: { bsonType: "array" },
          },
        },
        imageIds: {
          bsonType: ["array"],
          items: { bsonType: "objectId" },
        },
        primaryImageId: { bsonType: ["objectId", "null"] },
      },
      additionalProperties: true,
    },
  };

  try {
    // Use collMod to apply validator (works if collection exists)
    await db.command({
      collMod: "cars",
      validator,
      validationLevel: "moderate",
      validationAction: "warn",
    });
    console.log("Applied validator to existing cars collection (validationAction=warn)");
  } catch (e) {
    // If collMod fails (e.g., first time), attempt create with validator
    try {
      await db.createCollection("cars", { validator, validationLevel: "moderate", validationAction: "warn" });
      console.log("Created cars collection with validator (validationAction=warn)");
    } catch (e2) {
      console.error("Failed to set validator on cars collection:", e2.message);
      process.exit(2);
    }
  } finally {
    await client.close();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

