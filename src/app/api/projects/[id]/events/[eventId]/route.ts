import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { EventModel } from "@/models/Event";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; eventId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

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

    const eventModel = new EventModel(db);
    const eventObjectId = new ObjectId(eventId);
    const data = await request.json();

    // Ensure teamMemberIds is always an array and convert to ObjectIds
    const teamMemberIds = Array.isArray(data.teamMemberIds)
      ? data.teamMemberIds.map((id: string) => new ObjectId(id))
      : [];

    // Convert image IDs to ObjectIds if provided
    const primaryImageId = data.primaryImageId
      ? new ObjectId(data.primaryImageId)
      : undefined;
    const imageIds = Array.isArray(data.imageIds)
      ? data.imageIds.map((id: string) => new ObjectId(id))
      : [];

    // Convert location ID to ObjectId if provided
    const locationId = data.locationId
      ? new ObjectId(data.locationId)
      : undefined;

    // Map the frontend fields to database fields
    const mappedUpdates: any = {
      updated_at: new Date(),
    };

    if (data.type) mappedUpdates.type = data.type;
    if (data.title !== undefined) mappedUpdates.title = data.title.trim();
    if (data.description !== undefined)
      mappedUpdates.description = data.description;
    if (data.status) mappedUpdates.status = data.status;
    if (data.start) mappedUpdates.start = new Date(data.start);
    if (data.end) mappedUpdates.end = new Date(data.end);
    if (typeof data.isAllDay === "boolean")
      mappedUpdates.is_all_day = data.isAllDay;
    if (data.car_id !== undefined) mappedUpdates.car_id = data.car_id;

    // Handle location field
    if (data.locationId !== undefined) {
      mappedUpdates.location_id = locationId;
    }

    // Handle image fields
    if (data.primaryImageId !== undefined) {
      mappedUpdates.primary_image_id = primaryImageId;
    }
    if (data.imageIds !== undefined) {
      mappedUpdates.image_ids = imageIds.length > 0 ? imageIds : [];
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; eventId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

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

    const eventModel = new EventModel(db);
    const eventObjectId = new ObjectId(eventId);

    const success = await eventModel.delete(eventObjectId);

    if (!success) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Remove the event ID from the project's eventIds array
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
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Methods": "PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
