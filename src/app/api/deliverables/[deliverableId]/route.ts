import { NextRequest, NextResponse } from "next/server";
import {
  verifyAuthMiddleware,
  getUserIdFromToken,
  verifyFirebaseToken,
} from "@/lib/firebase-auth-middleware";
import { dbConnect } from "@/lib/mongodb";
import { Deliverable } from "@/models/Deliverable";
import { ObjectId } from "mongodb";

export const dynamic = "force-dynamic";

/**
 * GET - Fetch individual deliverable
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ deliverableId: string }> }
) {
  // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("🔒 GET /api/deliverables/[deliverableId]: Starting request");

  // Check authentication
  const authResult = await verifyAuthMiddleware(request);
  if (authResult) {
    console.log(
      "❌ GET /api/deliverables/[deliverableId]: Authentication failed"
    );
    return authResult;
  }

  try {
    const { deliverableId } = await params;

    // Validate ID format
    if (!ObjectId.isValid(deliverableId)) {
      return NextResponse.json(
        { error: "Invalid deliverable ID format" },
        { status: 400 }
      );
    }

    await dbConnect();

    const deliverable = await Deliverable.findById(deliverableId);

    if (!deliverable) {
      return NextResponse.json(
        { error: "Deliverable not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      deliverable: deliverable.toPublicJSON(),
    });
  } catch (error) {
    console.error("Error fetching deliverable:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PUT - Update individual deliverable
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ deliverableId: string }> }
) {
  // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("🎯🎯🎯 NEW CENTRALIZED ENDPOINT HIT! 🎯🎯🎯");
  console.log(
    "🔒 PUT /api/deliverables/[deliverableId]: Starting request [NEW CENTRALIZED ENDPOINT]"
  );
  // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("🔍 REQUEST URL:", request.url);
  // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("🔍 REQUEST METHOD:", request.method);

  // Check authentication
  const authResult = await verifyAuthMiddleware(request);
  if (authResult) {
    console.log(
      "❌ PUT /api/deliverables/[deliverableId]: Authentication failed"
    );
    return authResult;
  }

  try {
    // Get token data and extract user ID
    const authHeader = request.headers.get("authorization") || "";
    const token = authHeader.split("Bearer ")[1];
    const tokenData = await verifyFirebaseToken(token);

    if (!tokenData) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const userId = getUserIdFromToken(tokenData);
    const { deliverableId } = await params;
    const body = await request.json();

    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("🔍 REQUEST BODY:", JSON.stringify(body, null, 2));
    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("🔍 CAR_ID IN BODY:", body.carId);
    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("🔍 CAR_ID TYPE:", typeof body.carId);
    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("🔍 CAR_ID === undefined:", body.carId === undefined);
    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("🔍 CAR_ID === null:", body.carId === null);
    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("🔍 CAR_ID === '':", body.carId === "");
    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("🔍 'carId' in body:", "carId" in body);

    // Validate ID format
    if (!ObjectId.isValid(deliverableId)) {
      return NextResponse.json(
        { error: "Invalid deliverable ID format" },
        { status: 400 }
      );
    }

    await dbConnect();

    // Check if deliverable exists
    const existingDeliverable = await Deliverable.findById(deliverableId);
    if (!existingDeliverable) {
      return NextResponse.json(
        { error: "Deliverable not found" },
        { status: 404 }
      );
    }

    // Update the deliverable
    const updateData: any = {
      updated_at: new Date(),
    };

    // Handle calendar-specific updates (edit_deadline, release_date)
    if (body.edit_deadline) {
      updateData.edit_deadline = new Date(body.edit_deadline);
    }
    if (body.release_date) {
      updateData.release_date = new Date(body.release_date);
    }
    // Handle frontend camelCase field names
    if (body.editDeadline) {
      updateData.edit_deadline = new Date(body.editDeadline);
    }
    if (body.releaseDate) {
      updateData.release_date = new Date(body.releaseDate);
    }

    // Handle car association updates - CRITICAL FIX
    if ("carId" in body) {
      // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log(`🚗 Car association update: carId=${body.carId}`);
      if (
        body.carId === undefined ||
        body.carId === null ||
        body.carId === ""
      ) {
        updateData.car_id = null; // Explicitly remove car association
        // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log(`🚗 Removing car association: setting car_id to null`);
      } else {
        updateData.car_id = body.carId; // Set car association
        // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log(`🚗 Setting car association: car_id=${body.carId}`);
      }
    }

    // Handle other field updates
    if (body.title) updateData.title = body.title.trim();
    if (body.description !== undefined)
      updateData.description = body.description?.trim();
    if (body.status) updateData.status = body.status;
    if (body.type) updateData.type = body.type;
    if (body.mediaTypeId !== undefined) {
      // Handle mediaTypeId updates (ObjectId conversion)
      if (body.mediaTypeId === null || body.mediaTypeId === "") {
        updateData.mediaTypeId = null;
      } else {
        updateData.mediaTypeId = new ObjectId(body.mediaTypeId);
      }
    }

    // Handle platform updates - NEW SINGLE PLATFORM APPROACH
    if (body.platform_id !== undefined) {
      if (body.platform_id === null || body.platform_id === "") {
        updateData.platform_id = null;
      } else {
        updateData.platform_id = new ObjectId(body.platform_id);
      }
    }

    // Keep backward compatibility with legacy platform fields
    if (body.platform) updateData.platform = body.platform;
    if (body.platforms) updateData.platforms = body.platforms;

    if (body.duration !== undefined) updateData.duration = body.duration;
    if (body.aspectRatio) updateData.aspect_ratio = body.aspectRatio;
    if (body.aspect_ratio) updateData.aspect_ratio = body.aspect_ratio;
    if (body.scheduled !== undefined) updateData.scheduled = body.scheduled;
    if (body.firebase_uid !== undefined)
      updateData.firebase_uid = body.firebase_uid;
    if (body.assignedTo !== undefined)
      updateData.firebase_uid = body.assignedTo;
    if (body.editor !== undefined) updateData.editor = body.editor;
    if (body.target_audience !== undefined)
      updateData.target_audience = body.target_audience;
    if (body.music_track !== undefined)
      updateData.music_track = body.music_track;
    if (body.dropbox_link !== undefined)
      updateData.dropbox_link = body.dropbox_link;
    if (body.social_media_link !== undefined)
      updateData.social_media_link = body.social_media_link;
    if (body.primaryImageId !== undefined)
      updateData.primaryImageId = body.primaryImageId;
    if (body.thumbnailUrl !== undefined)
      updateData.thumbnailUrl = body.thumbnailUrl;

    // Handle content references (galleries and captions)
    if (body.gallery_ids !== undefined)
      updateData.gallery_ids = body.gallery_ids;
    if (body.caption_ids !== undefined)
      updateData.caption_ids = body.caption_ids;

    console.log(
      `📝 Final updateData for deliverable ${deliverableId}:`,
      updateData
    );

    const updatedDeliverable = await Deliverable.findByIdAndUpdate(
      deliverableId,
      { $set: updateData },
      { new: true }
    );

    if (!updatedDeliverable) {
      return NextResponse.json(
        { error: "Deliverable not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: "Deliverable updated successfully",
      deliverable: updatedDeliverable.toPublicJSON(),
      success: true, // For compatibility with existing frontend code
    });
  } catch (error) {
    console.error("Error updating deliverable:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Remove individual deliverable
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ deliverableId: string }> }
) {
  // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("🔒 DELETE /api/deliverables/[deliverableId]: Starting request");

  // Check authentication
  const authResult = await verifyAuthMiddleware(request);
  if (authResult) {
    console.log(
      "❌ DELETE /api/deliverables/[deliverableId]: Authentication failed"
    );
    return authResult;
  }

  try {
    // Get token data and extract user ID
    const authHeader = request.headers.get("authorization") || "";
    const token = authHeader.split("Bearer ")[1];
    const tokenData = await verifyFirebaseToken(token);

    if (!tokenData) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const userId = getUserIdFromToken(tokenData);
    const { deliverableId } = await params;

    // Validate ID format
    if (!ObjectId.isValid(deliverableId)) {
      return NextResponse.json(
        { error: "Invalid deliverable ID format" },
        { status: 400 }
      );
    }

    await dbConnect();

    // Check if deliverable exists
    const existingDeliverable = await Deliverable.findById(deliverableId);
    if (!existingDeliverable) {
      return NextResponse.json(
        { error: "Deliverable not found" },
        { status: 404 }
      );
    }

    // Delete the deliverable
    await Deliverable.findByIdAndDelete(deliverableId);

    return NextResponse.json({
      message: "Deliverable deleted successfully",
      success: true,
    });
  } catch (error) {
    console.error("Error deleting deliverable:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Methods": "GET, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
