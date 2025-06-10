import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { dbConnect } from "@/lib/mongodb";
import { Deliverable } from "@/models/Deliverable";
import {
  DeliverableType,
  Platform,
  DeliverableStatus,
} from "@/types/deliverable";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: carId } = await params;

    if (!ObjectId.isValid(carId)) {
      return NextResponse.json({ error: "Invalid car ID" }, { status: 400 });
    }

    const requestBody = await request.json();
    const { deliverables } = requestBody;

    if (!Array.isArray(deliverables) || deliverables.length === 0) {
      return NextResponse.json(
        { error: "Deliverables must be a non-empty array" },
        { status: 400 }
      );
    }

    // Validate each deliverable
    for (let i = 0; i < deliverables.length; i++) {
      const deliverable = deliverables[i];

      if (
        !deliverable.title ||
        !deliverable.platform ||
        !deliverable.type ||
        !deliverable.edit_deadline
      ) {
        console.log(`Deliverable ${i} missing required fields:`, deliverable);
        return NextResponse.json(
          {
            error: `Deliverable at index ${i} missing required fields: title, platform, type, edit_deadline`,
          },
          { status: 400 }
        );
      }

      // Check if firebase_uid is provided and not empty
      if (!deliverable.firebase_uid) {
        console.log(`Deliverable ${i} missing firebase_uid:`, deliverable);
        return NextResponse.json(
          {
            error: `Deliverable at index ${i} missing required field: firebase_uid`,
          },
          { status: 400 }
        );
      }

      // Validate date format
      try {
        new Date(deliverable.edit_deadline);
        if (deliverable.release_date) {
          new Date(deliverable.release_date);
        }
      } catch (error) {
        console.log(`Deliverable ${i} has invalid date format:`, error);
        return NextResponse.json(
          {
            error: `Deliverable at index ${i} has invalid date format`,
          },
          { status: 400 }
        );
      }
    }

    await dbConnect();
    const db = await getDatabase();

    // Check if car exists
    const car = await db
      .collection("cars")
      .findOne({ _id: new ObjectId(carId) });

    if (!car) {
      return NextResponse.json({ error: "Car not found" }, { status: 404 });
    }

    // Create all deliverables in parallel
    const deliverablePromises = deliverables.map(
      async (deliverableData, index) => {
        try {
          console.log(
            `📝 Creating deliverable ${index}: "${deliverableData.title}"`
          );
          console.log(
            `   Platform: "${deliverableData.platform}" (ID: ${deliverableData.platform_id})`
          );
          console.log(
            `   MediaType: "${deliverableData.type}" (ID: ${deliverableData.mediaTypeId})`
          );

          const deliverable = new Deliverable({
            car_id: new ObjectId(carId),
            title: deliverableData.title,
            description: deliverableData.description || "",
            platform: deliverableData.platform,
            platform_id: deliverableData.platform_id
              ? new ObjectId(deliverableData.platform_id)
              : undefined,
            type: deliverableData.type,
            mediaTypeId: deliverableData.mediaTypeId
              ? new ObjectId(deliverableData.mediaTypeId)
              : undefined,
            duration: deliverableData.duration || 0,
            actual_duration: deliverableData.actual_duration,
            aspect_ratio: deliverableData.aspect_ratio || "16:9",
            firebase_uid: deliverableData.firebase_uid,
            editor: deliverableData.editor || "Unassigned",
            status: deliverableData.status || "not_started",
            edit_dates: deliverableData.edit_dates || [],
            edit_deadline: new Date(deliverableData.edit_deadline),
            release_date: deliverableData.release_date
              ? new Date(deliverableData.release_date)
              : new Date(),
            target_audience: deliverableData.target_audience,
            music_track: deliverableData.music_track,
            thumbnail_url: deliverableData.thumbnail_url,
            tags: deliverableData.tags || [],
            publishing_url: deliverableData.publishing_url,
            dropbox_link: deliverableData.dropbox_link,
            social_media_link: deliverableData.social_media_link,
            metrics: deliverableData.metrics,
            assets_location: deliverableData.assets_location,
            priority_level: deliverableData.priority_level,
            scheduled: deliverableData.scheduled || false,
            created_at: new Date(),
            updated_at: new Date(),
          });

          const saved = await deliverable.save();
          console.log(
            `✅ Saved deliverable ${index} with platform_id: ${saved.platform_id}, mediaTypeId: ${saved.mediaTypeId}`
          );
          return saved;
        } catch (saveError) {
          console.error(`Error saving deliverable ${index}:`, saveError);
          throw saveError;
        }
      }
    );

    // Wait for all deliverables to be created in parallel
    const savedDeliverables = await Promise.all(deliverablePromises);
    const createdDeliverables = savedDeliverables.map((d) => d.toPublicJSON());

    return NextResponse.json({
      message: `Successfully created ${createdDeliverables.length} deliverables`,
      deliverables: createdDeliverables,
      count: createdDeliverables.length,
    });
  } catch (error) {
    console.error("Error creating batch deliverables:", error);
    console.error(
      "Error details:",
      error instanceof Error ? error.message : "Unknown error"
    );
    if (error instanceof Error) {
      console.error("Stack trace:", error.stack);
    }
    return NextResponse.json(
      { error: "Failed to create deliverables" },
      { status: 500 }
    );
  }
}
