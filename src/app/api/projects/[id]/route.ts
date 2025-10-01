import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Project } from "@/models/Project";
import {
  UpdateProjectRequest,
  ProjectResponse,
  Project as IProject,
} from "@/types/project";
import {
  verifyFirebaseToken,
  getUserIdFromToken,
} from "@/lib/firebase-auth-middleware";
import { ObjectId } from "mongodb";
import { convertProjectForFrontend } from "@/utils/objectId";

export const dynamic = "force-dynamic";

async function getProject(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("🔍 GET /api/projects/[id] - Starting project fetch");

  try {
    // Get the token from the authorization header
    const authHeader = request.headers.get("authorization") || "";
    const token = authHeader.split("Bearer ")[1];

    if (!token) {
      // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("❌ getProject: No authorization token provided");
      return NextResponse.json(
        {
          error: "Authentication required",
          details: "No authorization token provided",
          code: "MISSING_TOKEN",
        },
        { status: 401 }
      );
    }

    const tokenData = await verifyFirebaseToken(token);

    if (!tokenData) {
      // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("❌ getProject: Token verification failed");
      return NextResponse.json(
        {
          error: "Authentication failed",
          details: "Invalid or expired token",
          code: "INVALID_TOKEN",
        },
        { status: 401 }
      );
    }

    const userId = getUserIdFromToken(tokenData);
    console.log("🔐 getProject: Authentication successful", {
      userId,
      tokenType: tokenData.tokenType,
    });

    const { id: projectId } = await params;
    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("📋 getProject: Project ID from params:", projectId);

    // Validate ObjectId
    if (!ObjectId.isValid(projectId)) {
      // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("❌ getProject: Invalid project ID format");
      return NextResponse.json(
        {
          error: "Invalid request",
          details: "Invalid project ID format",
          code: "INVALID_PROJECT_ID",
        },
        { status: 400 }
      );
    }

    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("🔗 getProject: Connecting to database...");
    await connectToDatabase();
    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("✅ getProject: Database connected successfully");

    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("🔍 getProject: Searching for project...");
    const project = await Project.findOne({
      _id: projectId,
    });

    if (!project) {
      console.log("❌ getProject: Project not found or access denied", {
        projectId,
        userId,
      });
      return NextResponse.json(
        {
          error: "Project not found",
          details: "Project not found or you don't have access to it",
          code: "PROJECT_NOT_FOUND",
        },
        { status: 404 }
      );
    }

    console.log("✅ getProject: Project found", {
      projectId: project._id,
      projectTitle: project.title,
      hasDeliverables: !!project.deliverables,
      deliverablesCount: project.deliverables?.length || 0,
    });

    const response: ProjectResponse = {
      project: convertProjectForFrontend(project.toObject()) as IProject,
    };

    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("📤 getProject: Sending successful response");
    return NextResponse.json(response);
  } catch (error: any) {
    console.error("💥 getProject: Error fetching project:", {
      error: error.message,
      stack: error.stack,
    });

    return NextResponse.json(
      {
        error: "Internal server error",
        details: "Failed to fetch project",
        code: "INTERNAL_ERROR",
      },
      { status: 500 }
    );
  }
}

// Use manual authentication instead of wrapper to avoid TypeScript issues
export const GET = getProject;

