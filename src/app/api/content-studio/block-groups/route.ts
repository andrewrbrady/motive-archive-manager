import { NextRequest, NextResponse } from "next/server";
import { verifyAuthMiddleware } from "@/lib/firebase-auth-middleware";
import { verifyFirebaseToken } from "@/lib/firebase-auth-middleware";
import { getDatabase } from "@/lib/mongodb";

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const authResult = await verifyAuthMiddleware(request);
    if (authResult) {
      return authResult;
    }

    // Parse request body
    const body = await request.json();
    const { name, description, blocks, metadata } = body;

    // Validate required fields
    if (!name || !blocks || blocks.length === 0) {
      return NextResponse.json(
        { error: "Missing required fields: name, blocks" },
        { status: 400 }
      );
    }

    // Connect to database
    const db = await getDatabase();
    if (!db) {
      return NextResponse.json(
        { error: "Failed to connect to database" },
        { status: 500 }
      );
    }

    // Get user ID from the verified token
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.split("Bearer ")[1];
    const tokenData = await verifyFirebaseToken(token!);

    if (!tokenData) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const userId =
      tokenData.tokenType === "api_token" ? tokenData.userId : tokenData.uid;

    // Create block group document
    const blockGroup = {
      name,
      description: description || "",
      blocks,
      metadata: {
        ...metadata,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: userId,
        usageCount: 0,
      },
    };

    // Insert into database
    const result = await db
      .collection("content_block_groups")
      .insertOne(blockGroup);

    return NextResponse.json({
      success: true,
      id: result.insertedId,
      message: "Block group saved successfully",
    });
  } catch (error) {
    console.error("Error saving block group:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const authResult = await verifyAuthMiddleware(request);
    if (authResult) {
      return authResult;
    }

    // Connect to database
    const db = await getDatabase();
    if (!db) {
      return NextResponse.json(
        { error: "Failed to connect to database" },
        { status: 500 }
      );
    }

    // Get user ID from the verified token
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.split("Bearer ")[1];
    const tokenData = await verifyFirebaseToken(token!);

    if (!tokenData) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const userId =
      tokenData.tokenType === "api_token" ? tokenData.userId : tokenData.uid;

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const search = searchParams.get("search");

    // Build query
    const query: any = {
      "metadata.createdBy": userId,
    };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    // Get block groups with pagination
    const blockGroups = await db
      .collection("content_block_groups")
      .find(query)
      .sort({ "metadata.updatedAt": -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray();

    // Get total count
    const total = await db
      .collection("content_block_groups")
      .countDocuments(query);

    return NextResponse.json({
      blockGroups,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching block groups:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
