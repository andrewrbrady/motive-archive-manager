import { NextRequest, NextResponse } from "next/server";
import {
  verifyAuthMiddleware,
  getUserIdFromToken,
  verifyFirebaseToken,
} from "@/lib/firebase-auth-middleware";
import { connectToDatabase } from "@/lib/mongodb";
import { Project } from "@/models/Project";
import { Deliverable } from "@/models/Deliverable";

export const dynamic = "force-dynamic";

/**
 * PUT - Update individual deliverable
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; deliverableId: string }> }
) {
  console.log("⚠️⚠️⚠️ OLD PROJECT ENDPOINT HIT! ⚠️⚠️⚠️");
  console.log(
    "🔒 PUT /api/projects/[id]/deliverables/[deliverableId]: Starting request [OLD ENDPOINT - SHOULD BE DEPRECATED]"
  );
  console.log("🔍 REQUEST URL:", request.url);
  console.log("🔍 REQUEST METHOD:", request.method);

  // Check authentication
  const authResult = await verifyAuthMiddleware(request);
  if (authResult) {
    console.log(
      "❌ PUT /api/projects/[id]/deliverables/[deliverableId]: Authentication failed"
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

    const { id: projectId, deliverableId } = await params;
    const body = await request.json();

    console.log("🔍 REQUEST BODY:", JSON.stringify(body, null, 2));
    console.log("🔍 CAR_ID IN BODY:", body.carId);

    await connectToDatabase();

    // Check if user has access to this project
    const project = await Project.findById(projectId);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Check permissions
    const member = project.members.find((m: any) => m.userId === userId);
    const isOwner = project.ownerId === userId;
    const canManage =
      isOwner || (member && ["owner", "manager"].includes(member.role));

    if (!canManage) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    // Check if deliverable belongs to this project
    if (!project.deliverableIds.includes(deliverableId)) {
      return NextResponse.json(
        { error: "Deliverable not found in project" },
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

    // Handle car association updates - CRITICAL FIX for empty string
    if ("carId" in body) {
      console.log(`🚗 Car association update: carId=${body.carId}`);
      if (
        body.carId === undefined ||
        body.carId === null ||
        body.carId === ""
      ) {
        updateData.car_id = null; // Explicitly remove car association
        console.log(`🚗 Removing car association: setting car_id to null`);
      } else {
        updateData.car_id = body.carId; // Set car association
        console.log(`🚗 Setting car association: car_id=${body.carId}`);
      }
    }

    // Handle other updates
    if (body.title) updateData.title = body.title.trim();
    if (body.description !== undefined)
      updateData.description = body.description?.trim();
    if (body.status) updateData.status = body.status;
    if (body.type) updateData.type = body.type;
    if (body.platform) updateData.platform = body.platform;
    if (body.duration !== undefined) updateData.duration = body.duration;
    if (body.aspectRatio) updateData.aspect_ratio = body.aspectRatio;
    if (body.platforms) updateData.platforms = body.platforms;
    if (body.scheduled !== undefined) updateData.scheduled = body.scheduled;

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
    });
  } catch (error) {
    console.error("Error updating project deliverable:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
