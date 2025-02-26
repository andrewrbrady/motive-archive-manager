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
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status");
    const id = searchParams.get("id");
    const location = searchParams.get("location") || "";
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
    if (location) {
      query.locationId = location;
    }

    // Get total count for pagination
    const totalCount = await collection.countDocuments(query);
    const totalPages = Math.ceil(totalCount / limit);

    // Fetch hard drives directly
    const hardDrives = await collection
      .find(query)
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    // Format basic drive data
    const formattedDrives = hardDrives.map((drive) => {
      const formattedDrive: any = {
        ...drive,
        _id: drive._id.toString(),
        rawAssets: drive.rawAssets?.map((id: ObjectId) => id.toString()) || [],
        locationDetails: null,
        rawAssetDetails: [],
      };
      return formattedDrive;
    });

    // If we need to include assets or location details
    if (includeAssets) {
      // Process each drive
      for (const drive of formattedDrives) {
        // Add location details if locationId exists and is not empty
        if (drive.locationId && drive.locationId !== "") {
          try {
            const locationDetails = await db.collection("locations").findOne({
              _id: new ObjectId(drive.locationId),
            });

            if (locationDetails) {
              drive.locationDetails = {
                ...locationDetails,
                _id: locationDetails._id.toString(),
              };
            }
          } catch (error) {
            console.error(
              `Error fetching location details for drive ${drive._id}:`,
              error
            );
          }
        }

        // Add raw asset details if requested and rawAssets exist
        if (drive.rawAssets && drive.rawAssets.length > 0) {
          try {
            const rawAssetIds = drive.rawAssets
              .map((id: string) => {
                try {
                  return new ObjectId(id);
                } catch (error) {
                  console.error(`Invalid ObjectId: ${id}`);
                  return null;
                }
              })
              .filter(Boolean);

            if (rawAssetIds.length > 0) {
              const rawAssetDetails = await db
                .collection("raw_assets")
                .find({
                  _id: { $in: rawAssetIds },
                })
                .toArray();

              drive.rawAssetDetails = rawAssetDetails.map((asset: any) => ({
                ...asset,
                _id: asset._id.toString(),
              }));
            }
          } catch (error) {
            console.error(
              `Error fetching raw asset details for drive ${drive._id}:`,
              error
            );
          }
        }
      }
    }

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
