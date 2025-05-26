import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { auth } from "@/auth";

interface ProjectCaptionsRouteParams {
  params: Promise<{ id: string }>;
}

// GET - Fetch captions for project
export async function GET(
  request: NextRequest,
  { params }: ProjectCaptionsRouteParams
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
      (member: any) => member.userId === session.user.id
    );
    if (!isMember && project.ownerId !== session.user.id) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Fetch captions for this project
    const captions = await db
      .collection("project_captions")
      .find({ projectId: id })
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json(captions);
  } catch (error) {
    console.error("Error fetching project captions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Create new caption for project
export async function POST(
  request: NextRequest,
  { params }: ProjectCaptionsRouteParams
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
      (member: any) => member.userId === session.user.id
    );
    const isOwner = project.ownerId === session.user.id;
    const canManage =
      isOwner ||
      (isMember &&
        ["owner", "manager"].includes(
          project.members.find((m: any) => m.userId === session.user.id)?.role
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
      createdBy: session.user.id,
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
export async function PATCH(
  request: NextRequest,
  { params }: ProjectCaptionsRouteParams
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
      (member: any) => member.userId === session.user.id
    );
    const isOwner = project.ownerId === session.user.id;
    const canManage =
      isOwner ||
      (isMember &&
        ["owner", "manager"].includes(
          project.members.find((m: any) => m.userId === session.user.id)?.role
        ));

    if (!canManage) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    // Update caption
    const updateData: any = {
      caption,
      updatedAt: new Date(),
    };

    if (platform) updateData.platform = platform;
    if (context !== undefined) updateData.context = context;
    if (carIds) updateData.carIds = carIds;
    if (eventIds) updateData.eventIds = eventIds;

    const result = await db
      .collection("project_captions")
      .updateOne({ _id: captionObjectId, projectId: id }, { $set: updateData });

    if (result.matchedCount === 0) {
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

// DELETE - Remove caption from project
export async function DELETE(
  request: NextRequest,
  { params }: ProjectCaptionsRouteParams
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
      (member: any) => member.userId === session.user.id
    );
    const isOwner = project.ownerId === session.user.id;
    const canManage =
      isOwner ||
      (isMember &&
        ["owner", "manager"].includes(
          project.members.find((m: any) => m.userId === session.user.id)?.role
        ));

    if (!canManage) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    // Delete caption
    const result = await db
      .collection("project_captions")
      .deleteOne({ _id: captionObjectId, projectId: id });

    if (result.deletedCount === 0) {
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
