import { NextRequest, NextResponse } from "next/server";
import { getOpenAIClient } from "@/lib/openai";
import { getDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import {
  verifyAuthMiddleware,
  verifyFirebaseToken,
  getUserIdFromToken,
} from "@/lib/firebase-auth-middleware";

export const runtime = "nodejs";

// GET single file details
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const authResult = await verifyAuthMiddleware(req);
    if (authResult) {
      return authResult;
    }

    // Get user ID from Firebase token
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Missing authorization token" },
        { status: 401 }
      );
    }

    const token = authHeader.split("Bearer ")[1];
    const tokenData = await verifyFirebaseToken(token);

    if (!tokenData) {
      return NextResponse.json(
        { error: "Invalid authentication token" },
        { status: 401 }
      );
    }

    const userId = getUserIdFromToken(tokenData);
    const fileId = params.id;

    if (!ObjectId.isValid(fileId)) {
      return NextResponse.json(
        { error: "Invalid file ID format" },
        { status: 400 }
      );
    }

    const db = await getDatabase();

    // Find file and verify ownership
    const file = await db.collection("ai_files").findOne({
      _id: new ObjectId(fileId),
      uploadedBy: userId,
      status: { $ne: "deleted" },
    });

    if (!file) {
      return NextResponse.json(
        { error: "File not found or access denied" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      file: {
        id: file._id.toString(),
        openaiFileId: file.openaiFileId,
        filename: file.filename,
        originalName: file.originalName,
        size: file.size,
        mimeType: file.mimeType,
        description: file.metadata?.description || "",
        category: file.metadata?.category || "general",
        tags: file.metadata?.tags || [],
        associatedWith: file.associatedWith,
        status: file.status,
        createdAt: file.createdAt,
        updatedAt: file.updatedAt,
      },
    });
  } catch (error) {
    console.error("File get error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}

// PATCH update file metadata
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const authResult = await verifyAuthMiddleware(req);
    if (authResult) {
      return authResult;
    }

    // Get user ID from Firebase token
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Missing authorization token" },
        { status: 401 }
      );
    }

    const token = authHeader.split("Bearer ")[1];
    const tokenData = await verifyFirebaseToken(token);

    if (!tokenData) {
      return NextResponse.json(
        { error: "Invalid authentication token" },
        { status: 401 }
      );
    }

    const userId = getUserIdFromToken(tokenData);
    const fileId = params.id;

    if (!ObjectId.isValid(fileId)) {
      return NextResponse.json(
        { error: "Invalid file ID format" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { description, category, tags, originalName } = body;

    const db = await getDatabase();

    // Verify file exists and user owns it
    const existingFile = await db.collection("ai_files").findOne({
      _id: new ObjectId(fileId),
      uploadedBy: userId,
      status: { $ne: "deleted" },
    });

    if (!existingFile) {
      return NextResponse.json(
        { error: "File not found or access denied" },
        { status: 404 }
      );
    }

    // Build update object
    const updateFields: any = {
      updatedAt: new Date(),
    };

    // Update metadata fields if provided
    if (description !== undefined) {
      updateFields["metadata.description"] = description;
    }
    if (category !== undefined) {
      updateFields["metadata.category"] = category;
    }
    if (tags !== undefined && Array.isArray(tags)) {
      updateFields["metadata.tags"] = tags;
    }
    if (originalName !== undefined) {
      updateFields.originalName = originalName;
    }

    // Update file in database
    const result = await db
      .collection("ai_files")
      .updateOne({ _id: new ObjectId(fileId) }, { $set: updateFields });

    if (result.modifiedCount === 0) {
      return NextResponse.json(
        { error: "No changes were made" },
        { status: 400 }
      );
    }

    // Get updated file
    const updatedFile = await db.collection("ai_files").findOne({
      _id: new ObjectId(fileId),
    });

    return NextResponse.json({
      success: true,
      message: "File updated successfully",
      file: {
        id: updatedFile!._id.toString(),
        openaiFileId: updatedFile!.openaiFileId,
        filename: updatedFile!.filename,
        originalName: updatedFile!.originalName,
        size: updatedFile!.size,
        mimeType: updatedFile!.mimeType,
        description: updatedFile!.metadata?.description || "",
        category: updatedFile!.metadata?.category || "general",
        tags: updatedFile!.metadata?.tags || [],
        associatedWith: updatedFile!.associatedWith,
        status: updatedFile!.status,
        createdAt: updatedFile!.createdAt,
        updatedAt: updatedFile!.updatedAt,
      },
    });
  } catch (error) {
    console.error("File update error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}

// DELETE file (soft delete in database, hard delete from OpenAI)
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const authResult = await verifyAuthMiddleware(req);
    if (authResult) {
      return authResult;
    }

    // Get user ID from Firebase token
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Missing authorization token" },
        { status: 401 }
      );
    }

    const token = authHeader.split("Bearer ")[1];
    const tokenData = await verifyFirebaseToken(token);

    if (!tokenData) {
      return NextResponse.json(
        { error: "Invalid authentication token" },
        { status: 401 }
      );
    }

    const userId = getUserIdFromToken(tokenData);
    const fileId = params.id;

    if (!ObjectId.isValid(fileId)) {
      return NextResponse.json(
        { error: "Invalid file ID format" },
        { status: 400 }
      );
    }

    const db = await getDatabase();

    // Find file and verify ownership
    const file = await db.collection("ai_files").findOne({
      _id: new ObjectId(fileId),
      uploadedBy: userId,
      status: { $ne: "deleted" },
    });

    if (!file) {
      return NextResponse.json(
        { error: "File not found or access denied" },
        { status: 404 }
      );
    }

    const openai = getOpenAIClient();

    try {
      // Delete file from OpenAI (if it exists)
      if (file.openaiFileId) {
        try {
          await openai.files.del(file.openaiFileId);
          console.log(`Deleted OpenAI file: ${file.openaiFileId}`);
        } catch (openaiError: any) {
          // If file doesn't exist on OpenAI, that's fine - continue with database deletion
          if (openaiError.status !== 404) {
            console.error("OpenAI file deletion error:", openaiError);
            // Don't fail the whole operation for OpenAI errors
          }
        }
      }

      // Soft delete in database (mark as deleted)
      await db.collection("ai_files").updateOne(
        { _id: new ObjectId(fileId) },
        {
          $set: {
            status: "deleted",
            updatedAt: new Date(),
          },
        }
      );

      return NextResponse.json({
        success: true,
        message: "File deleted successfully",
      });
    } catch (error) {
      console.error("File deletion error:", error);
      return NextResponse.json(
        { error: "Failed to delete file completely" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("File delete error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
