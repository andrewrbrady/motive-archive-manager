import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

export async function POST(
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

    const { id: projectId } = await params;
    const { eventId } = await request.json();

    if (!ObjectId.isValid(projectId)) {
      return NextResponse.json(
        { error: "Invalid project ID" },
        { status: 400 }
      );
    }

    if (!ObjectId.isValid(eventId)) {
      return NextResponse.json({ error: "Invalid event ID" }, { status: 400 });
    }

    const db = await getDatabase();

    // Check if user has access to this project
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

    // Check if event is attached to this project
    const attachment = await db.collection("project_events").findOne({
      project_id: new ObjectId(projectId),
      event_id: new ObjectId(eventId),
    });

    if (!attachment) {
      return NextResponse.json(
        { error: "Event is not attached to this project" },
        { status: 400 }
      );
    }

    // Remove the attachment
    await db.collection("project_events").deleteOne({
      project_id: new ObjectId(projectId),
      event_id: new ObjectId(eventId),
    });

    // Remove the event from the project's eventIds array
    await db
      .collection("projects")
      .updateOne(
        { _id: new ObjectId(projectId) },
        { $pull: { eventIds: eventId } }
      );

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error detaching event from project:", error);
    return NextResponse.json(
      {
        error: "Failed to detach event",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
