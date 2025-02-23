import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { HardDrive } from "@/models/hard-drive";

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

interface AggregationResult extends HardDrive {
  _id: ObjectId;
  rawAssetDetails: RawAssetWithCars[];
}

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const client = await clientPromise;
    const db = client.db();

    const hardDrive = await db
      .collection<HardDrive>("hard_drives")
      .findOne({ _id: new ObjectId(params.id) });

    if (!hardDrive) {
      return NextResponse.json(
        { error: "Hard drive not found" },
        { status: 404 }
      );
    }

    const pipeline = [
      {
        $match: {
          _id: new ObjectId(params.id),
        },
      },
      {
        $lookup: {
          from: "raw",
          localField: "rawAssets",
          foreignField: "_id",
          as: "rawAssetDetails",
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
          location: { $first: "$location" },
          notes: { $first: "$notes" },
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
      .collection<HardDrive>("hard_drives")
      .aggregate<AggregationResult>(pipeline)
      .toArray();

    if (!result[0]) {
      return NextResponse.json(
        { error: "Hard drive not found" },
        { status: 404 }
      );
    }

    // Convert ObjectIds to strings in the response and handle null/undefined values
    const formattedResult = {
      ...result[0],
      _id: result[0]._id.toString(),
      rawAssetDetails: (result[0].rawAssetDetails || [])
        .filter((asset) => asset && asset._id) // Filter out null/undefined assets
        .map((asset) => ({
          ...asset,
          _id: asset._id.toString(),
          cars: (asset.cars || [])
            .filter((car) => car && car._id) // Filter out null/undefined cars
            .map((car) => ({
              ...car,
              _id: car._id.toString(),
            })),
        })),
    };

    return NextResponse.json(formattedResult);
  } catch (error) {
    console.error("Error fetching hard drive details:", error);
    return NextResponse.json(
      { error: "Failed to fetch hard drive details" },
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

    // Convert raw asset IDs to ObjectIds if provided
    if (data.rawAssets) {
      data.rawAssets = data.rawAssets.map((id: string) => new ObjectId(id));
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

    // Fetch updated drive with raw asset details
    const [updatedDrive] = await db
      .collection("hard_drives")
      .aggregate([
        { $match: { _id: new ObjectId(params.id) } },
        {
          $lookup: {
            from: "raw",
            localField: "rawAssets",
            foreignField: "_id",
            as: "rawAssetDetails",
          },
        },
      ])
      .toArray();

    return NextResponse.json({
      ...updatedDrive,
      _id: updatedDrive._id.toString(),
      rawAssets: updatedDrive.rawAssets?.map((id: ObjectId) => id.toString()),
      rawAssetDetails: updatedDrive.rawAssetDetails?.map((asset: any) => ({
        ...asset,
        _id: asset._id.toString(),
      })),
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
