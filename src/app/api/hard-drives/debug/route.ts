import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db();

    // Get the problematic hard drive
    const hardDriveId = "67bd4ddfd3cffa315f768a55";
    const hardDrive = await db
      .collection("hard_drives")
      .findOne({ _id: new ObjectId(hardDriveId) });

    if (!hardDrive) {
      return NextResponse.json(
        { error: "Hard drive not found" },
        { status: 404 }
      );
    }

    // Check the rawAssets array
    const rawAssetsInfo = {
      exists: !!hardDrive.rawAssets,
      isArray: Array.isArray(hardDrive.rawAssets),
      length: hardDrive.rawAssets ? hardDrive.rawAssets.length : 0,
      containsNull: hardDrive.rawAssets
        ? hardDrive.rawAssets.some((item: any) => item === null)
        : false,
      containsUndefined: hardDrive.rawAssets
        ? hardDrive.rawAssets.some((item: any) => item === undefined)
        : false,
      sample: hardDrive.rawAssets ? hardDrive.rawAssets.slice(0, 5) : [],
    };

    // Check if any rawAssets are invalid ObjectIds
    const invalidIds = [];
    if (hardDrive.rawAssets && Array.isArray(hardDrive.rawAssets)) {
      for (let i = 0; i < hardDrive.rawAssets.length; i++) {
        const assetId = hardDrive.rawAssets[i];
        try {
          if (assetId === null || assetId === undefined) {
            invalidIds.push({
              index: i,
              value: assetId,
              reason: "null or undefined",
            });
          } else if (!ObjectId.isValid(assetId.toString())) {
            invalidIds.push({
              index: i,
              value: assetId,
              reason: "not a valid ObjectId",
            });
          }
        } catch (error) {
          invalidIds.push({
            index: i,
            value: assetId,
            reason:
              "error: " +
              (error instanceof Error ? error.message : String(error)),
          });
        }
      }
    }

    // Return debug info
    return NextResponse.json({
      hardDriveId,
      hardDriveExists: !!hardDrive,
      rawAssetsInfo,
      invalidIds,
      hardDriveData: {
        ...hardDrive,
        _id: hardDrive._id.toString(),
        rawAssets: hardDrive.rawAssets
          ? hardDrive.rawAssets.map((id: any, index: number) => {
              try {
                return id ? id.toString() : `null at index ${index}`;
              } catch (error) {
                return `Error at index ${index}: ${
                  error instanceof Error ? error.message : String(error)
                }`;
              }
            })
          : null,
      },
    });
  } catch (error) {
    console.error("Error in debug route:", error);
    return NextResponse.json(
      {
        error: "Debug route failed",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
