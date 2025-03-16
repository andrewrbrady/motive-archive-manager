import { NextResponse } from "next/server";
import { HardDrive, HardDriveData } from "@/models/hard-drive";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { toObjectId } from "@/lib/mongodb-types";

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
  $addFields?: any;
};

export async function GET(request: Request) {
  try {
    console.time("hard-drives-api");
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status");
    const id = searchParams.get("id");
    const location = searchParams.get("location") || "";
    const includeAssets = searchParams.get("include_assets") === "true";
    const skip = (page - 1) * limit;

    console.log(
      `Fetching hard drives: page=${page}, limit=${limit}, search=${search}, location=${location}, includeAssets=${includeAssets}`
    );

    const client = await clientPromise;
    const db = client.db();
    const collection = db.collection("hard_drives");

    // Build match query
    const match: any = {};
    if (search) {
      const searchRegex = { $regex: search, $options: "i" };
      match.$or = [
        { label: searchRegex },
        { systemName: searchRegex },
        { notes: searchRegex },
      ];
    }
    if (status) {
      match.status = status;
    }
    if (id) {
      try {
        match._id = new ObjectId(id);
      } catch {
        // If id is not a valid ObjectId, try searching by label
        match.label = id;
      }
    }
    if (location) {
      match.locationId = location;
    }

    // Create aggregation pipeline
    const pipeline: PipelineStage[] = [
      { $match: match },
      { $sort: { updatedAt: -1 } },
      { $skip: skip },
      { $limit: limit },
    ];

    // Add location details lookup if requested
    if (includeAssets) {
      // Add location lookup
      pipeline.push({
        $lookup: {
          from: "locations",
          localField: "locationId",
          foreignField: "_id",
          as: "locationDetails",
        },
      });

      // Limit returned location data to the first match
      pipeline.push({
        $addFields: {
          locationDetails: { $arrayElemAt: ["$locationDetails", 0] },
        },
      });

      // Add raw assets lookup (only if the drive has rawAssets)
      pipeline.push({
        $lookup: {
          from: "raw_assets",
          localField: "rawAssets",
          foreignField: "_id",
          as: "rawAssetDetails",
        },
      });

      // Add a field to limit number of raw assets details returned
      // This prevents returning too much data
      pipeline.push({
        $addFields: {
          rawAssetDetails: { $slice: ["$rawAssetDetails", 0, 20] },
        },
      });
    }

    // Get total count for pagination
    const totalCount = await collection.countDocuments(match);
    const totalPages = Math.ceil(totalCount / limit);

    // Execute aggregation
    console.time("hard-drives-aggregation");
    const hardDrives = await collection.aggregate(pipeline).toArray();
    console.timeEnd("hard-drives-aggregation");

    // Format the results
    const formattedDrives = hardDrives.map((drive) => {
      const formattedDrive: any = {
        ...drive,
        _id: drive._id.toString(),
        rawAssets: drive.rawAssets?.map((id: ObjectId) => id.toString()) || [],
      };

      // Format locationDetails if exists
      if (formattedDrive.locationDetails) {
        formattedDrive.locationDetails = {
          ...formattedDrive.locationDetails,
          _id: formattedDrive.locationDetails._id.toString(),
        };
      }

      // Format rawAssetDetails if exists
      if (formattedDrive.rawAssetDetails) {
        formattedDrive.rawAssetDetails = formattedDrive.rawAssetDetails.map(
          (asset: any) => ({
            ...asset,
            _id: asset._id.toString(),
          })
        );
      }

      return formattedDrive;
    });

    console.timeEnd("hard-drives-api");
    console.log(
      `Returning ${formattedDrives.length} hard drives out of ${totalCount} total`
    );

    return NextResponse.json({
      drives: formattedDrives,
      total: totalCount,
      currentPage: page,
      totalPages,
    });
  } catch (error) {
    console.error("Error fetching hard drives:", error);
    // Provide more details in the error response
    return NextResponse.json(
      {
        error: "Failed to fetch hard drives",
        message: error instanceof Error ? error.message : String(error),
        stack:
          process.env.NODE_ENV === "development"
            ? error instanceof Error
              ? error.stack
              : undefined
            : undefined,
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    console.log("Received data:", JSON.stringify(data, null, 2));

    // Validate required fields
    if (!data.label || !data.capacity?.total || !data.type || !data.interface) {
      console.log("Missing required fields:", {
        label: !!data.label,
        "capacity.total": !!data.capacity?.total,
        type: !!data.type,
        interface: !!data.interface,
      });
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check for duplicate label
    const existingDrive = await HardDrive.findByLabel(data.label);
    if (existingDrive) {
      console.log(`A hard drive with label "${data.label}" already exists`);
      return NextResponse.json(
        { error: `A hard drive with label "${data.label}" already exists` },
        { status: 400 }
      );
    }

    // Check for duplicate system name if provided
    if (data.systemName) {
      const existingBySystemName = await HardDrive.findBySystemName(
        data.systemName
      );
      if (existingBySystemName) {
        console.log(
          `A hard drive with system name "${data.systemName}" already exists`
        );
        return NextResponse.json(
          {
            error: `A hard drive with system name "${data.systemName}" already exists`,
          },
          { status: 400 }
        );
      }
    }

    // Convert locationId to ObjectId if provided
    if (data.locationId) {
      try {
        data.locationId = data.locationId.toString();
      } catch (error) {
        return NextResponse.json(
          { error: "Invalid location ID" },
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
