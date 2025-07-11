import { NextRequest, NextResponse } from "next/server";
import { verifyAuthMiddleware } from "@/lib/firebase-auth-middleware";
import { verifyFirebaseToken } from "@/lib/firebase-auth-middleware";
import { getDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    // Validate composition ID
    const resolvedParams = await params;
    if (!ObjectId.isValid(resolvedParams.id)) {
      return NextResponse.json(
        { error: "Invalid composition ID" },
        { status: 400 }
      );
    }

    // Find the composition (only if user owns it)
    const composition = await db.collection("content_compositions").findOne({
      _id: new ObjectId(resolvedParams.id),
      "metadata.createdBy": userId,
    });

    if (!composition) {
      return NextResponse.json(
        { error: "Composition not found or access denied" },
        { status: 404 }
      );
    }

    return NextResponse.json(composition);
  } catch (error) {
    console.error("Error fetching composition:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    // Validate composition ID
    const resolvedParams = await params;
    if (!ObjectId.isValid(resolvedParams.id)) {
      return NextResponse.json(
        { error: "Invalid composition ID" },
        { status: 400 }
      );
    }

    // Delete the composition (only if user owns it)
    const result = await db.collection("content_compositions").deleteOne({
      _id: new ObjectId(resolvedParams.id),
      "metadata.createdBy": userId,
    });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: "Composition not found or access denied" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Composition deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting composition:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log("🚨 PUT ROUTE CALLED - THIS SHOULD APPEAR IN CONSOLE");
  console.log("📍 PUT Route - Request method:", request.method);
  console.log("📍 PUT Route - Request URL:", request.url);
  console.log(
    "📍 PUT Route - Request headers:",
    Object.fromEntries(request.headers.entries())
  );

  try {
    // Check authentication
    console.log("🔐 PUT Route - Starting authentication check...");
    const authResult = await verifyAuthMiddleware(request);
    if (authResult) {
      console.log("❌ PUT Route - Authentication failed");
      return authResult;
    }
    console.log("✅ PUT Route - Authentication passed");

    // Parse request body
    console.log("📦 PUT Route - Parsing request body...");
    const body = await request.json();
    const { name, type, blocks, template, metadata } = body;

    console.log("📦 PUT Route - Request body parsed:", {
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
        "❌ PUT Route - Validation failed - missing required fields:",
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
    console.log("✅ PUT Route - Required fields validation passed");

    // Connect to database
    console.log("🔄 PUT Route - Connecting to database...");
    const db = await getDatabase();
    if (!db) {
      console.log("❌ PUT Route - Database connection failed");
      return NextResponse.json(
        { error: "Failed to connect to database" },
        { status: 500 }
      );
    }
    console.log("✅ PUT Route - Database connection established");

    // Get user ID from the verified token
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.split("Bearer ")[1];
    const tokenData = await verifyFirebaseToken(token!);

    if (!tokenData) {
      console.log("❌ PUT Route - Token verification failed");
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const userId =
      tokenData.tokenType === "api_token" ? tokenData.userId : tokenData.uid;

    console.log("✅ PUT Route - User ID extracted:", {
      userId,
      tokenType: tokenData.tokenType,
    });

    // Validate composition ID
    const resolvedParams = await params;
    console.log("🔍 PUT Route - Resolving composition ID:", resolvedParams.id);

    if (!ObjectId.isValid(resolvedParams.id)) {
      console.log("❌ PUT Route - Invalid composition ID:", resolvedParams.id);
      return NextResponse.json(
        { error: "Invalid composition ID" },
        { status: 400 }
      );
    }
    console.log("✅ PUT Route - Composition ID is valid");

    // Update the composition (only if user owns it)
    const updateData = {
      name,
      type,
      blocks,
      template,
      metadata: {
        ...metadata,
        updatedAt: new Date(),
        // Preserve original metadata
        createdAt: metadata?.createdAt || new Date(),
        createdBy: userId,
      },
    };

    console.log("🔄 PUT Route - Preparing to update composition:", {
      compositionId: resolvedParams.id,
      userId,
      updateDataSize: JSON.stringify(updateData).length,
      blocksCount: updateData.blocks.length,
    });

    const result = await db.collection("content_compositions").updateOne(
      {
        _id: new ObjectId(resolvedParams.id),
        "metadata.createdBy": userId,
      },
      {
        $set: updateData,
      }
    );

    console.log("📊 PUT Route - Database update result:", {
      acknowledged: result.acknowledged,
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
      upsertedCount: result.upsertedCount,
    });

    if (result.matchedCount === 0) {
      console.log("❌ PUT Route - No composition found or access denied");
      return NextResponse.json(
        { error: "Composition not found or access denied" },
        { status: 404 }
      );
    }

    console.log("🎉 PUT Route - Composition updated successfully");
    return NextResponse.json({
      success: true,
      message: "Composition updated successfully",
    });
  } catch (error) {
    console.error("❌ PUT Route - Error updating composition:", {
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

export async function OPTIONS(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log("🚨 OPTIONS ROUTE CALLED - CORS Preflight Request");
  console.log("📍 OPTIONS Route - Request method:", request.method);
  console.log("📍 OPTIONS Route - Request URL:", request.url);
  console.log(
    "📍 OPTIONS Route - Request headers:",
    Object.fromEntries(request.headers.entries())
  );

  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Max-Age": "86400",
    },
  });
}
