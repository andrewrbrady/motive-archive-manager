import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

interface RawAsset {
  _id: ObjectId;
  date: string;
  description: string;
  hardDriveIds?: ObjectId[];
  [key: string]: any;
}

export async function POST(request: Request) {
  try {
    const { dates, driveId } = await request.json();

    if (!dates || !Array.isArray(dates) || dates.length === 0) {
      return NextResponse.json(
        { error: "Array of dates is required" },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const rawAssetsCollection = db.collection<RawAsset>("raw_assets");
    const hardDrivesCollection = db.collection("hard_drives");

    // Validate hard drive ID
    let hardDriveObjectId: ObjectId | null = null;
    if (driveId) {
      try {
        hardDriveObjectId = new ObjectId(driveId);

        // Verify the drive exists
        const drive = await hardDrivesCollection.findOne({
          _id: hardDriveObjectId,
        });
        if (!drive) {
          return NextResponse.json(
            { error: "Hard drive not found" },
            { status: 404 }
          );
        }
      } catch (error) {
        return NextResponse.json(
          { error: "Invalid hard drive ID" },
          { status: 400 }
        );
      }
    }

    // Format dates for query - convert YYMMDD to database date format
    const formattedDates = dates.map((date: string) => {
      // Assuming date is in YYMMDD format
      const yearPrefix = parseInt(date.substring(0, 2)) < 50 ? "20" : "19"; // Handle century
      const year = yearPrefix + date.substring(0, 2);
      const month = date.substring(2, 4);
      const day = date.substring(4, 6);

      // Create date strings for query
      return `${year}-${month}-${day}`;
    });

    // Find raw assets with matching dates
    const matchedAssets = await rawAssetsCollection
      .find({
        date: { $in: formattedDates },
      })
      .toArray();

    // If we have a drive ID, we can associate these assets with the drive
    let associatedAssets: RawAsset[] = [];
    if (hardDriveObjectId && matchedAssets.length > 0) {
      // Get assets that are already associated with this drive
      associatedAssets = matchedAssets.filter(
        (asset) =>
          asset.hardDriveIds &&
          hardDriveObjectId &&
          asset.hardDriveIds.some(
            (id: ObjectId) => id.toString() === hardDriveObjectId.toString()
          )
      );

      // Get assets that need to be associated
      const assetsToAssociate = matchedAssets.filter(
        (asset) =>
          !asset.hardDriveIds ||
          !hardDriveObjectId ||
          !asset.hardDriveIds.some(
            (id: ObjectId) => id.toString() === hardDriveObjectId.toString()
          )
      );

      // Associate assets with the drive
      if (assetsToAssociate.length > 0) {
        const assetIds = assetsToAssociate.map((asset) => asset._id);

        // Update assets to include this drive
        await rawAssetsCollection.updateMany(
          { _id: { $in: assetIds } },
          { $addToSet: { hardDriveIds: hardDriveObjectId } }
        );

        // Update drive to include these assets
        await hardDrivesCollection.updateOne(
          { _id: hardDriveObjectId },
          {
            $addToSet: {
              rawAssets: { $each: assetIds },
            },
            $set: {
              updatedAt: new Date(),
            },
          }
        );
      }
    }

    // Format response
    const formattedMatchedAssets = matchedAssets.map((asset) => ({
      _id: asset._id.toString(),
      date: asset.date,
      description: asset.description,
      hardDriveIds: asset.hardDriveIds
        ? asset.hardDriveIds.map((id: ObjectId) => id.toString())
        : [],
    }));

    return NextResponse.json({
      matchedAssets: formattedMatchedAssets,
      associatedAssets: associatedAssets.map((asset) => asset._id.toString()),
      newlyAssociated: matchedAssets.length - associatedAssets.length,
      dates: formattedDates,
    });
  } catch (error) {
    console.error("Error searching raw assets by dates:", error);
    return NextResponse.json(
      { error: "Failed to search raw assets", details: String(error) },
      { status: 500 }
    );
  }
}