async function updateProject(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("🔄 PUT /api/projects/[id] - Starting project update");

  try {
    // Get the token from the authorization header
    const authHeader = request.headers.get("authorization") || "";
    const token = authHeader.split("Bearer ")[1];

    if (!token) {
      // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("❌ updateProject: No authorization token provided");
      return NextResponse.json(
        {
          error: "Authentication required",
          details: "No authorization token provided",
          code: "MISSING_TOKEN",
        },
        { status: 401 }
      );
    }

    const tokenData = await verifyFirebaseToken(token);

    if (!tokenData) {
      // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("❌ updateProject: Token verification failed");
      return NextResponse.json(
        {
          error: "Authentication failed",
          details: "Invalid or expired token",
          code: "INVALID_TOKEN",
        },
        { status: 401 }
      );
    }

    const userId = getUserIdFromToken(tokenData);
    console.log("🔐 updateProject: Authentication successful", {
      userId,
      tokenType: tokenData.tokenType,
    });

    await connectToDatabase();
    const { id: projectId } = await params;
    const data: UpdateProjectRequest = await request.json();

    console.log("📋 updateProject: Processing update", {
      projectId,
      fieldsToUpdate: Object.keys(data),
    });

    // Validate ObjectId
    if (!ObjectId.isValid(projectId)) {
      // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("❌ updateProject: Invalid project ID format");
      return NextResponse.json(
        {
          error: "Invalid request",
          details: "Invalid project ID format",
          code: "INVALID_PROJECT_ID",
        },
        { status: 400 }
      );
    }

    // Check that the project exists before applying updates
    const existingProject = await Project.findOne({
      _id: projectId,
    });

    if (!existingProject) {
      console.log(
        "❌ updateProject: Project not found or insufficient permissions",
        {
          projectId,
          userId,
        }
      );
      return NextResponse.json(
        {
          error: "Project not found",
          details: "Project not found",
          code: "PROJECT_NOT_FOUND",
        },
        { status: 404 }
      );
    }

    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("✅ updateProject: Permission check passed");

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
          // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("❌ updateProject: Invalid primaryImageId format");
          return NextResponse.json(
            {
              error: "Invalid request",
              details: "Invalid primaryImageId format",
              code: "INVALID_IMAGE_ID",
            },
            { status: 400 }
          );
        }
      } else {
        updateData.primaryImageId = null;
      }
    }

    // Handle timeline updates
    if (data.timeline) {
      updateData.timeline = {
        startDate: data.timeline.startDate
          ? new Date(data.timeline.startDate)
          : existingProject.timeline?.startDate,
        endDate: data.timeline.endDate
          ? new Date(data.timeline.endDate)
          : existingProject.timeline?.endDate,
        milestones: existingProject.timeline?.milestones || [],
        estimatedDuration:
          data.timeline.estimatedDuration ||
          existingProject.timeline?.estimatedDuration,
      };
    }

    // Handle budget updates
    if (data.budget) {
      updateData.budget = {
        total: data.budget.total ?? existingProject.budget?.total,
        spent: existingProject.budget?.spent || 0,
        remaining:
          (data.budget.total ?? (existingProject.budget?.total || 0)) -
          (existingProject.budget?.spent || 0),
        currency:
          data.budget.currency || existingProject.budget?.currency || "USD",
        expenses: existingProject.budget?.expenses || [],
      };
    }

    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("🔄 updateProject: Applying updates to database");
    const updatedProject = await Project.findByIdAndUpdate(
      projectId,
      updateData,
      { new: true }
    );

    if (!updatedProject) {
      // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("❌ updateProject: Failed to update project");
      return NextResponse.json(
        {
          error: "Update failed",
          details: "Failed to update project",
          code: "UPDATE_FAILED",
        },
        { status: 500 }
      );
    }

    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("✅ updateProject: Project updated successfully");
    const response: ProjectResponse = {
      project: convertProjectForFrontend(updatedProject.toObject()) as IProject,
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error("💥 updateProject: Error updating project:", {
      error: error.message,
      stack: error.stack,
    });

    return NextResponse.json(
      {
        error: "Internal server error",
        details: "Failed to update project",
        code: "INTERNAL_ERROR",
      },
      { status: 500 }
    );
  }
}

// Use manual authentication instead of wrapper to avoid TypeScript issues
export const PUT = updateProject;

async function deleteProject(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("🗑️ DELETE /api/projects/[id] - Starting project deletion");

  try {
    // Get the token from the authorization header
    const authHeader = request.headers.get("authorization") || "";
    const token = authHeader.split("Bearer ")[1];

    if (!token) {
      // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("❌ deleteProject: No authorization token provided");
      return NextResponse.json(
        {
          error: "Authentication required",
          details: "No authorization token provided",
          code: "MISSING_TOKEN",
        },
        { status: 401 }
      );
    }

    const tokenData = await verifyFirebaseToken(token);

    if (!tokenData) {
      // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("❌ deleteProject: Token verification failed");
      return NextResponse.json(
        {
          error: "Authentication failed",
          details: "Invalid or expired token",
          code: "INVALID_TOKEN",
        },
        { status: 401 }
      );
    }

    const userId = getUserIdFromToken(tokenData);
    console.log("🔐 deleteProject: Authentication successful", {
      userId,
      tokenType: tokenData.tokenType,
    });

    await connectToDatabase();
    const { id: projectId } = await params;

    // Validate ObjectId
    if (!ObjectId.isValid(projectId)) {
      // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("❌ deleteProject: Invalid project ID format");
      return NextResponse.json(
        {
          error: "Invalid request",
          details: "Invalid project ID format",
          code: "INVALID_PROJECT_ID",
        },
        { status: 400 }
      );
    }

    // Check if user is the owner (only owners can delete projects)
    const project = await Project.findOne({
      _id: projectId,
      ownerId: userId,
    });

    if (!project) {
      console.log("❌ deleteProject: Project not found or not owner", {
        projectId,
        userId,
      });
      return NextResponse.json(
        {
          error: "Access denied",
          details: "Project not found or you're not the owner",
          code: "NOT_OWNER",
        },
        { status: 403 }
      );
    }

    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("🗑️ deleteProject: Deleting project from database");
    await Project.findByIdAndDelete(projectId);

    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("✅ deleteProject: Project deleted successfully");
    return NextResponse.json({
      success: true,
      message: "Project deleted successfully",
    });
  } catch (error: any) {
    console.error("💥 deleteProject: Error deleting project:", {
      error: error.message,
      stack: error.stack,
    });

    return NextResponse.json(
      {
        error: "Internal server error",
        details: "Failed to delete project",
        code: "INTERNAL_ERROR",
      },
      { status: 500 }
    );
  }
}

// Use manual authentication instead of wrapper to avoid TypeScript issues
export const DELETE = deleteProject;
