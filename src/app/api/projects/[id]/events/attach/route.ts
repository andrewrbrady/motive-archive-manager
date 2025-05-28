import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import {
  withFirebaseAuth,
  verifyFirebaseToken,
} from "@/lib/firebase-auth-middleware";

export const dynamic = "force-dynamic";

async function attachEventToProject(
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
      $or: [{ ownerId: userId }, { "members.userId": userId }],
    });

    if (!project) {
      return NextResponse.json(
        { error: "Project not found or access denied" },
        { status: 404 }
      );
    }

    // Check if event exists
    const event = await db.collection("events").findOne({
      _id: new ObjectId(eventId),
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Check if event is already attached to this project
    const existingAttachment = await db.collection("project_events").findOne({
      project_id: new ObjectId(projectId),
      event_id: new ObjectId(eventId),
    });

    if (existingAttachment) {
      return NextResponse.json(
        { error: "Event is already attached to this project" },
        { status: 400 }
      );
    }

    // If event has a car_id, check if we should update the event's primary image
    if (event.car_id) {
      try {
        const car = await db.collection("cars").findOne({
          _id: new ObjectId(event.car_id),
        });

        // If car has a primary image and event doesn't have one, set it
        if (car?.primaryImageId && !event.primary_image_id) {
          await db.collection("events").updateOne(
            { _id: new ObjectId(eventId) },
            {
              $set: {
                primary_image_id: new ObjectId(car.primaryImageId),
                updated_at: new Date(),
              },
            }
          );
        }
      } catch (error) {
        console.warn("Could not update event primary image:", error);
        // Continue with attachment even if image update fails
      }
    }

    // Create the attachment
    await db.collection("project_events").insertOne({
      project_id: new ObjectId(projectId),
      event_id: new ObjectId(eventId),
      attached_by: userId,
      attached_at: new Date(),
    });

    // Update the project's eventIds array if it doesn't already include this event
    await db.collection("projects").updateOne(
      {
        _id: new ObjectId(projectId),
        eventIds: { $ne: eventId },
      },
      { $push: { eventIds: eventId } }
    );

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error attaching event to project:", error);
    return NextResponse.json(
      {
        error: "Failed to attach event",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// Export the wrapped function
export const POST = withFirebaseAuth<any>(attachEventToProject);
