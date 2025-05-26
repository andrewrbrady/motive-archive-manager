import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Project } from "@/models/Project";
import {
  UpdateProjectRequest,
  ProjectResponse,
  Project as IProject,
} from "@/types/project";
import { auth } from "@/auth";
import { ObjectId } from "mongodb";
import { convertProjectForFrontend } from "@/utils/objectId";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log("🔍 GET /api/projects/[id] - Starting project fetch");

  try {
    const session = await auth();
    console.log("🔐 Authentication check:", {
      hasSession: !!session,
      userId: session?.user?.id,
    });

    if (!session?.user?.id) {
      console.log("❌ Authentication failed");
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { id: projectId } = await params;
    console.log("📋 Project ID from params:", projectId);

    // Validate ObjectId
    if (!ObjectId.isValid(projectId)) {
      console.log("❌ Invalid project ID format");
      return NextResponse.json(
        { error: "Invalid project ID" },
        { status: 400 }
      );
    }

    console.log("🔗 Connecting to database...");
    await connectToDatabase();
    console.log("✅ Database connected successfully");

    console.log("🔍 Searching for project using Mongoose model...");
    const project = await Project.findOne({
      _id: projectId,
      $or: [
        { ownerId: session.user.id },
        { "members.userId": session.user.id },
      ],
    });

    if (!project) {
      console.log("❌ Project not found or access denied");
      return NextResponse.json(
        { error: "Project not found or access denied" },
        { status: 404 }
      );
    }

    console.log("✅ Project found via Mongoose:", {
      projectId: project._id,
      projectTitle: project.title,
      hasDeliverables: !!project.deliverables,
      deliverablesCount: project.deliverables?.length || 0,
      deliverables: project.deliverables || [],
      projectKeys: Object.keys(project.toObject()),
    });

    const response: ProjectResponse = {
      project: convertProjectForFrontend(project.toObject()) as IProject,
    };

    console.log(
      "📤 Sending response with deliverables count:",
      response.project.deliverables?.length || 0
    );
    return NextResponse.json(response);
  } catch (error) {
    console.error("💥 Error fetching project:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to fetch project", details: errorMessage },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    await connectToDatabase();
    const { id: projectId } = await params;
    const data: UpdateProjectRequest = await request.json();

    // Validate ObjectId
    if (!ObjectId.isValid(projectId)) {
      return NextResponse.json(
        { error: "Invalid project ID" },
        { status: 400 }
      );
    }

    // Check if user has permission to update this project
    const existingProject = await Project.findOne({
      _id: projectId,
      $or: [
        { ownerId: session.user.id },
        {
          members: {
            $elemMatch: {
              userId: session.user.id,
              permissions: {
                $in: [
                  "write",
                  "manage_team",
                  "manage_budget",
                  "manage_timeline",
                ],
              },
            },
          },
        },
      ],
    });

    if (!existingProject) {
      return NextResponse.json(
        { error: "Project not found or insufficient permissions" },
        { status: 404 }
      );
    }

    if (process.env.NODE_ENV !== "production") {
      console.log("Updating project:", {
        id: projectId,
        hasTitle: !!data.title,
        hasStatus: !!data.status,
        hasProgress: !!data.progress,
        fieldsCount: Object.keys(data).length,
      });
    }

    // Build update object
    const updateData: any = {
      updatedAt: new Date(),
    };

    // Update basic fields
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined)
      updateData.description = data.description;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.clientId !== undefined) updateData.clientId = data.clientId;
    if (data.carIds !== undefined) updateData.carIds = data.carIds;
    if (data.tags !== undefined) updateData.tags = data.tags;

    // Handle primaryImageId - convert string to ObjectId if provided
    if ((data as any).primaryImageId !== undefined) {
      if ((data as any).primaryImageId) {
        // Validate ObjectId format if provided
        if (ObjectId.isValid((data as any).primaryImageId)) {
          updateData.primaryImageId = new ObjectId(
            (data as any).primaryImageId
          );
        } else {
          return NextResponse.json(
            { error: "Invalid primaryImageId format" },
            { status: 400 }
          );
        }
      } else {
        // If empty string or null, remove the field
        updateData.primaryImageId = null;
      }
    }

    // Update timeline if provided
    if (data.timeline) {
      const timelineUpdate: any = {};
      if (data.timeline.startDate)
        timelineUpdate["timeline.startDate"] = new Date(
          data.timeline.startDate
        );
      if (data.timeline.endDate)
        timelineUpdate["timeline.endDate"] = new Date(data.timeline.endDate);
      if (data.timeline.estimatedDuration)
        timelineUpdate["timeline.estimatedDuration"] =
          data.timeline.estimatedDuration;
      Object.assign(updateData, timelineUpdate);
    }

    // Update progress if provided
    if (data.progress) {
      updateData["progress.percentage"] = data.progress.percentage;
      updateData["progress.completedTasks"] = data.progress.completedTasks;
      updateData["progress.totalTasks"] = data.progress.totalTasks;
      updateData["progress.lastUpdated"] = new Date();
    }

    // Update budget if provided
    if (data.budget) {
      updateData["budget.total"] = data.budget.total;
      updateData["budget.currency"] = data.budget.currency;
      updateData["budget.remaining"] = data.budget.total; // Will be recalculated
    }

    // Set completion/archive dates based on status
    if (data.status === "completed" && !existingProject.completedAt) {
      updateData.completedAt = new Date();
    }
    if (data.status === "archived" && !existingProject.archivedAt) {
      updateData.archivedAt = new Date();
    }

    const updatedProject = await Project.findByIdAndUpdate(
      projectId,
      { $set: updateData },
      { new: true }
    );

    if (!updatedProject) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const response: ProjectResponse = {
      project: convertProjectForFrontend(updatedProject.toObject()) as IProject,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error updating project:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to update project", details: errorMessage },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    await connectToDatabase();
    const { id: projectId } = await params;

    // Validate ObjectId
    if (!ObjectId.isValid(projectId)) {
      return NextResponse.json(
        { error: "Invalid project ID" },
        { status: 400 }
      );
    }

    // Check if user has permission to delete this project (only owner)
    const existingProject = await Project.findOne({
      _id: projectId,
      ownerId: session.user.id,
    });

    if (!existingProject) {
      return NextResponse.json(
        { error: "Project not found or insufficient permissions" },
        { status: 404 }
      );
    }

    const result = await Project.findByIdAndDelete(projectId);

    if (!result) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Project deleted successfully" });
  } catch (error) {
    console.error("Error deleting project:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to delete project", details: errorMessage },
      { status: 500 }
    );
  }
}
