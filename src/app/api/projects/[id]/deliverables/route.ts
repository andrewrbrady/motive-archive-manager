import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/mongodb";
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
  console.log(
    "🔍 GET /api/projects/[id]/deliverables - Fetching project deliverables"
  );

  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { id } = await params;
    console.log("📋 Project ID:", id);

    await connectToDatabase();

    const project = await Project.findById(id);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Check if user has access to this project
    const isMember = project.members.some(
      (member: any) => member.userId === session.user.id
    );
    if (!isMember && project.ownerId !== session.user.id) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    console.log("📦 Project deliverable IDs:", project.deliverableIds);

    // Fetch actual deliverables from the deliverables collection
    const deliverables = await Deliverable.find({
      _id: { $in: project.deliverableIds.map((id) => new ObjectId(id)) },
    });

    console.log("✅ Found deliverables:", deliverables.length);

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
    const session = await auth();
    console.log("🔐 Authentication check:", {
      hasSession: !!session,
      userId: session?.user?.id,
      userEmail: session?.user?.email,
    });

    if (!session?.user) {
      console.log("❌ Authentication failed - no session or user");
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { id } = await params;
    console.log("📋 Project ID from params:", id);

    await connectToDatabase();

    console.log("🔗 Connecting to database...");
    await connectToDatabase();
    console.log("✅ Database connected successfully");

    console.log("🔍 Finding project with ID:", id);
    const project = await Project.findById(id);

    if (!project) {
      console.log("❌ Project not found with ID:", id);
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
    console.log("📝 Request body received:", JSON.stringify(body, null, 2));

    // Check if this is a request to link an existing deliverable
    if (body.linkExisting && body.deliverableId) {
      console.log("🔗 Linking existing deliverable:", body.deliverableId);

      // Validate that the deliverable exists
      const existingDeliverable = await Deliverable.findById(
        body.deliverableId
      );
      if (!existingDeliverable) {
        console.log("❌ Deliverable not found:", body.deliverableId);
        return NextResponse.json(
          { error: "Deliverable not found" },
          { status: 404 }
        );
      }

      // Check if deliverable is already linked to this project
      if (project.deliverableIds.includes(body.deliverableId)) {
        console.log("❌ Deliverable already linked to project");
        return NextResponse.json(
          { error: "Deliverable is already linked to this project" },
          { status: 400 }
        );
      }

      // Add deliverable ID to project's deliverableIds array
      project.deliverableIds.push(body.deliverableId);
      project.updatedAt = new Date();
      await project.save();

      console.log("✅ Existing deliverable linked to project successfully");
      return NextResponse.json({
        message: "Deliverable linked to project successfully",
        deliverable: existingDeliverable.toPublicJSON(),
      });
    }

    // Handle creating new deliverable (existing logic)
    const {
      title,
      description,
      type,
      dueDate,
      assignedTo,
      platform,
      duration,
      aspectRatio,
      carId,
    } = body;

    if (!title?.trim()) {
      console.log("❌ Validation failed - title is required");
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    // Check permissions (manager or owner can add deliverables)
    const member = project.members.find(
      (m: any) => m.userId === session.user.id
    );
    const isOwner = project.ownerId === session.user.id;
    const canManage =
      isOwner || (member && ["owner", "manager"].includes(member.role));

    console.log("🔐 Permission check:", {
      userId: session.user.id,
      isOwner,
      memberRole: member?.role || "not a member",
      canManage,
    });

    if (!canManage) {
      console.log("❌ Permission denied - user cannot manage deliverables");
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    // Determine car_id - use provided carId or first car from project (optional)
    let selectedCarId = carId;
    if (!selectedCarId && project.carIds.length > 0) {
      selectedCarId = project.carIds[0];
      console.log("🚗 Using first car from project:", selectedCarId);
    }

    // Create new deliverable in the deliverables collection
    console.log("🏗️ Creating new deliverable in deliverables collection...");
    const deliverableData: any = {
      title: title.trim(),
      description: description?.trim() || "",
      platform: platform || "Other",
      type: type || "Video", // Map to existing deliverable types
      duration: duration || 30,
      aspect_ratio: aspectRatio || "16:9",
      firebase_uid: assignedTo || session.user.id,
      editor: assignedTo ? "Assigned User" : session.user.name || "Unknown",
      status: "not_started",
      edit_dates: [],
      edit_deadline: new Date(dueDate),
      release_date: new Date(dueDate), // Use same date for now
      tags: [],
      created_at: new Date(),
      updated_at: new Date(),
    };

    // Only add car_id if we have a selectedCarId
    if (selectedCarId) {
      deliverableData.car_id = new ObjectId(selectedCarId);
      console.log("🚗 Adding car_id to deliverable:", selectedCarId);
    } else {
      console.log(
        "📝 Creating deliverable without car_id (project-only deliverable)"
      );
    }

    console.log(
      "📦 Deliverable data to create:",
      JSON.stringify(deliverableData, null, 2)
    );

    const newDeliverable = new Deliverable(deliverableData);
    const savedDeliverable = await newDeliverable.save();

    console.log("✅ Deliverable created with ID:", savedDeliverable._id);

    // Add deliverable ID to project's deliverableIds array
    console.log("📌 Adding deliverable ID to project...");
    if (!project.deliverableIds) {
      project.deliverableIds = [];
    }
    project.deliverableIds.push((savedDeliverable._id as any).toString());
    project.updatedAt = new Date();

    console.log("💾 Saving project with new deliverable ID...");
    const savedProject = await project.save();
    console.log("✅ Project updated successfully:", {
      projectId: savedProject._id,
      deliverableIdsCount: savedProject.deliverableIds?.length || 0,
      lastUpdated: savedProject.updatedAt,
    });

    console.log("🎉 Deliverable creation completed successfully");
    return NextResponse.json({
      message: "Deliverable added successfully",
      deliverable: savedDeliverable.toPublicJSON(),
    });
  } catch (error) {
    console.error("💥 Error adding deliverable:", error);
    console.error("📊 Error details:", {
      name: error instanceof Error ? error.name : "Unknown",
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : "No stack trace",
    });

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PUT - Update deliverable status or details
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log("🔄 PUT /api/projects/[id]/deliverables - Updating deliverable");

  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const {
      deliverableId,
      status,
      title,
      description,
      type,
      dueDate,
      assignedTo,
    } = body;

    console.log("📝 Update request:", { deliverableId, status, title });

    if (!deliverableId) {
      return NextResponse.json(
        { error: "Deliverable ID is required" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const project = await Project.findById(id);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Check permissions
    const member = project.members.find(
      (m: any) => m.userId === session.user.id
    );
    const isOwner = project.ownerId === session.user.id;
    const canManage =
      isOwner || (member && ["owner", "manager"].includes(member.role));

    if (!canManage) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    // Update the actual deliverable in the deliverables collection
    const updateData: any = {
      updated_at: new Date(),
    };

    if (status) {
      // Map project deliverable statuses to existing deliverable statuses
      const statusMap: Record<string, string> = {
        pending: "not_started",
        in_progress: "in_progress",
        review: "in_progress",
        completed: "done",
        rejected: "not_started",
      };
      updateData.status = statusMap[status] || status;
    }

    if (title) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description?.trim();
    if (dueDate) {
      updateData.edit_deadline = new Date(dueDate);
      updateData.release_date = new Date(dueDate);
    }
    if (assignedTo !== undefined) {
      updateData.firebase_uid = assignedTo || session.user.id;
    }

    console.log("📝 Updating deliverable with data:", updateData);

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

    console.log("✅ Deliverable updated successfully");

    return NextResponse.json({
      message: "Deliverable updated successfully",
      deliverable: updatedDeliverable.toPublicJSON(),
    });
  } catch (error) {
    console.error("💥 Error updating deliverable:", error);
    return NextResponse.json(
      { error: "Internal server error" },
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
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { deliverableId } = body;

    console.log("🗑️ Removing deliverable:", deliverableId);

    if (!deliverableId) {
      return NextResponse.json(
        { error: "Deliverable ID is required" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const project = await Project.findById(id);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Check permissions (manager or owner can remove deliverables)
    const member = project.members.find(
      (m: any) => m.userId === session.user.id
    );
    const isOwner = project.ownerId === session.user.id;
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
    project.deliverableIds = project.deliverableIds.filter(
      (id: string) => id !== deliverableId
    );

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
    console.log("✅ Deliverable unlinked from project");

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
