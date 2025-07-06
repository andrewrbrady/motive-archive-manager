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
  try {
    // Check authentication
    const authResult = await verifyAuthMiddleware(request);
    if (authResult) {
      return authResult;
    }

    // Parse request body
    const body = await request.json();
    const { name, type, blocks, template, metadata } = body;

    // Validate required fields
    if (!name || !type || !blocks || blocks.length === 0) {
      return NextResponse.json(
        { error: "Missing required fields: name, type, blocks" },
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

    // Validate composition ID
    const resolvedParams = await params;
    if (!ObjectId.isValid(resolvedParams.id)) {
      return NextResponse.json(
        { error: "Invalid composition ID" },
        { status: 400 }
      );
    }

    // Update the composition (only if user owns it)
    const result = await db.collection("content_compositions").updateOne(
      {
        _id: new ObjectId(resolvedParams.id),
        "metadata.createdBy": userId,
      },
      {
        $set: {
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
        },
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: "Composition not found or access denied" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Composition updated successfully",
    });
  } catch (error) {
    console.error("Error updating composition:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
