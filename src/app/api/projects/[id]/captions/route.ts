import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import {
  withFirebaseAuth,
  verifyFirebaseToken,
} from "@/lib/firebase-auth-middleware";

interface ProjectCaptionsRouteParams {
  params: Promise<{ id: string }>;
}

// GET - Fetch captions for project
async function getProjectCaptions(
  request: NextRequest,
  { params }: ProjectCaptionsRouteParams
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

    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid project ID" },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const projectId = new ObjectId(id);

    // Check if user has access to this project
    const project = await db.collection("projects").findOne({ _id: projectId });
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const isMember = project.members?.some(
      (member: any) => member.userId === userId
    );
    if (!isMember && project.ownerId !== userId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Parse query parameters for server-side filtering and pagination
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get("limit") || "50");
    const offset = parseInt(url.searchParams.get("offset") || "0");
    const platform = url.searchParams.get("platform");

    // ⚡ OPTIMIZED: Build query with optional platform filter
    const query: any = { projectId: id };
    if (platform) {
      query.platform = platform;
    }

    console.time("getProjectCaptions-fetch");

    // ⚡ OPTIMIZED: Use field projection and pagination
    const captions = await db
      .collection("project_captions")
      .find(query)
      .project({
        _id: 1,
        projectId: 1,
        carIds: 1,
        eventIds: 1,
        platform: 1,
        context: 1,
        caption: 1,
        createdBy: 1,
        createdAt: 1,
        updatedAt: 1,
      })
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .toArray();

    console.timeEnd("getProjectCaptions-fetch");

    return NextResponse.json({
      captions,
      total: captions.length,
      limit,
      offset,
      hasMore: captions.length === limit,
    });
  } catch (error) {
    console.error("Error fetching project captions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Create new caption for project
async function createProjectCaption(
  request: NextRequest,
  { params }: ProjectCaptionsRouteParams
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

    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid project ID" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { platform, context, caption, carIds, eventIds } = body;

    if (!platform || !caption) {
      return NextResponse.json(
        { error: "Platform and caption are required" },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const projectId = new ObjectId(id);

    // Check if user has access to this project
    const project = await db.collection("projects").findOne({ _id: projectId });
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

    // Create new caption
    const newCaption = {
      _id: new ObjectId(),
      projectId: id,
      carIds: carIds || [],
      eventIds: eventIds || [],
      platform,
      context: context || "",
      caption,
      createdBy: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.collection("project_captions").insertOne(newCaption);

    return NextResponse.json({
      message: "Caption created successfully",
      caption: newCaption,
    });
  } catch (error) {
    console.error("Error creating project caption:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH - Update existing caption
async function updateProjectCaption(
  request: NextRequest,
  { params }: ProjectCaptionsRouteParams
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

    const { id } = await params;
    const url = new URL(request.url);
    const captionId = url.searchParams.get("id");

    if (!ObjectId.isValid(id) || !captionId || !ObjectId.isValid(captionId)) {
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
    const projectId = new ObjectId(id);
    const captionObjectId = new ObjectId(captionId);

    // Check if user has access to this project
    const project = await db.collection("projects").findOne({ _id: projectId });
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
      { _id: captionObjectId, projectId: id },
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

// DELETE - Delete caption
async function deleteProjectCaption(
  request: NextRequest,
  { params }: ProjectCaptionsRouteParams
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

    const { id } = await params;
    const url = new URL(request.url);
    const captionId = url.searchParams.get("id");

    if (!ObjectId.isValid(id) || !captionId || !ObjectId.isValid(captionId)) {
      return NextResponse.json(
        { error: "Invalid project ID or caption ID" },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const projectId = new ObjectId(id);
    const captionObjectId = new ObjectId(captionId);

    // Check if user has access to this project
    const project = await db.collection("projects").findOne({ _id: projectId });
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
      .deleteOne({ _id: captionObjectId, projectId: id });

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
export const GET = withFirebaseAuth<any>(getProjectCaptions);
export const POST = withFirebaseAuth<any>(createProjectCaption);
export const PATCH = withFirebaseAuth<any>(updateProjectCaption);
export const DELETE = withFirebaseAuth<any>(deleteProjectCaption);
