import { NextRequest, NextResponse } from "next/server";
import { verifyAuthMiddleware } from "@/lib/firebase-auth-middleware";
import { verifyFirebaseToken } from "@/lib/firebase-auth-middleware";
import { getDatabase } from "@/lib/mongodb";

export async function POST(request: NextRequest) {
  console.log("🚨 POST ROUTE CALLED - THIS SHOULD APPEAR IN CONSOLE");

  try {
    // Check authentication
    const authResult = await verifyAuthMiddleware(request);
    if (authResult) {
      console.log("❌ [API DEBUG] Authentication failed");
      return authResult;
    }
    console.log("✅ [API DEBUG] Authentication passed");

    // Parse request body
    const body = await request.json();
    const { name, type, blocks, template, metadata } = body;

    console.log("📦 [API DEBUG] Request body parsed:", {
      name,
      type,
      blocksCount: blocks?.length || 0,
      template,
      hasMetadata: !!metadata,
      metadataKeys: metadata ? Object.keys(metadata) : [],
      bodySize: JSON.stringify(body).length,
    });

    // Validate required fields
    if (!name || !type || !blocks || blocks.length === 0) {
      console.log(
        "❌ [API DEBUG] Validation failed - missing required fields:",
        {
          hasName: !!name,
          hasType: !!type,
          hasBlocks: !!blocks,
          blocksLength: blocks?.length || 0,
        }
      );
      return NextResponse.json(
        { error: "Missing required fields: name, type, blocks" },
        { status: 400 }
      );
    }
    console.log("✅ [API DEBUG] Required fields validation passed");

    // Connect to database
    const db = await getDatabase();
    if (!db) {
      console.log("❌ [API DEBUG] Database connection failed");
      return NextResponse.json(
        { error: "Failed to connect to database" },
        { status: 500 }
      );
    }
    console.log("✅ [API DEBUG] Database connection established");

    // Get user ID from the verified token
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.split("Bearer ")[1];
    const tokenData = await verifyFirebaseToken(token!);

    if (!tokenData) {
      console.log("❌ [API DEBUG] Token verification failed");
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const userId =
      tokenData.tokenType === "api_token" ? tokenData.userId : tokenData.uid;

    console.log("✅ [API DEBUG] User ID extracted:", {
      userId,
      tokenType: tokenData.tokenType,
    });

    // Create composition document
    const composition = {
      name,
      type,
      blocks,
      template,
      metadata: {
        ...metadata,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: userId,
      },
    };

    console.log("🔄 [API DEBUG] Creating composition document:", {
      name: composition.name,
      type: composition.type,
      blocksCount: composition.blocks.length,
      template: composition.template,
      userId: composition.metadata.createdBy,
      documentSize: JSON.stringify(composition).length,
    });

    // Insert into database
    const result = await db
      .collection("content_compositions")
      .insertOne(composition);

    console.log("📊 [API DEBUG] Database insert result:", {
      acknowledged: result.acknowledged,
      insertedId: result.insertedId.toString(),
    });

    console.log("🎉 [API DEBUG] Composition created successfully");
    return NextResponse.json(
      {
        success: true,
        id: result.insertedId,
        message: "Composition saved successfully",
      },
      {
        headers: {
          "Cache-Control": "no-cache, no-store, max-age=0, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  } catch (error) {
    console.error("❌ [API DEBUG] Error saving composition:", {
      error: error,
      errorMessage: error instanceof Error ? error.message : "Unknown error",
      errorStack: error instanceof Error ? error.stack : undefined,
    });
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
    const limit = parseInt(searchParams.get("limit") || "10");
    const type = searchParams.get("type");
    const carId = searchParams.get("carId");
    const projectId = searchParams.get("projectId");

    // Build query
    const query: any = {
      "metadata.createdBy": userId,
    };

    if (type) {
      query.type = type;
    }

    if (carId) {
      query["metadata.carId"] = carId;
    }

    if (projectId) {
      query["metadata.projectId"] = projectId;
    }

    // Get compositions with pagination
    const compositions = await db
      .collection("content_compositions")
      .find(query)
      .sort({ "metadata.createdAt": -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray();

    // Get total count
    const total = await db
      .collection("content_compositions")
      .countDocuments(query);

    return NextResponse.json({
      compositions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching compositions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
