import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string; assetId: string } }
) {
  try {
    const client = await clientPromise;
    const db = client.db();

    // Validate the IDs
    if (!ObjectId.isValid(params.id) || !ObjectId.isValid(params.assetId)) {
      return NextResponse.json({ error: "Invalid ID format" }, { status: 400 });
    }

    const driveId = new ObjectId(params.id);
    const assetId = new ObjectId(params.assetId);

    // Update the hard drive to remove the asset reference using standard update
    const hardDriveResult = await db.collection("hard_drives").updateOne(
      { _id: driveId },
      {
        $pull: {
          // Use the correct cast for MongoDB types
          rawAssets: assetId as any,
        },
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
          // Use the correct cast for MongoDB types
          hardDriveIds: driveId as any,
        },
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
    console.error("Error removing asset from hard drive:", error);
    return NextResponse.json(
      { error: "Failed to remove asset from hard drive" },
      { status: 500 }
    );
  }
}
