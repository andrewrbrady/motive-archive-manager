import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { RawAsset } from "@/types/inventory";

interface RouteParams {
  params: {
    id: string;
  };
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const client = await clientPromise;
    const db = client.db();
    const rawCollection = db.collection("raw_assets");

    const asset = await rawCollection.findOne({
      _id: new ObjectId(params.id),
    });

    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    return NextResponse.json({
      ...asset,
      _id: asset._id.toString(),
    });
  } catch (error) {
    console.error("Error fetching raw asset:", error);
    return NextResponse.json(
      { error: "Failed to fetch raw asset" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const client = await clientPromise;
    const db = client.db();
    const rawCollection = db.collection("raw_assets");
    const hardDrivesCollection = db.collection("hard_drives");

    const data = await request.json();
    const assetId = params.id;

    // Get the current asset to compare locations
    const currentAsset = await rawCollection.findOne({
      _id: new ObjectId(assetId),
    });

    if (!currentAsset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    // Convert current and new locations to strings for comparison
    const currentHardDriveIds = (currentAsset.hardDriveIds || []).map(
      (loc: ObjectId | string) =>
        loc instanceof ObjectId ? loc.toString() : loc
    );

    // Ensure new locations are valid and convert to ObjectId
    const newHardDriveIds = (data.hardDriveIds || [])
      .map((loc: string) => {
        try {
          return new ObjectId(loc);
        } catch (error) {
          console.error(`Invalid ObjectId: ${loc}`);
          return null;
        }
      })
      .filter(Boolean);

    // Convert new locations to strings for comparison
    const newHardDriveIdStrings = newHardDriveIds.map((loc: ObjectId) =>
      loc.toString()
    );

    // Find locations to add and remove
    const hardDriveIdsToAdd = newHardDriveIdStrings.filter(
      (loc: string) => !currentHardDriveIds.includes(loc)
    );

    const hardDriveIdsToRemove = currentHardDriveIds.filter(
      (loc: string) => !newHardDriveIdStrings.includes(loc)
    );

    console.log(`Updating asset ${assetId}:`);
    console.log(`- Current hard drive IDs: ${currentHardDriveIds.join(", ")}`);
    console.log(`- New hard drive IDs: ${newHardDriveIdStrings.join(", ")}`);
    console.log(`- Adding hard drive IDs: ${hardDriveIdsToAdd.join(", ")}`);
    console.log(
      `- Removing hard drive IDs: ${hardDriveIdsToRemove.join(", ")}`
    );

    // Prepare update data
    const updateData = {
      ...data,
      updatedAt: new Date(),
      carIds: data.carIds?.map((id: string) => new ObjectId(id)),
      hardDriveIds: newHardDriveIds,
    };
    delete updateData._id;

    // Update the raw asset
    await rawCollection.updateOne(
      { _id: new ObjectId(assetId) },
      { $set: updateData }
    );

    // Update hard drives - add asset to new locations
    if (hardDriveIdsToAdd.length > 0) {
      const addPromises = hardDriveIdsToAdd.map((hardDriveId: string) =>
        hardDrivesCollection.updateOne(
          { _id: new ObjectId(hardDriveId) },
          {
            $addToSet: { rawAssets: new ObjectId(assetId) },
            $set: { updatedAt: new Date() },
          }
        )
      );
      await Promise.all(addPromises);
      console.log(`Added asset to ${hardDriveIdsToAdd.length} hard drives`);
    }

    // Update hard drives - remove asset from old locations
    if (hardDriveIdsToRemove.length > 0) {
      const removePromises = hardDriveIdsToRemove.map((hardDriveId: string) =>
        hardDrivesCollection.updateOne(
          { _id: new ObjectId(hardDriveId) },
          {
            $pull: { rawAssets: new ObjectId(assetId) } as any,
            $set: { updatedAt: new Date() },
          }
        )
      );
      await Promise.all(removePromises);
      console.log(
        `Removed asset from ${hardDriveIdsToRemove.length} hard drives`
      );
    }

    return NextResponse.json({
      success: true,
      message: "Asset updated successfully",
      hardDrivesAdded: hardDriveIdsToAdd.length,
      hardDrivesRemoved: hardDriveIdsToRemove.length,
    });
  } catch (error) {
    console.error("Error updating raw asset:", error);
    return NextResponse.json(
      { error: "Failed to update raw asset" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const client = await clientPromise;
    const db = client.db();
    const rawCollection = db.collection("raw_assets");
    const hardDrivesCollection = db.collection("hard_drives");
    const assetId = params.id;

    // Get the asset to find its hard drive IDs
    const asset = await rawCollection.findOne({
      _id: new ObjectId(assetId),
    });

    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    // Delete the asset
    await rawCollection.deleteOne({
      _id: new ObjectId(assetId),
    });

    // Remove the asset from all hard drives it was associated with
    if (asset.hardDriveIds && asset.hardDriveIds.length > 0) {
      await hardDrivesCollection.updateMany(
        { _id: { $in: asset.hardDriveIds } },
        {
          $pull: { rawAssets: new ObjectId(assetId) } as any,
          $set: { updatedAt: new Date() },
        }
      );
      console.log(
        `Removed asset from ${asset.hardDriveIds.length} hard drives`
      );
    }

    return NextResponse.json({
      success: true,
      message: "Asset deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting raw asset:", error);
    return NextResponse.json(
      { error: "Failed to delete raw asset" },
      { status: 500 }
    );
  }
}
