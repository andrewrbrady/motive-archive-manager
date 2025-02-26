import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { HardDrive } from "@/models/hard-drive";
import { toObjectId } from "@/lib/mongodb-types";

interface RawAssetWithCars {
  _id: ObjectId;
  date: string;
  cars: Array<{
    _id: ObjectId;
    make: string;
    model: string;
    year: number;
  }>;
}

interface HardDriveDocument extends Omit<HardDrive, "rawAssets"> {
  _id: ObjectId;
  rawAssets: ObjectId[];
}

interface AggregationResult extends HardDriveDocument {
  rawAssetDetails: RawAssetWithCars[];
  locationDetails?: Array<{
    _id: ObjectId;
    name: string;
    type: string;
    [key: string]: any;
  }>;
}

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const client = await clientPromise;
    const db = client.db();

    const hardDrive = await db
      .collection<HardDriveDocument>("hard_drives")
      .findOne({ _id: new ObjectId(params.id) });

    if (!hardDrive) {
      return NextResponse.json(
        { error: "Hard drive not found" },
        { status: 404 }
      );
    }

    // Safeguard: Check if rawAssets array contains valid ObjectIds
    // and filter out any invalid ones before proceeding with the pipeline
    let validRawAssets: ObjectId[] = [];
    if (
      hardDrive.rawAssets &&
      Array.isArray(hardDrive.rawAssets) &&
      hardDrive.rawAssets.length > 0
    ) {
      validRawAssets = hardDrive.rawAssets.filter((assetId) => {
        try {
          // Check if it's a valid ObjectId and not null/undefined
          return (
            assetId !== null &&
            assetId !== undefined &&
            ObjectId.isValid(assetId.toString())
          );
        } catch (error) {
          console.error(`Invalid raw asset ID: ${assetId}`, error);
          return false;
        }
      });

      // If we filtered out any invalid IDs, update the hard drive
      if (validRawAssets.length !== hardDrive.rawAssets.length) {
        console.log(
          `Filtered out ${
            hardDrive.rawAssets.length - validRawAssets.length
          } invalid raw asset IDs from hard drive ${params.id}`
        );
        await db
          .collection("hard_drives")
          .updateOne(
            { _id: new ObjectId(params.id) },
            { $set: { rawAssets: validRawAssets } }
          );

        // Update the hardDrive object to use the valid assets
        hardDrive.rawAssets = validRawAssets;
      }
    }

    const pipeline = [
      {
        $match: {
          _id: new ObjectId(params.id),
        },
      },
      {
        $addFields: {
          locationObjectId: {
            $cond: {
              if: {
                $and: [
                  { $ne: ["$locationId", null] },
                  { $ne: ["$locationId", ""] },
                  { $ne: ["$locationId", undefined] },
                ],
              },
              then: { $toObjectId: "$locationId" },
              else: null,
            },
          },
        },
      },
      {
        $lookup: {
          from: "raw_assets",
          localField: "rawAssets",
          foreignField: "_id",
          as: "rawAssetDetails",
        },
      },
      {
        $lookup: {
          from: "locations",
          localField: "locationObjectId",
          foreignField: "_id",
          as: "locationDetails",
        },
      },
      {
        $unwind: {
          path: "$rawAssetDetails",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "cars",
          localField: "rawAssetDetails.carIds",
          foreignField: "_id",
          as: "rawAssetDetails.cars",
        },
      },
      {
        $sort: {
          "rawAssetDetails.date": -1,
          "rawAssetDetails._id": 1,
        },
      },
      {
        $group: {
          _id: "$_id",
          label: { $first: "$label" },
          systemName: { $first: "$systemName" },
          capacity: { $first: "$capacity" },
          type: { $first: "$type" },
          interface: { $first: "$interface" },
          status: { $first: "$status" },
          locationId: { $first: "$locationId" },
          locationDetails: { $first: "$locationDetails" },
          notes: { $first: "$notes" },
          rawAssets: { $first: "$rawAssets" },
          rawAssetDetails: {
            $push: {
              $cond: {
                if: { $eq: ["$rawAssetDetails", null] },
                then: "$$REMOVE",
                else: "$rawAssetDetails",
              },
            },
          },
        },
      },
    ];

    const result = await db
      .collection<HardDriveDocument>("hard_drives")
      .aggregate<AggregationResult>(pipeline)
      .toArray();

    if (result.length === 0) {
      return NextResponse.json(
        { error: "Hard drive not found" },
        { status: 404 }
      );
    }

    const drive = result[0];

    return NextResponse.json({
      ...drive,
      _id: drive._id.toString(),
      rawAssets: drive.rawAssets
        ?.filter((id) => id !== null && id !== undefined)
        .map((id: ObjectId) => id.toString()),
      locationDetails: drive.locationDetails?.[0]
        ? {
            ...drive.locationDetails[0],
            _id: drive.locationDetails[0]._id.toString(),
          }
        : null,
      rawAssetDetails:
        drive.rawAssetDetails
          ?.filter(
            (asset) =>
              asset !== null &&
              asset !== undefined &&
              asset._id !== null &&
              asset._id !== undefined
          )
          .map((asset) => ({
            ...asset,
            _id: asset._id.toString(),
            cars:
              asset.cars
                ?.filter(
                  (car) =>
                    car !== null &&
                    car !== undefined &&
                    car._id !== null &&
                    car._id !== undefined
                )
                .map((car) => ({
                  ...car,
                  _id: car._id.toString(),
                })) || [],
          })) || [],
    });
  } catch (error) {
    console.error("Error fetching hard drive:", error);
    return NextResponse.json(
      { error: "Failed to fetch hard drive" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const data = await request.json();
    const client = await clientPromise;
    const db = client.db();

    // Check if drive exists
    const existingDrive = await db
      .collection("hard_drives")
      .findOne({ _id: new ObjectId(params.id) });

    if (!existingDrive) {
      return NextResponse.json(
        { error: "Hard drive not found" },
        { status: 404 }
      );
    }

    // Check for duplicate label if label is being changed
    if (data.label && data.label !== existingDrive.label) {
      const duplicateLabel = await HardDrive.findByLabel(data.label);
      if (duplicateLabel) {
        return NextResponse.json(
          { error: "A hard drive with this label already exists" },
          { status: 400 }
        );
      }
    }

    // Check for duplicate system name if being changed
    if (data.systemName && data.systemName !== existingDrive.systemName) {
      const duplicateSystemName = await HardDrive.findBySystemName(
        data.systemName
      );
      if (duplicateSystemName) {
        return NextResponse.json(
          { error: "A hard drive with this system name already exists" },
          { status: 400 }
        );
      }
    }

    // Convert locationId to ObjectId if provided
    if (data.locationId) {
      try {
        // Check if locationId is a valid non-empty string
        if (
          typeof data.locationId === "string" &&
          data.locationId.trim() !== ""
        ) {
          data.locationId = new ObjectId(data.locationId);
        } else {
          // If it's an empty string or invalid, set to null
          data.locationId = null;
        }
      } catch (error) {
        console.error("Invalid location ID:", error);
        data.locationId = null;
      }
    }

    // Convert raw asset IDs to ObjectIds if provided
    if (data.rawAssets) {
      data.rawAssets = data.rawAssets
        .filter((id: string) => id !== null && id !== undefined)
        .map((id: string) => {
          try {
            return new ObjectId(id);
          } catch (error) {
            console.error(`Invalid raw asset ID in PUT request: ${id}`, error);
            return null;
          }
        })
        .filter((id: ObjectId | null) => id !== null);
    }

    // Update drive
    const result = await db.collection("hard_drives").updateOne(
      { _id: new ObjectId(params.id) },
      {
        $set: {
          ...data,
          updatedAt: new Date(),
        },
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: "Hard drive not found" },
        { status: 404 }
      );
    }

    // Fetch updated drive with raw asset details and location details
    const pipeline = [
      {
        $match: {
          _id: new ObjectId(params.id),
        },
      },
      {
        $addFields: {
          locationObjectId: {
            $cond: {
              if: {
                $and: [
                  { $ne: ["$locationId", null] },
                  { $ne: ["$locationId", ""] },
                  { $ne: ["$locationId", undefined] },
                ],
              },
              then: { $toObjectId: "$locationId" },
              else: null,
            },
          },
        },
      },
      {
        $lookup: {
          from: "raw_assets",
          localField: "rawAssets",
          foreignField: "_id",
          as: "rawAssetDetails",
        },
      },
      {
        $lookup: {
          from: "locations",
          localField: "locationObjectId",
          foreignField: "_id",
          as: "locationDetails",
        },
      },
    ];

    const [updatedDrive] = await db
      .collection("hard_drives")
      .aggregate(pipeline)
      .toArray();

    return NextResponse.json({
      ...updatedDrive,
      _id: updatedDrive._id.toString(),
      rawAssets:
        updatedDrive.rawAssets
          ?.filter((id: any) => id !== null && id !== undefined)
          .map((id: ObjectId) => id.toString()) || [],
      locationDetails: updatedDrive.locationDetails?.[0]
        ? {
            ...updatedDrive.locationDetails[0],
            _id: updatedDrive.locationDetails[0]._id.toString(),
          }
        : null,
      rawAssetDetails:
        updatedDrive.rawAssetDetails
          ?.filter(
            (asset: any) =>
              asset !== null &&
              asset !== undefined &&
              asset._id !== null &&
              asset._id !== undefined
          )
          .map((asset: any) => ({
            ...asset,
            _id: asset._id.toString(),
            cars:
              asset.cars
                ?.filter(
                  (car: any) =>
                    car !== null &&
                    car !== undefined &&
                    car._id !== null &&
                    car._id !== undefined
                )
                .map((car: any) => ({
                  ...car,
                  _id: car._id.toString(),
                })) || [],
          })) || [],
    });
  } catch (error) {
    console.error("Error updating hard drive:", error);
    return NextResponse.json(
      { error: "Failed to update hard drive" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const client = await clientPromise;
    const db = client.db();

    const result = await db
      .collection("hard_drives")
      .deleteOne({ _id: new ObjectId(params.id) });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: "Hard drive not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting hard drive:", error);
    return NextResponse.json(
      { error: "Failed to delete hard drive" },
      { status: 500 }
    );
  }
}
