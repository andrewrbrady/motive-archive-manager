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

export async function POST(req: NextRequest) {
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

    // Extract user ID from the token
    const token = authHeader.split("Bearer ")[1];
    const tokenData = await verifyFirebaseToken(token);

    if (!tokenData) {
      return NextResponse.json(
        { error: "Invalid authentication token" },
        { status: 401 }
      );
    }

    const userId = getUserIdFromToken(tokenData);

    // Parse form data
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const entityType = formData.get("entityType") as string;
    const entityId = formData.get("entityId") as string;
    const description = (formData.get("description") as string) || "";
    const category = (formData.get("category") as string) || "general";

    if (!file || !entityType || !entityId) {
      return NextResponse.json(
        { error: "Missing required fields: file, entityType, entityId" },
        { status: 400 }
      );
    }

    if (!["car", "project"].includes(entityType)) {
      return NextResponse.json(
        { error: 'Invalid entityType. Must be "car" or "project"' },
        { status: 400 }
      );
    }

    // Validate entity exists
    const db = await getDatabase();
    const entityCollection = entityType === "car" ? "cars" : "projects";
    const entity = await db.collection(entityCollection).findOne({
      _id: new ObjectId(entityId),
    });

    if (!entity) {
      return NextResponse.json(
        { error: `${entityType} not found` },
        { status: 404 }
      );
    }

    // Get OpenAI client
    const openai = getOpenAIClient();

    try {
      // Upload file to OpenAI
      const uploadedFile = await openai.files.create({
        file: file,
        purpose: "assistants",
      });

      // Save file record to database
      const aiFileRecord = {
        openaiFileId: uploadedFile.id,
        filename: uploadedFile.filename,
        originalName: file.name,
        purpose: "assistants" as const,
        size: file.size,
        mimeType: file.type,
        uploadedBy: userId,
        associatedWith: {
          type: entityType,
          carIds: entityType === "car" ? [new ObjectId(entityId)] : [],
          projectIds: entityType === "project" ? [new ObjectId(entityId)] : [],
        },
        metadata: {
          description,
          category,
          tags: [],
        },
        status: "processed" as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await db.collection("ai_files").insertOne(aiFileRecord);

      return NextResponse.json({
        success: true,
        fileId: uploadedFile.id,
        recordId: result.insertedId.toString(),
        filename: file.name,
        size: file.size,
        message: "File uploaded successfully",
      });
    } catch (openaiError) {
      console.error("OpenAI file upload error:", openaiError);
      return NextResponse.json(
        { error: "Failed to upload file to OpenAI" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("File upload error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}

// GET route to list files for an entity
export async function GET(req: NextRequest) {
  try {
    // Check authentication
    const authResult = await verifyAuthMiddleware(req);
    if (authResult) {
      return authResult;
    }

    const { searchParams } = new URL(req.url);
    const entityType = searchParams.get("entityType");
    const entityId = searchParams.get("entityId");

    if (!entityType || !entityId) {
      return NextResponse.json(
        { error: "Missing required parameters: entityType, entityId" },
        { status: 400 }
      );
    }

    if (!["car", "project"].includes(entityType)) {
      return NextResponse.json(
        { error: 'Invalid entityType. Must be "car" or "project"' },
        { status: 400 }
      );
    }

    const db = await getDatabase();

    // Build query based on entity type
    const query: any = {
      status: { $ne: "deleted" },
    };

    if (entityType === "car") {
      query["associatedWith.carIds"] = new ObjectId(entityId);
    } else {
      query["associatedWith.projectIds"] = new ObjectId(entityId);
    }

    const files = await db
      .collection("ai_files")
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json({
      success: true,
      files: files.map((file) => ({
        id: file._id.toString(),
        openaiFileId: file.openaiFileId,
        filename: file.filename,
        originalName: file.originalName,
        size: file.size,
        mimeType: file.mimeType,
        description: file.metadata?.description || "",
        category: file.metadata?.category || "general",
        createdAt: file.createdAt,
        uploadedBy: file.uploadedBy,
      })),
    });
  } catch (error) {
    console.error("File list error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
