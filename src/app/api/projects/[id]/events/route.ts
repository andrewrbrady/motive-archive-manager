import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { Event, DbEvent } from "@/types/event";
import { EventModel } from "@/models/Event";
import {
  withFirebaseAuth,
  verifyFirebaseToken,
} from "@/lib/firebase-auth-middleware";

export const dynamic = "force-dynamic";

async function getProjectEvents(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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
      $or: [{ ownerId: userId }, { "members.userId": userId }],
    });

    if (!project) {
      return NextResponse.json(
        { error: "Project not found or access denied" },
        { status: 404 }
      );
    }

    const eventModel = new EventModel(db);

    // Get events created directly for this project
    const createdEvents = await eventModel.findByProjectId(projectId);

    // Get attached events from project_events collection
    const attachments = await db
      .collection("project_events")
      .find({
        project_id: new ObjectId(projectId),
      })
      .toArray();

    const attachedEventIds = attachments.map(
      (attachment) => attachment.event_id
    );
    const attachedEvents =
      attachedEventIds.length > 0
        ? await db
            .collection("events")
            .find({
              _id: { $in: attachedEventIds },
            })
            .toArray()
        : [];

    // Combine both sets of events
    const allEvents = [
      ...createdEvents,
      ...attachedEvents.map(
        (event) =>
          ({
            ...event,
            project_id: projectId, // Ensure project_id is set for attached events
          }) as DbEvent
      ),
    ];

    // Remove duplicates (in case an event is both created for and attached to the project)
    const uniqueEvents = allEvents.filter(
      (event, index, self) =>
        index ===
        self.findIndex((e) => e._id.toString() === event._id.toString())
    );

    // Transform events to API format
    const transformedEvents = uniqueEvents.map((event) =>
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

async function createProjectEvent(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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
        { ownerId: userId },
        {
          members: {
            $elemMatch: {
              userId: userId,
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
    if (!data.type || !data.start || !data.title) {
      return NextResponse.json(
        { error: "Type, title, and start date are required" },
        { status: 400 }
      );
    }

    // Convert teamMemberIds to ObjectIds with validation
    const teamMemberIds = (data.teamMemberIds || [])
      .filter((id: string) => id && ObjectId.isValid(id))
      .map((id: string) => new ObjectId(id));

    // Convert image IDs to ObjectIds if provided with validation
    const primaryImageId =
      data.primaryImageId && ObjectId.isValid(data.primaryImageId)
        ? new ObjectId(data.primaryImageId)
        : undefined;
    const imageIds = (data.imageIds || [])
      .filter((id: string) => id && ObjectId.isValid(id))
      .map((id: string) => new ObjectId(id));

    // Convert location ID to ObjectId if provided with validation
    const locationId =
      data.locationId && ObjectId.isValid(data.locationId)
        ? new ObjectId(data.locationId)
        : undefined;

    // Create event object
    const eventData: Omit<DbEvent, "_id" | "created_at" | "updated_at"> = {
      project_id: projectId,
      car_id: data.car_id, // Optional - can be associated with specific car in project
      type: data.type,
      title: data.title.trim(),
      description: data.description || "",
      url: data.url || undefined,
      start: new Date(data.start),
      end: data.end ? new Date(data.end) : undefined,
      is_all_day: data.isAllDay || false,
      teamMemberIds,
      location_id: locationId,
      primary_image_id: primaryImageId,
      image_ids: imageIds.length > 0 ? imageIds : undefined,
      created_by: userId, // Track who created the event
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

// Export the wrapped functions
export const GET = withFirebaseAuth<any>(getProjectEvents);
export const POST = withFirebaseAuth<any>(createProjectEvent);
