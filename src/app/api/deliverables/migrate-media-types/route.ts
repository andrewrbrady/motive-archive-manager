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

    // Get all media types to create mapping
    const mediaTypes = await db.collection("media_types").find({}).toArray();

    // Create mapping from legacy type names to media type IDs
    const typeMapping: Record<string, ObjectId> = {};

    for (const mediaType of mediaTypes) {
      const mediaTypeName = mediaType.name.toLowerCase();

      // Use dynamic key assignment to avoid linter issues
      if (mediaTypeName === "video") {
        typeMapping["Video"] = mediaType._id;
        typeMapping["video"] = mediaType._id;
      } else if (mediaTypeName === "photo gallery") {
        typeMapping["Photo Gallery"] = mediaType._id;
        typeMapping["photo gallery"] = mediaType._id;
      } else if (mediaTypeName === "mixed gallery") {
        typeMapping["Mixed Gallery"] = mediaType._id;
        typeMapping["mixed gallery"] = mediaType._id;
      } else if (mediaTypeName === "video gallery") {
        typeMapping["Video Gallery"] = mediaType._id;
        typeMapping["video gallery"] = mediaType._id;
      }
    }

    console.log("Type mapping:", typeMapping);

    // Find all deliverables that have a type but no mediaTypeId
    const deliverablesNeedingMigration = await db
      .collection("deliverables")
      .find({
        $and: [
          { type: { $exists: true, $nin: [null, ""] } },
          {
            $or: [{ mediaTypeId: { $exists: false } }, { mediaTypeId: null }],
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
      const legacyType = deliverable.type;
      const mappedMediaTypeId = typeMapping[legacyType];

      if (mappedMediaTypeId) {
        // Update the deliverable with the new mediaTypeId
        const result = await db.collection("deliverables").updateOne(
          { _id: deliverable._id },
          {
            $set: {
              mediaTypeId: mappedMediaTypeId,
              updatedAt: new Date(),
            },
          }
        );

        if (result.modifiedCount > 0) {
          migratedCount++;
          results.push({
            deliverableId: deliverable._id.toString(),
            title: deliverable.title,
            legacyType,
            newMediaTypeId: mappedMediaTypeId.toString(),
            status: "migrated",
          });
        }
      } else {
        skippedCount++;
        results.push({
          deliverableId: deliverable._id.toString(),
          title: deliverable.title,
          legacyType,
          status: "skipped - no mapping found",
        });
      }
    }

    return NextResponse.json({
      message: "Migration completed",
      totalProcessed: deliverablesNeedingMigration.length,
      migrated: migratedCount,
      skipped: skippedCount,
      results,
    });
  } catch (error) {
    console.error("Error during migration:", error);
    return NextResponse.json(
      { error: "Failed to migrate deliverable types" },
      { status: 500 }
    );
  }
}
