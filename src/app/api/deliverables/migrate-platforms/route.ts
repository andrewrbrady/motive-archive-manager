import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { verifyAuthMiddleware } from "@/lib/firebase-auth-middleware";
import { ObjectId } from "mongodb";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    // Verify authentication with admin role requirement
    const authResult = await verifyAuthMiddleware(request, ["admin"]);
    if (authResult) {
      return authResult;
    }

    const db = await getDatabase();
    if (!db) {
      console.error("Failed to get database instance");
      return NextResponse.json(
        { error: "Failed to connect to database" },
        { status: 500 }
      );
    }

    // Get all platforms to create mapping
    const platforms = await db.collection("platforms").find({}).toArray();

    // Create mapping from platform names to platform IDs
    const platformNameToIdMap: Record<string, ObjectId> = {};
    const platformIdToIdMap: Record<string, ObjectId> = {};

    for (const platform of platforms) {
      // Map by name for legacy platform field
      platformNameToIdMap[platform.name] = platform._id;
      // Map by ID for platforms array
      platformIdToIdMap[platform._id.toString()] = platform._id;
    }

    console.log("Platform name mapping:", Object.keys(platformNameToIdMap));
    console.log("Platform ID mapping:", Object.keys(platformIdToIdMap));

    // Find all deliverables that need migration
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
      `Found ${deliverablesNeedingMigration.length} deliverables to migrate`
    );

    let migratedCount = 0;
    let skippedCount = 0;
    const results = [];

    // Migrate each deliverable
    for (const deliverable of deliverablesNeedingMigration) {
      let targetPlatformId: ObjectId | null = null;
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
        results.push({
          deliverableId: deliverable._id.toString(),
          title: deliverable.title,
          source: migrationSource || "no valid platform found",
          status: "skipped - no mapping found",
        });
      }
    }

    return NextResponse.json({
      message: "Platform migration completed",
      totalProcessed: deliverablesNeedingMigration.length,
      migrated: migratedCount,
      skipped: skippedCount,
      results,
    });
  } catch (error) {
    console.error("Error during platform migration:", error);
    return NextResponse.json(
      { error: "Failed to migrate deliverable platforms" },
      { status: 500 }
    );
  }
}
