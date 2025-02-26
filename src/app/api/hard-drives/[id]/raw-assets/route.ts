import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

// Handle adding raw assets to a drive
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { rawAssetIds } = await request.json();
    const driveId = params.id;

    if (!driveId || !rawAssetIds || !Array.isArray(rawAssetIds)) {
      return NextResponse.json(
        { error: "Drive ID and array of raw asset IDs are required" },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();

    // Convert IDs to ObjectIds
    const driveObjectId = new ObjectId(driveId);
    const rawAssetObjectIds = rawAssetIds.map((id) => new ObjectId(id));

    // Get the drive
    const drive = await db
      .collection("hard_drives")
      .findOne({ _id: driveObjectId });

    if (!drive) {
      return NextResponse.json({ error: "Drive not found" }, { status: 404 });
    }

    // Update both the drive and raw assets
    const updatePromises = [
      // Add raw assets to drive
      db.collection("hard_drives").updateOne(
        { _id: driveObjectId },
        {
          $addToSet: {
            rawAssets: { $each: rawAssetObjectIds },
          },
        }
      ),
      // Add drive to each raw asset's hardDriveIds
      db.collection("raw_assets").updateMany(
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
    console.error("Error adding raw assets to drive:", error);
    return NextResponse.json(
      { error: "Failed to add raw assets" },
      { status: 500 }
    );
  }
}

// Handle removing raw assets from a drive
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { rawAssetIds } = await request.json();
    const driveId = params.id;

    if (!driveId || !rawAssetIds || !Array.isArray(rawAssetIds)) {
      return NextResponse.json(
        { error: "Drive ID and array of raw asset IDs are required" },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();

    // Convert IDs to ObjectIds
    const driveObjectId = new ObjectId(driveId);
    const rawAssetObjectIds = rawAssetIds.map((id) => new ObjectId(id));

    // Get the drive
    const drive = await db
      .collection("hard_drives")
      .findOne({ _id: driveObjectId });

    if (!drive) {
      return NextResponse.json({ error: "Drive not found" }, { status: 404 });
    }

    // Update both the drive and raw assets
    const updatePromises = [
      // Remove raw assets from drive
      db.collection("hard_drives").updateOne(
        { _id: driveObjectId },
        {
          $pullAll: { rawAssets: rawAssetObjectIds } as any,
        }
      ),
      // Remove drive from each raw asset's hardDriveIds
      db.collection("raw_assets").updateMany(
        { _id: { $in: rawAssetObjectIds } },
        {
          $pull: { hardDriveIds: driveObjectId } as any,
        }
      ),
    ];

    await Promise.all(updatePromises);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing raw assets from drive:", error);
    return NextResponse.json(
      { error: "Failed to remove raw assets" },
      { status: 500 }
    );
  }
}
