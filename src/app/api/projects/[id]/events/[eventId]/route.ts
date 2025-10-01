import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { EventModel } from "@/models/Event";
import {
  withFirebaseAuth,
  verifyFirebaseToken,
} from "@/lib/firebase-auth-middleware";

export const dynamic = "force-dynamic";

async function updateProjectEvent(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; eventId: string }> }
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

    const { id: projectId, eventId } = await params;

    if (!ObjectId.isValid(projectId) || !ObjectId.isValid(eventId)) {
      return NextResponse.json(
        { error: "Invalid project ID or event ID" },
        { status: 400 }
      );
    }

    const db = await getDatabase();

    // Check if user has write access to this project
    const project = await db.collection("projects").findOne({
      _id: new ObjectId(projectId),
    });

    if (!project) {
      return NextResponse.json(
        { error: "Project not found or insufficient permissions" },
        { status: 404 }
      );
    }

    const eventModel = new EventModel(db);
    const eventObjectId = new ObjectId(eventId);
    const data = await request.json();

    // Ensure teamMemberIds is always an array of strings (Firebase UIDs)
    const teamMemberIds = Array.isArray(data.teamMemberIds)
      ? data.teamMemberIds
          .filter((id: string) => typeof id === "string" && id.trim().length > 0)
          .map((id: string) => id.trim())
      : [];

    // Convert image IDs to ObjectIds if provided with validation
    const primaryImageId =
      data.primaryImageId && ObjectId.isValid(data.primaryImageId)
        ? new ObjectId(data.primaryImageId)
        : undefined;
    const imageIds = Array.isArray(data.imageIds)
      ? data.imageIds
          .filter((id: string) => id && ObjectId.isValid(id))
          .map((id: string) => new ObjectId(id))
      : [];

    // Convert location ID to ObjectId if provided with validation
    const locationId =
      data.locationId && ObjectId.isValid(data.locationId)
        ? new ObjectId(data.locationId)
        : undefined;

    // Map the frontend fields to database fields
    const mappedUpdates: any = {
      updatedAt: new Date(),
    };

    if (data.type) mappedUpdates.type = data.type;
    if (data.title !== undefined) mappedUpdates.title = data.title.trim();
    if (data.description !== undefined)
      mappedUpdates.description = data.description;
    if (data.url !== undefined) mappedUpdates.url = data.url;
    if (data.start) mappedUpdates.start = new Date(data.start);

    // Handle end date - explicitly check if it's in the data object
    if ("end" in data) {
      mappedUpdates.end = data.end ? new Date(data.end) : null;
    }

    if (typeof data.isAllDay === "boolean")
      mappedUpdates.isAllDay = data.isAllDay;
    if (data.car_id !== undefined || data.carId !== undefined)
      mappedUpdates.carId = (data.carId ?? data.car_id) || undefined;

    // Handle location field
    if (data.locationId !== undefined) {
      mappedUpdates.locationId = locationId;
    }

    // Handle image fields
    if (data.primaryImageId !== undefined) {
      mappedUpdates.primaryImageId = primaryImageId;
    }
    if (data.imageIds !== undefined) {
      mappedUpdates.imageIds = imageIds.length > 0 ? imageIds : [];
    }

    // Always update teamMemberIds array
    mappedUpdates.teamMemberIds = teamMemberIds;

    const success = await eventModel.update(eventObjectId, mappedUpdates);

    if (!success) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Fetch the updated event to return
    const updatedEvent = await eventModel.findById(eventObjectId);
    if (!updatedEvent) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      event: eventModel.transformToApiEvent(updatedEvent),
    });
  } catch (error) {
    console.error("Error updating project event:", error);
    return NextResponse.json(
      {
        error: "Failed to update event",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

async function deleteProjectEvent(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; eventId: string }> }
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

    const { id: projectId, eventId } = await params;

    if (!ObjectId.isValid(projectId) || !ObjectId.isValid(eventId)) {
      return NextResponse.json(
        { error: "Invalid project ID or event ID" },
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

    const eventModel = new EventModel(db);
    const eventObjectId = new ObjectId(eventId);

    const success = await eventModel.delete(eventObjectId);

    if (!success) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Remove the event from the project's eventIds array
    await db
      .collection("projects")
      .updateOne(
        { _id: new ObjectId(projectId) },
        { $pull: { eventIds: eventId } as any }
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting project event:", error);
    return NextResponse.json(
      {
        error: "Failed to delete event",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS(request: Request) {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

// Export the wrapped functions
export const PUT = withFirebaseAuth<any>(updateProjectEvent);
export const DELETE = withFirebaseAuth<any>(deleteProjectEvent);
