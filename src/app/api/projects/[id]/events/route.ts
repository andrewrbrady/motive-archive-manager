import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { Event, DbEvent } from "@/types/event";
import { EventModel } from "@/models/Event";
import {
  withFirebaseAuth,
  verifyFirebaseToken,
} from "@/lib/firebase-auth-middleware";

// ✅ PERFORMANCE FIX: Use ISR for project events
export const revalidate = 300; // 5 minutes

async function getProjectEvents(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  console.time("getProjectEvents");

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

    // Parse query parameters for server-side filtering and pagination
    const url = new URL(request.url);
    const includeCars = url.searchParams.get("includeCars") === "true";
    const limit = parseInt(url.searchParams.get("limit") || "50");
    const offset = parseInt(url.searchParams.get("offset") || "0");

    console.time("getProjectEvents-db-connect");
    const db = await getDatabase();
    console.timeEnd("getProjectEvents-db-connect");

    // ⚡ OPTIMIZED: Use indexed query with field projection
    console.time("getProjectEvents-project-check");
    const project = await db.collection("projects").findOne(
      {
        _id: new ObjectId(projectId),
        $or: [{ ownerId: userId }, { "members.userId": userId }],
      },
      {
        projection: { _id: 1, ownerId: 1, members: 1 }, // Only get fields we need
      }
    );
    console.timeEnd("getProjectEvents-project-check");

    if (!project) {
      return NextResponse.json(
        { error: "Project not found or access denied" },
        { status: 404 }
      );
    }

    // ⚡ OPTIMIZED: Parallel fetch with field projection and pagination
    console.time("getProjectEvents-fetch-events");
    const [createdEventsResult, attachmentsResult] = await Promise.all([
      // Get events created directly for this project with field projection
      db
        .collection("events")
        .find({ project_id: projectId })
        .project({
          _id: 1,
          project_id: 1,
          car_id: 1,
          type: 1,
          title: 1,
          description: 1,
          url: 1,
          start: 1,
          end: 1,
          is_all_day: 1,
          teamMemberIds: 1,
          location_id: 1,
          primary_image_id: 1,
          image_ids: 1,
          created_by: 1,
          created_at: 1,
          updated_at: 1,
        })
        .sort({ start: -1 })
        .skip(offset)
        .limit(limit)
        .toArray(),

      // Get attached events from project_events collection
      db
        .collection("project_events")
        .find({ project_id: new ObjectId(projectId) })
        .project({ event_id: 1 })
        .toArray(),
    ]);
    console.timeEnd("getProjectEvents-fetch-events");

    // ⚡ OPTIMIZED: Batch fetch attached events if any exist
    let attachedEvents: any[] = [];
    if (attachmentsResult.length > 0) {
      console.time("getProjectEvents-fetch-attached");
      const attachedEventIds = attachmentsResult.map((a) => a.event_id);

      attachedEvents = await db
        .collection("events")
        .find({ _id: { $in: attachedEventIds } })
        .project({
          _id: 1,
          project_id: 1,
          car_id: 1,
          type: 1,
          title: 1,
          description: 1,
          url: 1,
          start: 1,
          end: 1,
          is_all_day: 1,
          teamMemberIds: 1,
          location_id: 1,
          primary_image_id: 1,
          image_ids: 1,
          created_by: 1,
          created_at: 1,
          updated_at: 1,
        })
        .sort({ start: -1 })
        .skip(offset)
        .limit(limit)
        .toArray();
      console.timeEnd("getProjectEvents-fetch-attached");
    }

    // Combine both sets of events
    const allEvents = [
      ...createdEventsResult,
      ...attachedEvents.map((event) => ({
        ...event,
        project_id: projectId, // Ensure project_id is set for attached events
      })),
    ];

    // Remove duplicates (in case an event is both created for and attached to the project)
    const uniqueEvents = allEvents.filter(
      (event, index, self) =>
        index ===
        self.findIndex((e) => e._id.toString() === event._id.toString())
    );

    // ⚡ OPTIMIZED: Batch fetch car data if requested
    let carsMap: Map<string, any> = new Map();
    if (includeCars && uniqueEvents.length > 0) {
      console.time("getProjectEvents-fetch-cars");

      const carIds = uniqueEvents
        .map((event) => event.car_id)
        .filter((id) => id && ObjectId.isValid(id))
        .map((id) => new ObjectId(id));

      if (carIds.length > 0) {
        const cars = await db
          .collection("cars")
          .find({ _id: { $in: carIds } })
          .project({
            _id: 1,
            make: 1,
            model: 1,
            year: 1,
            primaryImageId: 1,
          })
          .toArray();

        cars.forEach((car) => {
          carsMap.set(car._id.toString(), {
            _id: car._id.toString(),
            make: car.make,
            model: car.model,
            year: car.year,
            primaryImageId: car.primaryImageId?.toString(),
          });
        });
      }
      console.timeEnd("getProjectEvents-fetch-cars");
    }

    // Transform events to API format with optional car data
    const eventModel = new EventModel(db);
    const transformedEvents = uniqueEvents.map((event) => {
      const apiEvent = eventModel.transformToApiEvent(event);

      // Add car data if requested and available
      if (includeCars && event.car_id && carsMap.has(event.car_id)) {
        (apiEvent as any).car = carsMap.get(event.car_id);
        (apiEvent as any).isAttached = event.project_id !== projectId;
      }

      return apiEvent;
    });

    console.timeEnd("getProjectEvents");

    return NextResponse.json({
      events: transformedEvents,
      total: transformedEvents.length,
      limit,
      offset,
      hasMore: transformedEvents.length === limit,
    });
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
