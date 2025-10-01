import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { DbEvent, EventType } from "@/types/event";
import { EventModel } from "@/models/Event";
import {
  withFirebaseAuth,
  verifyFirebaseToken,
} from "@/lib/firebase-auth-middleware";

export const dynamic = "force-dynamic";

async function createBatchEvents(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;

    if (!ObjectId.isValid(projectId)) {
      return NextResponse.json(
        { error: "Invalid project ID" },
        { status: 400 }
      );
    }

    const { events } = await request.json();

    if (!Array.isArray(events) || events.length === 0) {
      return NextResponse.json(
        { error: "Events must be a non-empty array" },
        { status: 400 }
      );
    }

    // Validate each event
    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      // Only title is required
      if (!event.title) {
        return NextResponse.json(
          {
            error: `Event at index ${i} missing required field: title`,
          },
          { status: 400 }
        );
      }

      // Validate event type only if provided
      if (event.type && !Object.values(EventType).includes(event.type)) {
        return NextResponse.json(
          {
            error: `Event at index ${i} has invalid type: ${event.type}`,
          },
          { status: 400 }
        );
      }

      // Validate date format only if provided
      try {
        if (event.start) {
          new Date(event.start);
        }
        if (event.end) {
          new Date(event.end);
        }
      } catch (error) {
        return NextResponse.json(
          {
            error: `Event at index ${i} has invalid date format`,
          },
          { status: 400 }
        );
      }
    }

    const db = await getDatabase();

    // Check if project exists
    const project = await db
      .collection("projects")
      .findOne({ _id: new ObjectId(projectId) });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const eventModel = new EventModel(db);
    const createdEventIds = [] as ObjectId[];
    const toObjectId = (value: string | ObjectId | null | undefined) =>
      value && ObjectId.isValid(value) ? new ObjectId(value) : undefined;

    for (const event of events) {
      const now = new Date();
      const carId = event.car_id || event.carId;

      const document = {
        projectId: projectId,
        carId: carId || undefined,
        type: event.type || EventType.OTHER,
        title: event.title.trim(),
        description: event.description || "",
        url: event.url || undefined,
        start: event.start ? new Date(event.start) : now,
        end: event.end ? new Date(event.end) : undefined,
        isAllDay: Boolean(event.isAllDay),
        teamMemberIds: Array.isArray(event.teamMemberIds)
          ? event.teamMemberIds
              .filter(
                (id: string | ObjectId) =>
                  (typeof id === "string" && id.trim().length > 0) ||
                  id instanceof ObjectId
              )
              .map((id: string | ObjectId) =>
                id instanceof ObjectId ? id.toString() : id.trim()
              )
          : [],
        locationId: toObjectId(event.location_id || event.locationId),
        primaryImageId: toObjectId(
          event.primary_image_id || event.primaryImageId
        ),
        imageIds: Array.isArray(event.image_ids || event.imageIds)
          ? (event.image_ids || event.imageIds)
              .map((id: string | ObjectId) => toObjectId(id))
              .filter((id: ObjectId | undefined): id is ObjectId => Boolean(id))
          : undefined,
        createdBy: event.createdBy || "system",
      } as Omit<DbEvent, "_id" | "createdAt" | "updatedAt">;

      const insertedId = await eventModel.create(document);
      createdEventIds.push(insertedId);
    }

    const createdEvents = await db
      .collection("events")
      .find({ _id: { $in: createdEventIds } })
      .toArray();

    return NextResponse.json({
      message: `Successfully created ${createdEvents.length} events`,
      events: createdEvents,
      count: createdEvents.length,
    });
  } catch (error) {
    console.error("Error creating batch events:", error);
    return NextResponse.json(
      { error: "Failed to create events" },
      { status: 500 }
    );
  }
}

async function deleteBatchEvents(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authentication is handled by withFirebaseAuth wrapper
    // Get user ID from the request (added by the auth middleware)
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

    const requestBody = await request.json();
    console.log("🔍 Request body:", requestBody);

    const { eventIds } = requestBody;

    if (!Array.isArray(eventIds) || eventIds.length === 0) {
      console.log("🔍 Invalid eventIds:", {
        eventIds,
        isArray: Array.isArray(eventIds),
        length: eventIds?.length,
      });
      return NextResponse.json(
        { error: "Event IDs must be a non-empty array" },
        { status: 400 }
      );
    }

    // Validate all event IDs
    for (let i = 0; i < eventIds.length; i++) {
      const eventId = eventIds[i];
      if (!ObjectId.isValid(eventId)) {
        return NextResponse.json(
          {
            error: `Invalid event ID at index ${i}: ${eventId}`,
          },
          { status: 400 }
        );
      }
    }

    const db = await getDatabase();

    // Debug logging
    console.log("🔍 Batch Delete Debug:", {
      projectId,
      userId,
      tokenType: tokenData.tokenType,
    });

    const project = await db.collection("projects").findOne({
      _id: new ObjectId(projectId),
    });

    console.log("🔍 Project found:", !!project);

    if (!project) {
      // Additional debugging - check if project exists at all
      return NextResponse.json(
        { error: "Project not found or insufficient permissions" },
        { status: 404 }
      );
    }

    const eventModel = new EventModel(db);
    const eventObjectIds = eventIds.map((id: string) => new ObjectId(id));

    // Delete all events in a single operation
    const deleteResult = await db.collection("events").deleteMany({
      _id: { $in: eventObjectIds },
    });

    // Remove the events from the project's eventIds array
    await db
      .collection("projects")
      .updateOne(
        { _id: new ObjectId(projectId) },
        { $pull: { eventIds: { $in: eventIds } } as any }
      );

    return NextResponse.json({
      success: true,
      deletedCount: deleteResult.deletedCount,
      message: `Successfully deleted ${deleteResult.deletedCount} events`,
    });
  } catch (error) {
    console.error("Error deleting batch events:", error);
    return NextResponse.json(
      {
        error: "Failed to delete events",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// Export the wrapped functions
export const POST = withFirebaseAuth<any>(createBatchEvents);
export const DELETE = withFirebaseAuth<any>(deleteBatchEvents);
