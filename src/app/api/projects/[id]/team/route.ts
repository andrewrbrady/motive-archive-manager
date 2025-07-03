import { NextRequest, NextResponse } from "next/server";
import {
  verifyAuthMiddleware,
  getUserIdFromToken,
  verifyFirebaseToken,
} from "@/lib/firebase-auth-middleware";
import { connectToDatabase } from "@/lib/mongodb";
import { Project } from "@/models/Project";
import { ProjectMemberRole } from "@/types/project";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const authResult = await verifyAuthMiddleware(request);
    if (authResult) {
      // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("❌ GET /api/projects/[id]/team: Authentication failed");
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
      members: project.members,
      ownerId: project.ownerId,
    });
  } catch (error) {
    console.error("Error fetching project team:", error);
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
      // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("❌ POST /api/projects/[id]/team: Authentication failed");
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
    const { userId: memberUserId, role, permissions, hourlyRate } = body;
    const { id } = await params;

    if (!memberUserId || !role) {
      return NextResponse.json(
        { error: "User ID and role are required" },
        { status: 400 }
      );
    }

    // Validate role
    const validRoles: ProjectMemberRole[] = [
      "owner",
      "manager",
      "photographer",
      "editor",
      "writer",
      "viewer",
    ];
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    await connectToDatabase();

    const project = await Project.findById(id);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Check if user has permission to add members
    const canAddMembers =
      project.ownerId === userId ||
      project.members.some(
        (member: any) =>
          member.userId === userId && ["owner", "manager"].includes(member.role)
      );

    if (!canAddMembers) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Check if user is already a member
    const existingMember = project.members.find(
      (member: any) => member.userId === memberUserId
    );
    if (existingMember) {
      return NextResponse.json(
        { error: "User is already a member of this project" },
        { status: 400 }
      );
    }

    // Create new member
    const newMember = {
      userId: memberUserId,
      role,
      permissions: permissions || [],
      joinedAt: new Date(),
      hourlyRate: hourlyRate || undefined,
      hoursLogged: 0,
    };

    // Add member to project
    const updatedProject = await Project.findByIdAndUpdate(
      id,
      { $push: { members: newMember } },
      { new: true }
    );

    if (!updatedProject) {
      return NextResponse.json(
        { error: "Failed to add member" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Member added successfully",
      member: newMember,
      members: updatedProject.members,
    });
  } catch (error) {
    console.error("Error adding team member:", error);
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
      // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("❌ PUT /api/projects/[id]/team: Authentication failed");
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

    const currentUserId = getUserIdFromToken(tokenData);

    const body = await request.json();
    const { userId, role, permissions, hourlyRate } = body;
    const { id } = await params;

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const project = await Project.findById(id);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Check if user has permission to update members
    const canUpdateMembers =
      project.ownerId === currentUserId ||
      project.members.some(
        (member: any) =>
          member.userId === currentUserId &&
          ["owner", "manager"].includes(member.role)
      );

    if (!canUpdateMembers) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Find and update member
    const memberIndex = project.members.findIndex(
      (member: any) => member.userId === userId
    );
    if (memberIndex === -1) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Update member data
    const updateData: any = {};
    if (role) updateData[`members.${memberIndex}.role`] = role;
    if (permissions)
      updateData[`members.${memberIndex}.permissions`] = permissions;
    if (hourlyRate !== undefined)
      updateData[`members.${memberIndex}.hourlyRate`] = hourlyRate;

    const updatedProject = await Project.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true }
    );

    if (!updatedProject) {
      return NextResponse.json(
        { error: "Failed to update member" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Member updated successfully",
      members: updatedProject.members,
    });
  } catch (error) {
    console.error("Error updating team member:", error);
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
      // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("❌ DELETE /api/projects/[id]/team: Authentication failed");
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

    const currentUserId = getUserIdFromToken(tokenData);

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const { id } = await params;

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const project = await Project.findById(id);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Check if user has permission to remove members
    const canRemoveMembers =
      project.ownerId === currentUserId ||
      project.members.some(
        (member: any) =>
          member.userId === currentUserId &&
          ["owner", "manager"].includes(member.role)
      );

    if (!canRemoveMembers) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Cannot remove project owner
    if (userId === project.ownerId) {
      return NextResponse.json(
        { error: "Cannot remove project owner" },
        { status: 400 }
      );
    }

    // Remove member from project
    const updatedProject = await Project.findByIdAndUpdate(
      id,
      { $pull: { members: { userId } } },
      { new: true }
    );

    if (!updatedProject) {
      return NextResponse.json(
        { error: "Failed to remove member" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Member removed successfully",
      members: updatedProject.members,
    });
  } catch (error) {
    console.error("Error removing team member:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
