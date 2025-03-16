import { NextResponse } from "next/server";
import { HardDrive, HardDriveData } from "@/models/hard-drive";
import clientPromise, {
  getMongoClient,
  validateConnection,
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

    // Validate connection before proceeding (new check)
    const isConnected = await validateConnection();
    if (!isConnected) {
      console.error(
        "MongoDB connection validation failed, cannot proceed with request"
      );
      return NextResponse.json(
        {
          error: "Database connection error",
          message: "Failed to establish database connection",
          drives: [],
          total: 0,
          currentPage: page,
          totalPages: 0,
          debug: {
            environment: process.env.NODE_ENV,
            vercel: process.env.VERCEL === "1" ? true : false,
            timestamp: new Date().toISOString(),
            database: process.env.MONGODB_DB || "motive_archive",
            connectionStatus: "failed",
          },
        },
        { status: 503 } // Service Unavailable
      );
    }

    // Use the enhanced getMongoClient with retry logic
    const client = await getMongoClient(5, 500); // 5 retries with 500ms initial delay
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

    // First do a quick check if any documents exist in this collection
    console.time("hard-drives-collection-check");
    const collectionCheck = await collection.findOne(
      {},
      { projection: { _id: 1 } }
    );
    console.timeEnd("hard-drives-collection-check");

    if (!collectionCheck) {
      console.warn("No hard drives found in collection - it may be empty");
    } else {
      console.log("Hard drives collection exists and contains data");
    }

    // Get total count for pagination with timeout handling
    console.time("hard-drives-count");
    const countPromise = new Promise<number>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        console.warn("Count query timed out, using default count of 0");
        resolve(0);
      }, 5000);

      collection
        .countDocuments(match)
        .then((count) => {
          clearTimeout(timeoutId);
          resolve(count);
        })
        .catch((err) => {
          clearTimeout(timeoutId);
          console.error("Error in count query:", err);
          resolve(0);
        });
    });

    const totalCount = await countPromise;
    const totalPages = Math.ceil(totalCount / limit);
    console.timeEnd("hard-drives-count");
    console.log(`Found ${totalCount} hard drives matching criteria`);

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

    // Execute aggregation with timeout handling
    console.time("hard-drives-aggregation");
    const aggregationPromise = new Promise<any[]>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        console.warn("Aggregation query timed out after 10 seconds");
        resolve([]);
      }, 10000);

      collection
        .aggregate(pipeline)
        .toArray()
        .then((results) => {
          clearTimeout(timeoutId);
          resolve(results);
        })
        .catch((err) => {
          clearTimeout(timeoutId);
          console.error("Error in aggregation query:", err);
          resolve([]);
        });
    });

    const hardDrives = await aggregationPromise;
    console.timeEnd("hard-drives-aggregation");
    console.log(`Aggregation returned ${hardDrives.length} hard drives`);

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
      debug: {
        environment: process.env.NODE_ENV,
        vercel: process.env.VERCEL === "1" ? true : false,
        timestamp: new Date().toISOString(),
        database: process.env.MONGODB_DB || "motive_archive",
        connectionPoolSize: client.options?.maxPoolSize,
        hasCollection: Boolean(collectionCheck),
        returnedCount: formattedDrives.length,
        totalCount,
        connectionStatus: "success",
      },
    });
  } catch (error) {
    console.error("Error fetching hard drives:", error);

    // Determine if this is a connection error
    const errorMessage = error instanceof Error ? error.message : String(error);
    const isConnectionError =
      errorMessage.toLowerCase().includes("connect") ||
      errorMessage.toLowerCase().includes("network") ||
      errorMessage.toLowerCase().includes("timeout") ||
      errorMessage.toLowerCase().includes("topology");

    // Provide more details in the error response
    return NextResponse.json(
      {
        error: "Failed to fetch hard drives",
        message: errorMessage,
        drives: [],
        total: 0,
        currentPage: 1,
        totalPages: 0,
        debug: {
          environment: process.env.NODE_ENV,
          vercel: process.env.VERCEL === "1" ? true : false,
          timestamp: new Date().toISOString(),
          database: process.env.MONGODB_DB || "motive_archive",
          errorName: error instanceof Error ? error.name : "Unknown",
          connectionError: isConnectionError,
          errorType: isConnectionError ? "connection" : "query",
        },
        stack:
          process.env.NODE_ENV === "development"
            ? error instanceof Error
              ? error.stack
              : undefined
            : undefined,
      },
      { status: isConnectionError ? 503 : 500 } // Use 503 for connection errors
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
