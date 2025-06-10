#!/usr/bin/env node

/**
 * Media Types Seeder Script
 *
 * This script populates the database with initial media types for the
 * Motive Archive Manager content management system.
 *
 * Usage: node scripts/seed-media-types.cjs
 */

const { MongoClient } = require("mongodb");
require("dotenv").config();

// MongoDB connection URI
const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB || "motive_archive";

if (!MONGODB_URI) {
  console.error("❌ MONGODB_URI environment variable is required");
  process.exit(1);
}

// Initial media types to seed
const INITIAL_MEDIA_TYPES = [
  {
    name: "Video",
    description: "Primary video content for social media platforms",
    sortOrder: 1,
    isActive: true,
  },
  {
    name: "Photo Gallery",
    description: "Collection of static images",
    sortOrder: 2,
    isActive: true,
  },
  {
    name: "Mixed Gallery",
    description: "Combination of photos and videos",
    sortOrder: 3,
    isActive: true,
  },
  {
    name: "Video Gallery",
    description: "Collection of video content",
    sortOrder: 4,
    isActive: true,
  },
];

async function seedMediaTypes() {
  let client;

  try {
    console.log("🔗 Connecting to MongoDB...");
    client = new MongoClient(MONGODB_URI);
    await client.connect();

    const db = client.db(DB_NAME);
    const collection = db.collection("media_types");

    console.log("📊 Checking existing media types...");
    const existingCount = await collection.countDocuments();

    if (existingCount > 0) {
      console.log(`ℹ️  Found ${existingCount} existing media types`);

      // Show existing media types
      const existing = await collection
        .find({})
        .sort({ sortOrder: 1 })
        .toArray();
      console.log("Existing media types:");
      existing.forEach((type, index) => {
        console.log(`  ${index + 1}. ${type.name} (Active: ${type.isActive})`);
      });

      // Ask if user wants to continue (simulate user confirmation for script)
      console.log(
        "\n⚠️  Media types already exist. This script will only add missing types."
      );
    }

    console.log("\n🌱 Seeding media types...");
    let addedCount = 0;
    let skippedCount = 0;

    for (const mediaType of INITIAL_MEDIA_TYPES) {
      try {
        // Check if media type already exists
        const existing = await collection.findOne({ name: mediaType.name });

        if (existing) {
          console.log(`⏭️  Skipped: "${mediaType.name}" (already exists)`);
          skippedCount++;
          continue;
        }

        // Add timestamps
        const mediaTypeWithTimestamps = {
          ...mediaType,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        // Insert the media type
        const result = await collection.insertOne(mediaTypeWithTimestamps);

        if (result.acknowledged) {
          console.log(`✅ Added: "${mediaType.name}"`);
          addedCount++;
        } else {
          console.log(`❌ Failed to add: "${mediaType.name}"`);
        }
      } catch (error) {
        if (error.code === 11000) {
          console.log(`⏭️  Skipped: "${mediaType.name}" (duplicate key)`);
          skippedCount++;
        } else {
          console.error(`❌ Error adding "${mediaType.name}":`, error.message);
        }
      }
    }

    // Create indexes for performance
    console.log("\n🔧 Creating indexes...");
    try {
      await collection.createIndex({ name: 1 }, { unique: true });
      await collection.createIndex({ isActive: 1 });
      await collection.createIndex({ sortOrder: 1 });
      await collection.createIndex({ isActive: 1, sortOrder: 1 });
      console.log("✅ Indexes created successfully");
    } catch (error) {
      console.log("⚠️  Index creation warning:", error.message);
    }

    // Final summary
    console.log("\n📈 Seeding Summary:");
    console.log(`  ✅ Added: ${addedCount} media types`);
    console.log(`  ⏭️  Skipped: ${skippedCount} media types`);

    // Show final state
    const finalTypes = await collection
      .find({ isActive: true })
      .sort({ sortOrder: 1 })
      .toArray();
    console.log("\n📋 Active Media Types:");
    finalTypes.forEach((type, index) => {
      console.log(`  ${index + 1}. ${type.name}`);
      if (type.description) {
        console.log(`     ${type.description}`);
      }
    });

    console.log("\n🎉 Media types seeding completed successfully!");
  } catch (error) {
    console.error("💥 Error during seeding:", error);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
      console.log("🔌 Database connection closed");
    }
  }
}

// Run the seeder
if (require.main === module) {
  seedMediaTypes()
    .then(() => {
      console.log("✨ Script completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("💥 Script failed:", error);
      process.exit(1);
    });
}

module.exports = { seedMediaTypes };
