import { NextRequest, NextResponse } from "next/server";
import {
  verifyAuthMiddleware,
  getUserIdFromToken,
  verifyFirebaseToken,
} from "@/lib/firebase-auth-middleware";
import { connectToDatabase } from "@/lib/mongodb";
import { Project } from "@/models/Project";
import { ObjectId } from "mongodb";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const authResult = await verifyAuthMiddleware(request);
    if (authResult) {
      console.log("❌ GET /api/projects/[id]/timeline: Authentication failed");
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
    await connectToDatabase();

    const project = await Project.findById(id);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Check if user has access to this project
    const hasAccess =
      project.ownerId === userId ||
      project.members.some((member: any) => member.userId === userId);

    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    return NextResponse.json({
      timeline: project.timeline,
      milestones: project.timeline.milestones,
    });
  } catch (error) {
    console.error("Error fetching project timeline:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const authResult = await verifyAuthMiddleware(request);
    if (authResult) {
      console.log("❌ PUT /api/projects/[id]/timeline: Authentication failed");
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

    const body = await request.json();
    const { milestones, startDate, endDate, estimatedDuration } = body;
    const { id } = await params;

    await connectToDatabase();

    const project = await Project.findById(id);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Check if user has permission to edit this project
    const canEdit =
      project.ownerId === userId ||
      project.members.some(
        (member: any) =>
          member.userId === userId && ["owner", "manager"].includes(member.role)
      );

    if (!canEdit) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Update timeline
    const updateData: any = {};
    if (milestones) updateData["timeline.milestones"] = milestones;
    if (startDate) updateData["timeline.startDate"] = new Date(startDate);
    if (endDate) updateData["timeline.endDate"] = new Date(endDate);
    if (estimatedDuration)
      updateData["timeline.estimatedDuration"] = estimatedDuration;

    const updatedProject = await Project.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true }
    );

    if (!updatedProject) {
      return NextResponse.json(
        { error: "Failed to update project" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Timeline updated successfully",
      timeline: updatedProject.timeline,
    });
  } catch (error) {
    console.error("Error updating project timeline:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const authResult = await verifyAuthMiddleware(request);
    if (authResult) {
      console.log("❌ POST /api/projects/[id]/timeline: Authentication failed");
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

    const body = await request.json();
    const { title, description, dueDate, assignedTo, dependencies } = body;
    const { id } = await params;

    if (!title || !dueDate) {
      return NextResponse.json(
        { error: "Title and due date are required" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const project = await Project.findById(id);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Check if user has permission to edit this project
    const canEdit =
      project.ownerId === userId ||
      project.members.some(
        (member: any) =>
          member.userId === userId && ["owner", "manager"].includes(member.role)
      );

    if (!canEdit) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Create new milestone
    const newMilestone = {
      id: new ObjectId().toString(),
      title,
      description: description || "",
      dueDate: new Date(dueDate),
      completed: false,
      dependencies: dependencies || [],
      assignedTo: assignedTo || [],
    };

    // Add milestone to project
    const updatedProject = await Project.findByIdAndUpdate(
      id,
      { $push: { "timeline.milestones": newMilestone } },
      { new: true }
    );

    if (!updatedProject) {
      return NextResponse.json(
        { error: "Failed to add milestone" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Milestone added successfully",
      milestone: newMilestone,
      timeline: updatedProject.timeline,
    });
  } catch (error) {
    console.error("Error adding milestone:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const authResult = await verifyAuthMiddleware(request);
    if (authResult) {
      console.log(
        "❌ DELETE /api/projects/[id]/timeline: Authentication failed"
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
    const url = new URL(request.url);
    const milestoneId = url.searchParams.get("milestoneId");

    if (!milestoneId) {
      return NextResponse.json(
        { error: "Milestone ID is required" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const project = await Project.findById(id);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Check if user has permission to edit this project
    const canEdit =
      project.ownerId === userId ||
      project.members.some(
        (member: any) =>
          member.userId === userId && ["owner", "manager"].includes(member.role)
      );

    if (!canEdit) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Check if milestone exists
    const milestoneExists = project.timeline.milestones.some(
      (milestone: any) => milestone.id === milestoneId
    );

    if (!milestoneExists) {
      return NextResponse.json(
        { error: "Milestone not found" },
        { status: 404 }
      );
    }

    // Remove milestone from project
    const updatedProject = await Project.findByIdAndUpdate(
      id,
      { $pull: { "timeline.milestones": { id: milestoneId } } },
      { new: true }
    );

    if (!updatedProject) {
      return NextResponse.json(
        { error: "Failed to delete milestone" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Milestone deleted successfully",
      timeline: updatedProject.timeline,
    });
  } catch (error) {
    console.error("Error deleting milestone:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
