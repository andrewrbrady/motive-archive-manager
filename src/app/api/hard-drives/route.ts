import { NextResponse } from "next/server";
import { HardDrive, HardDriveData } from "@/models/hard-drive";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

type PipelineStage = {
  $match?: any;
  $sort?: { updatedAt: number };
  $skip?: number;
  $limit?: number;
  $lookup?: {
    from: string;
    localField: string;
    foreignField: string;
    as: string;
  };
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status");
    const id = searchParams.get("id");
    const includeAssets = searchParams.get("include_assets") === "true";
    const skip = (page - 1) * limit;

    const client = await clientPromise;
    const db = client.db();
    const collection = db.collection("hard_drives");

    // Build query
    const query: any = {};
    if (search) {
      const searchRegex = { $regex: search, $options: "i" };
      query.$or = [
        { label: searchRegex },
        { systemName: searchRegex },
        { location: searchRegex },
        { notes: searchRegex },
      ];
    }
    if (status) {
      query.status = status;
    }
    if (id) {
      try {
        query._id = new ObjectId(id);
      } catch {
        // If id is not a valid ObjectId, try searching by label
        query.label = id;
      }
    }

    // Get total count for pagination
    const totalCount = await collection.countDocuments(query);
    const totalPages = Math.ceil(totalCount / limit);

    // Build pipeline
    const pipeline: PipelineStage[] = [
      { $match: query },
      { $sort: { updatedAt: -1 } },
      { $skip: skip },
      { $limit: limit },
    ];

    // Add raw asset lookup if requested
    if (includeAssets) {
      pipeline.push({
        $lookup: {
          from: "raw",
          localField: "rawAssets",
          foreignField: "_id",
          as: "rawAssetDetails",
        },
      });
    }

    // Fetch hard drives
    const hardDrives = await collection.aggregate(pipeline).toArray();

    // Format response
    const formattedDrives = hardDrives.map((drive) => ({
      ...drive,
      _id: drive._id.toString(),
      rawAssets: drive.rawAssets?.map((id: ObjectId) => id.toString()),
      rawAssetDetails: drive.rawAssetDetails?.map((asset: any) => ({
        ...asset,
        _id: asset._id.toString(),
      })),
    }));

    return NextResponse.json({
      drives: formattedDrives,
      total: totalCount,
      currentPage: page,
      totalPages,
    });
  } catch (error) {
    console.error("Error fetching hard drives:", error);
    return NextResponse.json(
      { error: "Failed to fetch hard drives" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();

    // Validate required fields
    if (!data.label || !data.capacity?.total || !data.type || !data.interface) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check for duplicate label
    const existingDrive = await HardDrive.findByLabel(data.label);
    if (existingDrive) {
      return NextResponse.json(
        { error: "A hard drive with this label already exists" },
        { status: 400 }
      );
    }

    // Check for duplicate system name if provided
    if (data.systemName) {
      const existingBySystemName = await HardDrive.findBySystemName(
        data.systemName
      );
      if (existingBySystemName) {
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

    // Create new hard drive
    const newDrive = await HardDrive.create({
      ...data,
      status: data.status || "Available",
      rawAssets: data.rawAssets || [],
    });

    return NextResponse.json(newDrive, { status: 201 });
  } catch (error) {
    console.error("Error creating hard drive:", error);
    return NextResponse.json(
      { error: "Failed to create hard drive" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Hard drive ID is required" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db();

    const result = await db
      .collection("hard_drives")
      .deleteOne({ _id: new ObjectId(id) });

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
