#!/usr/bin/env node

/**
 * Platform Migration Script (ES Module)
 *
 * Converts deliverables from the old platform/platforms system to the new single platform_id approach.
 * This script will:
 * 1. Use the first platform from platforms array if available
 * 2. Fall back to the legacy platform field if no platforms array
 * 3. Map platform names/IDs to platform ObjectIds
 */

import { MongoClient, ObjectId } from "mongodb";
import dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: ".env.local" });

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB;

if (!MONGODB_URI || !DB_NAME) {
  console.error(
    "❌ Missing required environment variables: MONGODB_URI, MONGODB_DB"
  );
  process.exit(1);
}

async function main() {
  const client = new MongoClient(MONGODB_URI);

  try {
    console.log("🔗 Connecting to MongoDB...");
    await client.connect();

    const db = client.db(DB_NAME);
    console.log(`✅ Connected to database: ${DB_NAME}`);

    // Get all platforms to create mapping
    console.log("📋 Fetching platforms...");
    const platforms = await db.collection("platforms").find({}).toArray();
    console.log(`✅ Found ${platforms.length} platforms`);

    // Create mapping from platform names to platform IDs
    const platformNameToIdMap = {};
    const platformIdToIdMap = {};

    for (const platform of platforms) {
      // Map by name for legacy platform field
      platformNameToIdMap[platform.name] = platform._id;
      // Map by ID for platforms array
      platformIdToIdMap[platform._id.toString()] = platform._id;
    }

    console.log("🗺️  Platform mappings created:");
    console.log("   Names:", Object.keys(platformNameToIdMap));
    console.log("   IDs:", Object.keys(platformIdToIdMap));

    // Find all deliverables that need migration
    console.log("\n🔍 Finding deliverables that need migration...");
    const deliverablesNeedingMigration = await db
      .collection("deliverables")
      .find({
        $and: [
          { platform_id: { $exists: false } }, // No platform_id set yet
          {
            $or: [
              { platform: { $exists: true, $nin: [null, ""] } }, // Has legacy platform field
              { platforms: { $exists: true, $nin: [null, []] } }, // Has platforms array
            ],
          },
        ],
      })
      .toArray();

    console.log(
      `✅ Found ${deliverablesNeedingMigration.length} deliverables to migrate`
    );

    if (deliverablesNeedingMigration.length === 0) {
      console.log("🎉 No deliverables need migration. All done!");
      return;
    }

    let migratedCount = 0;
    let skippedCount = 0;
    const results = [];

    console.log("\n🔄 Starting migration...");

    // Migrate each deliverable
    for (const deliverable of deliverablesNeedingMigration) {
      let targetPlatformId = null;
      let migrationSource = "";

      // Priority 1: Use first platform from platforms array if available
      if (deliverable.platforms && deliverable.platforms.length > 0) {
        const firstPlatformId = deliverable.platforms[0];
        targetPlatformId = platformIdToIdMap[firstPlatformId] || null;
        migrationSource = `platforms array (first: ${firstPlatformId})`;
      }
      // Priority 2: Use legacy platform field
      else if (deliverable.platform) {
        targetPlatformId = platformNameToIdMap[deliverable.platform] || null;
        migrationSource = `platform field (${deliverable.platform})`;
      }

      if (targetPlatformId) {
        // Update the deliverable with the new platform_id
        const result = await db.collection("deliverables").updateOne(
          { _id: deliverable._id },
          {
            $set: {
              platform_id: targetPlatformId,
              updated_at: new Date(),
            },
          }
        );

        if (result.modifiedCount > 0) {
          migratedCount++;
          console.log(
            `✅ Migrated: "${deliverable.title}" (${migrationSource} → ${targetPlatformId})`
          );
          results.push({
            deliverableId: deliverable._id.toString(),
            title: deliverable.title,
            source: migrationSource,
            newPlatformId: targetPlatformId.toString(),
            status: "migrated",
          });
        }
      } else {
        skippedCount++;
        console.log(
          `⚠️  Skipped: "${deliverable.title}" (${migrationSource || "no valid platform found"})`
        );
        results.push({
          deliverableId: deliverable._id.toString(),
          title: deliverable.title,
          source: migrationSource || "no valid platform found",
          status: "skipped - no mapping found",
        });
      }
    }

    console.log("\n📊 Migration Summary:");
    console.log(`   Total processed: ${deliverablesNeedingMigration.length}`);
    console.log(`   ✅ Successfully migrated: ${migratedCount}`);
    console.log(`   ⚠️  Skipped: ${skippedCount}`);

    if (skippedCount > 0) {
      console.log("\n⚠️  Skipped deliverables:");
      results
        .filter((r) => r.status.includes("skipped"))
        .forEach((result) => {
          console.log(`   - "${result.title}" (${result.source})`);
        });
    }

    console.log("\n🎉 Platform migration completed successfully!");
  } catch (error) {
    console.error("❌ Error during platform migration:", error);
    process.exit(1);
  } finally {
    await client.close();
    console.log("🔗 Database connection closed");
  }
}

// Run the migration
main().catch(console.error);
