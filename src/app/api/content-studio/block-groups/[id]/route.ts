import { NextRequest, NextResponse } from "next/server";
import { verifyAuthMiddleware } from "@/lib/firebase-auth-middleware";
import { verifyFirebaseToken } from "@/lib/firebase-auth-middleware";
import { getDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

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

    // Validate block group ID
    const resolvedParams = await params;
    if (!ObjectId.isValid(resolvedParams.id)) {
      return NextResponse.json(
        { error: "Invalid block group ID" },
        { status: 400 }
      );
    }

    // Delete the block group (only if user owns it)
    const result = await db.collection("content_block_groups").deleteOne({
      _id: new ObjectId(resolvedParams.id),
      "metadata.createdBy": userId,
    });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: "Block group not found or access denied" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Block group deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting block group:", error);
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

    // Validate block group ID
    const resolvedParams = await params;
    if (!ObjectId.isValid(resolvedParams.id)) {
      return NextResponse.json(
        { error: "Invalid block group ID" },
        { status: 400 }
      );
    }

    // Update the block group (only if user owns it)
    const result = await db.collection("content_block_groups").updateOne(
      {
        _id: new ObjectId(resolvedParams.id),
        "metadata.createdBy": userId,
      },
      {
        $set: {
          name,
          description: description || "",
          blocks,
          metadata: {
            ...metadata,
            updatedAt: new Date(),
            // Preserve original metadata
            createdAt: metadata?.createdAt || new Date(),
            createdBy: userId,
            usageCount: metadata?.usageCount || 0,
          },
        },
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: "Block group not found or access denied" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Block group updated successfully",
    });
  } catch (error) {
    console.error("Error updating block group:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH endpoint for incrementing usage count
export async function PATCH(
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

    // Validate block group ID
    const resolvedParams = await params;
    if (!ObjectId.isValid(resolvedParams.id)) {
      return NextResponse.json(
        { error: "Invalid block group ID" },
        { status: 400 }
      );
    }

    // Increment usage count (only if user owns it)
    const result = await db.collection("content_block_groups").updateOne(
      {
        _id: new ObjectId(resolvedParams.id),
        "metadata.createdBy": userId,
      },
      {
        $inc: { "metadata.usageCount": 1 },
        $set: { "metadata.lastUsedAt": new Date() },
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: "Block group not found or access denied" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Usage count updated",
    });
  } catch (error) {
    console.error("Error updating usage count:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
