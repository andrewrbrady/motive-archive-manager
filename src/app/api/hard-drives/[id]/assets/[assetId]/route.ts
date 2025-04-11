import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";

import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const segments = url.pathname.split("/");
    const driveIdStr = segments[segments.length - 3];
    const assetIdStr = segments[segments.length - 1];

    // Validate the IDs
    if (!ObjectId.isValid(driveIdStr) || !ObjectId.isValid(assetIdStr)) {
      return NextResponse.json({ error: "Invalid ID format" }, { status: 400 });
    }

    const client = await clientPromise;
    if (!client) {
      return NextResponse.json(
        { error: "Failed to connect to database" },
        { status: 500 }
      );
    }

    const db = client.db("motive_archive");
    const driveId = new ObjectId(driveIdStr);
    const assetId = new ObjectId(assetIdStr);

    // Update the hard drive to remove the asset reference using standard update
    const hardDriveResult = await db.collection("hard_drives").updateOne(
      { _id: driveId },
      {
        $pull: {
          rawAssets: assetId,
        } as any,
      }
    );

    if (hardDriveResult.matchedCount === 0) {
      return NextResponse.json(
        { error: "Hard drive not found" },
        { status: 404 }
      );
    }

    // Update the raw asset to remove the hard drive reference
    const rawAssetResult = await db.collection("raw_assets").updateOne(
      { _id: assetId },
      {
        $pull: {
          hardDriveIds: driveId,
        } as any,
      }
    );

    if (rawAssetResult.matchedCount === 0) {
      // The hard drive was updated but the asset wasn't found
      // This is an inconsistency in the data, but we'll still return success
      console.warn(
        `Asset ${assetId} not found when removing from drive ${driveId}`
      );
    }

    return NextResponse.json(
      { message: "Asset removed from hard drive successfully" },
      { status: 200 }
    );
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
      "Access-Control-Allow-Methods": "DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
