import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { MediaType, IMediaType } from "@/models/MediaType";
import { verifyAuthMiddleware } from "@/lib/firebase-auth-middleware";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuthMiddleware(request);
    if (authResult) {
      return authResult;
    }

    const db = await getDatabase();
    if (!db) {
      console.error("Failed to get database instance");
      return NextResponse.json(
        { error: "Failed to connect to database" },
        { status: 500 }
      );
    }

    // Get active media types sorted by sortOrder
    const mediaTypes = await db
      .collection<IMediaType>("media_types")
      .find({ isActive: true })
      .sort({ sortOrder: 1, name: 1 })
      .toArray();

    return NextResponse.json({
      mediaTypes,
      count: mediaTypes.length,
    });
  } catch (error) {
    console.error("Error fetching media types:", error);
    return NextResponse.json(
      { error: "Failed to fetch media types" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication with admin role requirement
    const authResult = await verifyAuthMiddleware(request, ["admin"]);
    if (authResult) {
      return authResult;
    }

    const body = await request.json();
    const { name, description, sortOrder = 0 } = body;

    // Validate required fields
    if (!name || typeof name !== "string" || name.trim() === "") {
      return NextResponse.json(
        { error: "Name is required and must be a valid string" },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    if (!db) {
      console.error("Failed to get database instance");
      return NextResponse.json(
        { error: "Failed to connect to database" },
        { status: 500 }
      );
    }

    // Check if media type with same name already exists
    const existingMediaType = await db
      .collection("media_types")
      .findOne({ name: name.trim() });

    if (existingMediaType) {
      return NextResponse.json(
        { error: "Media type with this name already exists" },
        { status: 409 }
      );
    }

    // Create new media type
    const newMediaType = new MediaType({
      name: name.trim(),
      description: description?.trim() || "",
      sortOrder: typeof sortOrder === "number" ? sortOrder : 0,
      isActive: true,
    });

    const savedMediaType = await newMediaType.save();

    return NextResponse.json(
      {
        message: "Media type created successfully",
        mediaType: savedMediaType,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error creating media type:", error);

    // Handle duplicate key error
    if (error.code === 11000) {
      return NextResponse.json(
        { error: "Media type with this name already exists" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create media type" },
      { status: 500 }
    );
  }
}
