import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import {
  withFirebaseAuth,
  verifyFirebaseToken,
} from "@/lib/firebase-auth-middleware";

interface ProjectCaptionRouteParams {
  params: Promise<{ id: string; captionId: string }>;
}

// PATCH - Update existing caption by captionId in path
async function updateProjectCaptionByPath(
  request: NextRequest,
  { params }: ProjectCaptionRouteParams
) {
  try {
    // Get the token from the authorization header
    const authHeader = request.headers.get("authorization") || "";
    const token = authHeader.split("Bearer ")[1];
    const tokenData = await verifyFirebaseToken(token);

    if (!tokenData) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const userId =
      tokenData.tokenType === "api_token" ? tokenData.userId : tokenData.uid;

    const { id: projectId, captionId } = await params;

    if (!ObjectId.isValid(projectId) || !ObjectId.isValid(captionId)) {
      return NextResponse.json(
        { error: "Invalid project ID or caption ID" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { platform, context, caption, carIds, eventIds } = body;

    if (!caption) {
      return NextResponse.json(
        { error: "Caption is required" },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const projectObjectId = new ObjectId(projectId);
    const captionObjectId = new ObjectId(captionId);

    // Check if user has access to this project
    const project = await db
      .collection("projects")
      .findOne({ _id: projectObjectId });
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const isMember = project.members?.some(
      (member: any) => member.userId === userId
    );
    const isOwner = project.ownerId === userId;
    const canManage =
      isOwner ||
      (isMember &&
        ["owner", "manager"].includes(
          project.members.find((m: any) => m.userId === userId)?.role
        ));

    if (!canManage) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    // Update caption
    const updateResult = await db.collection("project_captions").updateOne(
      { _id: captionObjectId, projectId: projectId },
      {
        $set: {
          platform,
          context: context || "",
          caption,
          carIds: carIds || [],
          eventIds: eventIds || [],
          updatedAt: new Date(),
        },
      }
    );

    if (updateResult.matchedCount === 0) {
      return NextResponse.json({ error: "Caption not found" }, { status: 404 });
    }

    return NextResponse.json({
      message: "Caption updated successfully",
    });
  } catch (error) {
    console.error("Error updating project caption:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE - Delete caption by captionId in path
async function deleteProjectCaptionByPath(
  request: NextRequest,
  { params }: ProjectCaptionRouteParams
) {
  try {
    // Get the token from the authorization header
    const authHeader = request.headers.get("authorization") || "";
    const token = authHeader.split("Bearer ")[1];
    const tokenData = await verifyFirebaseToken(token);

    if (!tokenData) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const userId =
      tokenData.tokenType === "api_token" ? tokenData.userId : tokenData.uid;

    const { id: projectId, captionId } = await params;

    if (!ObjectId.isValid(projectId) || !ObjectId.isValid(captionId)) {
      return NextResponse.json(
        { error: "Invalid project ID or caption ID" },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const projectObjectId = new ObjectId(projectId);
    const captionObjectId = new ObjectId(captionId);

    // Check if user has access to this project
    const project = await db
      .collection("projects")
      .findOne({ _id: projectObjectId });
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const isMember = project.members?.some(
      (member: any) => member.userId === userId
    );
    const isOwner = project.ownerId === userId;
    const canManage =
      isOwner ||
      (isMember &&
        ["owner", "manager"].includes(
          project.members.find((m: any) => m.userId === userId)?.role
        ));

    if (!canManage) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    // Delete caption
    const deleteResult = await db
      .collection("project_captions")
      .deleteOne({ _id: captionObjectId, projectId: projectId });

    if (deleteResult.deletedCount === 0) {
      return NextResponse.json({ error: "Caption not found" }, { status: 404 });
    }

    return NextResponse.json({
      message: "Caption deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting project caption:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Export the wrapped functions
export const PATCH = withFirebaseAuth<any>(updateProjectCaptionByPath);
export const DELETE = withFirebaseAuth<any>(deleteProjectCaptionByPath);
