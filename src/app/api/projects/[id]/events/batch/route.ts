import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { EventType } from "@/types/event";
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

    // Create all events with project_id
    const eventsToCreate = events.map((event) => ({
      id: new ObjectId().toString(),
      project_id: projectId,
      car_id: event.car_id || null, // Optional car association
      type: event.type || EventType.OTHER,
      title: event.title,
      description: event.description || "",
      url: event.url || "",
      start: event.start || new Date().toISOString(),
      end: event.end || null,
      isAllDay: event.isAllDay || false,
      teamMemberIds: event.teamMemberIds || [],
      locationId: event.locationId || null,
      primaryImageId: event.primaryImageId || null,
      imageIds: event.imageIds || [],
      createdBy: event.createdBy || "system",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

    // Insert all events
    const result = await db.collection("events").insertMany(eventsToCreate);

    const createdEvents = await db
      .collection("events")
      .find({
        _id: { $in: Object.values(result.insertedIds) },
      })
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
    const isAdmin =
      tokenData.tokenType !== "api_token" &&
      Array.isArray(tokenData.roles) &&
      tokenData.roles.includes("admin");

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
      isAdmin,
    });

    // Check if user has write access to this project
    // Admins can access any project, others need to be owner or member with permissions
    const projectQuery: any = { _id: new ObjectId(projectId) };
    if (!isAdmin) {
      projectQuery.$or = [
        { ownerId: userId },
        {
          members: {
            $elemMatch: {
              userId: userId,
              permissions: { $in: ["write", "manage_timeline"] },
            },
          },
        },
      ];
    }

    const project = await db.collection("projects").findOne(projectQuery);

    console.log("🔍 Project found:", !!project);

    if (!project) {
      // Additional debugging - check if project exists at all
      const projectExists = await db.collection("projects").findOne({
        _id: new ObjectId(projectId),
      });

      console.log(
        "🔍 Project exists without permission check:",
        !!projectExists
      );
      if (projectExists) {
        console.log("🔍 Project owner:", projectExists.ownerId);
        console.log("🔍 Project members:", projectExists.members);
      }

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
