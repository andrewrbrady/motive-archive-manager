import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { Project } from "@/models/Project";
import {
  UpdateProjectRequest,
  ProjectResponse,
  Project as IProject,
} from "@/types/project";
import { auth } from "@/auth";
import { ObjectId } from "mongodb";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const db = await getDatabase();
    const projectId = params.id;

    // Validate ObjectId
    if (!ObjectId.isValid(projectId)) {
      return NextResponse.json(
        { error: "Invalid project ID" },
        { status: 400 }
      );
    }

    const project = await db.collection("projects").findOne({
      _id: new ObjectId(projectId),
      $or: [
        { ownerId: session.user.id },
        { "members.userId": session.user.id },
      ],
    });

    if (!project) {
      return NextResponse.json(
        { error: "Project not found or access denied" },
        { status: 404 }
      );
    }

    const response: ProjectResponse = {
      project: project as unknown as IProject,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching project:", error);
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
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const db = await getDatabase();
    const projectId = params.id;
    const data: UpdateProjectRequest = await request.json();

    // Validate ObjectId
    if (!ObjectId.isValid(projectId)) {
      return NextResponse.json(
        { error: "Invalid project ID" },
        { status: 400 }
      );
    }

    // Check if user has permission to update this project
    const existingProject = await db.collection("projects").findOne({
      _id: new ObjectId(projectId),
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
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.clientId !== undefined) updateData.clientId = data.clientId;
    if (data.carIds !== undefined) updateData.carIds = data.carIds;
    if (data.tags !== undefined) updateData.tags = data.tags;

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

    const result = await db
      .collection("projects")
      .updateOne({ _id: new ObjectId(projectId) }, { $set: updateData });

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Fetch updated project
    const updatedProject = await db.collection("projects").findOne({
      _id: new ObjectId(projectId),
    });

    const response: ProjectResponse = {
      project: updatedProject as unknown as IProject,
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
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const db = await getDatabase();
    const projectId = params.id;

    // Validate ObjectId
    if (!ObjectId.isValid(projectId)) {
      return NextResponse.json(
        { error: "Invalid project ID" },
        { status: 400 }
      );
    }

    // Check if user is the owner or has delete permissions
    const project = await db.collection("projects").findOne({
      _id: new ObjectId(projectId),
      $or: [
        { ownerId: session.user.id },
        {
          members: {
            $elemMatch: {
              userId: session.user.id,
              permissions: { $in: ["delete"] },
            },
          },
        },
      ],
    });

    if (!project) {
      return NextResponse.json(
        { error: "Project not found or insufficient permissions" },
        { status: 404 }
      );
    }

    if (process.env.NODE_ENV !== "production") {
      console.log("Deleting project:", {
        id: projectId,
        title: project.title,
        ownerId: project.ownerId,
      });
    }

    const result = await db.collection("projects").deleteOne({
      _id: new ObjectId(projectId),
    });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    return NextResponse.json(
      { message: "Project deleted successfully" },
      { status: 200 }
    );
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
