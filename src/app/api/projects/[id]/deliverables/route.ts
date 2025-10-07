import { NextRequest, NextResponse } from "next/server";
import {
  verifyAuthMiddleware,
  getUserIdFromToken,
  verifyFirebaseToken,
  getUserEmailFromToken,
} from "@/lib/firebase-auth-middleware";
import { dbConnect } from "@/lib/mongodb";
import { Project } from "@/models/Project";
import { Deliverable } from "@/models/Deliverable";
import { ObjectId } from "mongodb";

/**
 * GET project deliverables
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("🔒 GET /api/projects/[id]/deliverables: Starting request");

  // Check authentication
  const authResult = await verifyAuthMiddleware(request);
  if (authResult) {
    console.log(
      "❌ GET /api/projects/[id]/deliverables: Authentication failed"
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

    const { id } = await params;
    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("📋 Project ID:", id);

    await dbConnect();

    const project = await Project.findById(id);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Check if user has access to this project
    const isMember = project.members.some(
      (member: any) => member.userId === userId
    );
    if (!isMember && project.ownerId !== userId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("📦 Project deliverable IDs:", project.deliverableIds);

    // Fetch actual deliverables from the deliverables collection
    const deliverableObjectIds = (project.deliverableIds || [])
      .filter((id: any) => id)
      .map((id: any) => (id instanceof ObjectId ? id : new ObjectId(id)));

    const deliverables = await Deliverable.find({
      _id: { $in: deliverableObjectIds },
    });

    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("✅ Found deliverables:", deliverables.length);

    return NextResponse.json({
      deliverables: deliverables.map((d) => d.toPublicJSON()),
      total: deliverables.length,
    });
  } catch (error) {
    console.error("💥 Error fetching deliverables:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST - Add new deliverable to project
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log(
    "🚀 POST /api/projects/[id]/deliverables - Creating new deliverable"
  );

  try {
    // Check authentication
    const authResult = await verifyAuthMiddleware(request);
    if (authResult) {
      console.log(
        "❌ POST /api/projects/[id]/deliverables: Authentication failed"
      );
      return authResult;
    }

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
    console.log("🔐 Authentication check:", {
      hasToken: !!token,
      userId: userId,
      tokenType: tokenData.tokenType,
    });

    const { id } = await params;
    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("📋 Project ID from params:", id);

    await dbConnect();

    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("🔗 Connecting to database...");
    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("✅ Database connected successfully");

    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("🔍 Finding project with ID:", id);
    const project = await Project.findById(id);

    if (!project) {
      // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("❌ Project not found with ID:", id);
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    console.log("✅ Project found:", {
      projectId: project._id,
      projectTitle: project.title,
      ownerId: project.ownerId,
      membersCount: project.members?.length || 0,
      currentDeliverableIds: project.deliverableIds?.length || 0,
    });

    const body = await request.json();
    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("📝 Request body received:", JSON.stringify(body, null, 2));

    // Check if this is a request to link an existing deliverable
    if (body.linkExisting && body.deliverableId) {
      // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("🔗 Linking existing deliverable:", body.deliverableId);

      // Validate that the deliverable exists
      const existingDeliverable = await Deliverable.findById(
        body.deliverableId
      );
      if (!existingDeliverable) {
        // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("❌ Deliverable not found:", body.deliverableId);
        return NextResponse.json(
          { error: "Deliverable not found" },
          { status: 404 }
        );
      }

      // Check if deliverable is already linked to this project (handle string/ObjectId)
      const exists = (project.deliverableIds || []).some((id: any) => {
        const idStr = id instanceof ObjectId ? id.toString() : id;
        return idStr === body.deliverableId;
      });
      if (exists) {
        // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("❌ Deliverable already linked to project");
        return NextResponse.json(
          { error: "Deliverable is already linked to this project" },
          { status: 400 }
        );
      }

      // Add deliverable ID to project's deliverableIds array as ObjectId
      project.deliverableIds.push(new ObjectId(body.deliverableId) as any);
      project.updatedAt = new Date();
      await project.save();

      // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("✅ Existing deliverable linked to project successfully");
      return NextResponse.json({
        message: "Deliverable linked to project successfully",
        deliverable: existingDeliverable.toPublicJSON(),
      });
    }

    // Handle creating new deliverable
    const {
      title,
      description,
      type,
      platform_id,
      duration,
      aspect_ratio,
      edit_deadline,
      release_date,
      assigned_to,
      car_id,
      scheduled,
      gallery_ids,
      caption_ids,
    } = body;

    // Create new deliverable
    const deliverable = new Deliverable({
      title,
      description,
      type,
      platform_id,
      duration,
      aspect_ratio,
      edit_deadline,
      release_date,
      firebase_uid: assigned_to || userId,
      editor: assigned_to || userId,
      car_id,
      scheduled,
      gallery_ids,
      caption_ids,
    });

    await deliverable.save();

    // Add deliverable ID to project's deliverableIds array (store as ObjectId)
    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("📌 Adding deliverable ID to project...");
    if (!project.deliverableIds) {
      project.deliverableIds = [];
    }
    project.deliverableIds.push(deliverable._id as any);
    project.updatedAt = new Date();

    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("💾 Saving project with new deliverable ID...");
    const savedProject = await project.save();
    console.log("✅ Project updated successfully:", {
      projectId: savedProject._id,
      deliverableIdsCount: savedProject.deliverableIds?.length || 0,
      lastUpdated: savedProject.updatedAt,
    });

    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("🎉 Deliverable creation completed successfully");
    return NextResponse.json({
      message: "Deliverable added successfully",
      deliverable: deliverable.toPublicJSON(),
    });
  } catch (err) {
    const error = err as any;
    console.error("💥 Error adding deliverable:", error);
    console.error("📊 Error details:", {
      name: error?.name || "Unknown",
      message: error?.message || "Unknown error",
      stack: error?.stack || "No stack trace",
    });

    // Improved error handling for Mongoose validation errors
    if (error && error.name === "ValidationError") {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Remove deliverable from project
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log(
    "🗑️ DELETE /api/projects/[id]/deliverables - Removing deliverable"
  );

  try {
    // Check authentication
    const authResult = await verifyAuthMiddleware(request);
    if (authResult) {
      console.log(
        "❌ DELETE /api/projects/[id]/deliverables: Authentication failed"
      );
      return authResult;
    }

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

    const { id } = await params;
    const body = await request.json();
    const { deliverableId } = body;

    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("🗑️ Removing deliverable:", deliverableId);

    if (!deliverableId) {
      return NextResponse.json(
        { error: "Deliverable ID is required" },
        { status: 400 }
      );
    }

    await dbConnect();

    const project = await Project.findById(id);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Check permissions (manager or owner can remove deliverables)
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

    // Remove deliverable ID from project's deliverableIds array
    if (!project.deliverableIds) {
      return NextResponse.json(
        { error: "Deliverable not found in project" },
        { status: 404 }
      );
    }

    const initialLength = project.deliverableIds.length;
    project.deliverableIds = project.deliverableIds.filter((id: any) => {
      const idStr = id instanceof ObjectId ? id.toString() : id;
      return idStr !== deliverableId;
    });

    if (project.deliverableIds.length === initialLength) {
      return NextResponse.json(
        { error: "Deliverable not found in project" },
        { status: 404 }
      );
    }

    project.updatedAt = new Date();
    await project.save();

    // Optionally delete the actual deliverable (or just unlink it)
    // For now, we'll just unlink it from the project
    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("✅ Deliverable unlinked from project");

    return NextResponse.json({
      message: "Deliverable removed from project successfully",
    });
  } catch (error) {
    console.error("💥 Error removing deliverable:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
