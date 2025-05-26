import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { Event, EventStatus, DbEvent } from "@/types/event";
import { EventModel } from "@/models/Event";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

export async function GET(
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

    if (!ObjectId.isValid(projectId)) {
      return NextResponse.json(
        { error: "Invalid project ID" },
        { status: 400 }
      );
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

    const eventModel = new EventModel(db);
    const events = await eventModel.findByProjectId(projectId);

    // Transform events to API format
    const transformedEvents = events.map((event) =>
      eventModel.transformToApiEvent(event)
    );

    return NextResponse.json(transformedEvents);
  } catch (error) {
    console.error("Error fetching project events:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch events",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

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

    if (!ObjectId.isValid(projectId)) {
      return NextResponse.json(
        { error: "Invalid project ID" },
        { status: 400 }
      );
    }

    const db = await getDatabase();

    // Check if user has write access to this project
    const project = await db.collection("projects").findOne({
      _id: new ObjectId(projectId),
      $or: [
        { ownerId: session.user.id },
        {
          members: {
            $elemMatch: {
              userId: session.user.id,
              permissions: { $in: ["write", "manage_timeline"] },
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

    const data = await request.json();
    const eventModel = new EventModel(db);

    // Validate required fields
    if (!data.type || !data.start) {
      return NextResponse.json(
        { error: "Type and start date are required" },
        { status: 400 }
      );
    }

    // Convert teamMemberIds to ObjectIds
    const teamMemberIds = (data.teamMemberIds || []).map(
      (id: string) => new ObjectId(id)
    );

    // Create event object
    const eventData: Omit<DbEvent, "_id" | "created_at" | "updated_at"> = {
      project_id: projectId,
      car_id: data.car_id, // Optional - can be associated with specific car in project
      type: data.type,
      description: data.description || "",
      status: data.status || EventStatus.NOT_STARTED,
      start: new Date(data.start),
      end: data.end ? new Date(data.end) : undefined,
      is_all_day: data.isAllDay || false,
      teamMemberIds,
    };

    const newEventId = await eventModel.create(eventData);

    // Update the project's eventIds array
    await db
      .collection("projects")
      .updateOne(
        { _id: new ObjectId(projectId) },
        { $push: { eventIds: newEventId.toString() } as any }
      );

    // Fetch the created event and return it
    const createdEvent = await eventModel.findById(newEventId);
    if (!createdEvent) {
      throw new Error("Failed to retrieve created event");
    }

    return NextResponse.json(eventModel.transformToApiEvent(createdEvent), {
      status: 201,
    });
  } catch (error) {
    console.error("Error creating project event:", error);
    return NextResponse.json(
      {
        error: "Failed to create event",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
