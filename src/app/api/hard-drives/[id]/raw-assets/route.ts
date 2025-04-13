import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";

import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

interface HardDrive {
  _id: ObjectId;
  rawAssets: ObjectId[];
}

interface RawAsset {
  _id: ObjectId;
  hardDriveIds: ObjectId[];
}

// Handle adding raw assets to a drive
export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    const segments = url.pathname.split("/");
    const driveId = segments[segments.length - 2];

    const { rawAssetIds } = await request.json();

    if (!driveId || !rawAssetIds || !Array.isArray(rawAssetIds)) {
      return NextResponse.json(
        { error: "Drive ID and array of raw asset IDs are required" },
        { status: 400 }
      );
    }

    if (!ObjectId.isValid(driveId)) {
      return NextResponse.json(
        { error: "Invalid drive ID format" },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();

    // Convert IDs to ObjectIds
    const driveObjectId = new ObjectId(driveId);
    const rawAssetObjectIds = rawAssetIds.map((id) => {
      if (!ObjectId.isValid(id)) {
        throw new Error(`Invalid raw asset ID format: ${id}`);
      }
      return new ObjectId(id);
    });

    // Get the drive
    const drive = await db
      .collection<HardDrive>("hard_drives")
      .findOne({ _id: driveObjectId });

    if (!drive) {
      return NextResponse.json({ error: "Drive not found" }, { status: 404 });
    }

    // Update both the drive and raw assets
    const updatePromises = [
      // Add raw assets to drive
      db.collection<HardDrive>("hard_drives").updateOne(
        { _id: driveObjectId },
        {
          $addToSet: {
            rawAssets: { $each: rawAssetObjectIds },
          },
        }
      ),
      // Add drive to each raw asset's hardDriveIds
      db.collection<RawAsset>("raw_assets").updateMany(
        { _id: { $in: rawAssetObjectIds } },
        {
          $addToSet: {
            hardDriveIds: driveObjectId,
          },
        }
      ),
    ];

    await Promise.all(updatePromises);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to process request",
      },
      { status: 500 }
    );
  }
}

// Handle removing raw assets from a drive
export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const segments = url.pathname.split("/");
    const driveId = segments[segments.length - 2];

    const { rawAssetIds } = await request.json();

    if (!driveId || !rawAssetIds || !Array.isArray(rawAssetIds)) {
      return NextResponse.json(
        { error: "Drive ID and array of raw asset IDs are required" },
        { status: 400 }
      );
    }

    if (!ObjectId.isValid(driveId)) {
      return NextResponse.json(
        { error: "Invalid drive ID format" },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();

    // Convert IDs to ObjectIds
    const driveObjectId = new ObjectId(driveId);
    const rawAssetObjectIds = rawAssetIds.map((id) => {
      if (!ObjectId.isValid(id)) {
        throw new Error(`Invalid raw asset ID format: ${id}`);
      }
      return new ObjectId(id);
    });

    // Get the drive
    const drive = await db
      .collection<HardDrive>("hard_drives")
      .findOne({ _id: driveObjectId });

    if (!drive) {
      return NextResponse.json({ error: "Drive not found" }, { status: 404 });
    }

    // Update both the drive and raw assets
    const updatePromises = [
      // Remove raw assets from drive
      db.collection<HardDrive>("hard_drives").updateOne(
        { _id: driveObjectId },
        {
          $pullAll: {
            rawAssets: rawAssetObjectIds,
          },
        }
      ),
      // Remove drive from each raw asset's hardDriveIds
      db.collection<RawAsset>("raw_assets").updateMany(
        { _id: { $in: rawAssetObjectIds } },
        {
          $pull: {
            hardDriveIds: driveObjectId,
          },
        }
      ),
    ];

    await Promise.all(updatePromises);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to process request",
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Methods": "POST, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
