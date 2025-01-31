import { MongoClient, Collection, ObjectId } from "mongodb";
import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";

const uri = process.env.MONGODB_URI || "mongodb://localhost:27017";
const dbName = process.env.MONGODB_DB || "arb_assets";

async function getClient() {
  const client = await MongoClient.connect(uri);
  return client;
}

export async function GET(request: NextRequest) {
  let client;
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search") || "";
    const sortField = searchParams.get("sortField") || "createdAt";
    const sortDirection = searchParams.get("sortDirection") || "desc";
    const skip = (page - 1) * limit;

    client = await getClient();
    const db = client.db(dbName);
    const collection = db.collection("raw");

    // Build search query
    const searchQuery = search
      ? {
          $or: [
            { name: { $regex: search, $options: "i" } },
            { description: { $regex: search, $options: "i" } },
          ],
        }
      : {};

    // Build sort object
    const sortObject: { [key: string]: 1 | -1 } = {
      [sortField]: sortDirection === "desc" ? -1 : 1,
    };

    // Get total count with search filter
    const total = await collection.countDocuments(searchQuery);

    // Get paginated, filtered, and sorted assets
    const assets = await collection
      .find(searchQuery)
      .sort(sortObject)
      .skip(skip)
      .limit(limit)
      .toArray();

    return NextResponse.json({
      assets,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to fetch assets",
      },
      { status: 500 }
    );
  } finally {
    if (client) await client.close();
  }
}

interface Asset {
  _id: ObjectId;
  name: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
}

export async function POST(request: NextRequest) {
  let dbConnection;
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.name || !body.description) {
      return NextResponse.json(
        { error: "Name and description are required" },
        { status: 400 }
      );
    }

    // Get database connection from our connection pool
    dbConnection = await connectToDatabase();
    const db = dbConnection.db;

    // Get typed collection
    const assetsCollection: Collection<Asset> = db.collection("raw");

    // Add timestamp to the document
    const document = {
      ...body,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await assetsCollection.insertOne(document);

    return NextResponse.json({
      message: "Asset created successfully",
      assetId: result.insertedId,
    });
  } catch (error) {
    console.error("Error creating asset:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to create asset",
      },
      { status: 500 }
    );
  }
}
