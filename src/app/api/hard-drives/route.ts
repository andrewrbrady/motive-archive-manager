import { NextResponse } from "next/server";
import { HardDrive, HardDriveData } from "@/models/hard-drive";
import clientPromise, {
  getMongoClient,
  validateConnection,
  ensureCollectionExists,
  type MongoDebugInfo,
} from "@/lib/mongodb";
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
  const { searchParams } = new URL(request.url);
  const currentPage = Number(searchParams.get("page") || "1");
  const limit = Number(searchParams.get("limit") || "25");
  const skip = (currentPage - 1) * limit;
  const sort = searchParams.get("sort") || "";
  const direction = searchParams.get("direction") === "desc" ? -1 : 1;

  // Construct sort options
  const sortOptions: Record<string, 1 | -1> = {};
  if (sort) {
    sortOptions[sort] = direction;
  } else {
    // Default sort by createdAt desc if no sort specified
    sortOptions["createdAt"] = -1;
  }

  // Create the debug info object
  const debugInfo: MongoDebugInfo = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    vercel: process.env.VERCEL === "1",
    database: process.env.MONGODB_DB || "motive_archive",
    connectionPoolSize: 10,
    connectionStatus: "error",
  };

  let client;
  let hasCollection = false;

  try {
    // Validate connection first
    const isConnected = await validateConnection();
    if (!isConnected) {
      return NextResponse.json(
        {
          error: "Failed to validate MongoDB connection",
          data: [],
          meta: {
            page: currentPage,
            limit,
            total: 0,
            totalPages: 0,
          },
          debug: {
            ...debugInfo,
            connectionStatus: "error",
            connectionError: "Connection validation failed",
          },
        },
        { status: 500 }
      );
    }

    // Attempt to get the MongoDB client with more aggressive retry
    client = await getMongoClient(3, 500);

    // Use our more robust collection check
    const { exists, client: collectionClient } = await ensureCollectionExists(
      "hard_drives",
      client
    );
    client = collectionClient; // Use the client returned from ensureCollectionExists
    hasCollection = exists;

    debugInfo.hasCollection = hasCollection;
    debugInfo.connectionStatus = "success";

    // If collection does not exist, return empty result
    if (!hasCollection) {
      return NextResponse.json(
        {
          data: [],
          meta: {
            page: currentPage,
            limit,
            total: 0,
            totalPages: 0,
          },
          debug: {
            ...debugInfo,
            returnedCount: 0,
            totalCount: 0,
          },
        },
        { status: 200 }
      );
    }

    // Make sure client is defined before using it
    if (!client) {
      throw new Error("MongoDB client is undefined after collection check");
    }

    // Get the collection
    const db = client.db();
    const collection = db.collection("hard_drives");

    // Count total documents for pagination
    const totalDocumentsPromise = collection.countDocuments();

    // Get the drives with pagination and sorting
    const drivesPromise = collection
      .find({})
      .sort(sortOptions)
      .skip(skip)
      .limit(limit)
      .toArray();

    // Wait for both promises to resolve
    const [totalDocuments, drives] = await Promise.all([
      totalDocumentsPromise,
      drivesPromise,
    ]);

    const totalPages = Math.ceil(totalDocuments / limit);

    // Update debug info with counts
    debugInfo.returnedCount = drives.length;
    debugInfo.totalCount = totalDocuments;

    return NextResponse.json(
      {
        data: drives,
        meta: {
          page: currentPage,
          limit,
          total: totalDocuments,
          totalPages,
        },
        debug: debugInfo,
      },
      { status: 200 }
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error(`Error fetching hard drives: ${errorMessage}`);
    return NextResponse.json(
      {
        error: "Failed to fetch hard drives",
        message: errorMessage,
        data: [],
        meta: {
          page: currentPage,
          limit,
          total: 0,
          totalPages: 0,
        },
        debug: {
          ...debugInfo,
          connectionStatus: "error",
          connectionError: errorMessage,
          hasCollection,
        },
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

    const client = await getMongoClient(3, 500);
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
