import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { dbConnect } from "@/lib/mongodb";
import { Deliverable } from "@/models/Deliverable";

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

    // Use a default firebase_uid since we're relaxing validation
    const defaultFirebaseUid = "system";

    // Relaxed validation - only require title
    for (let i = 0; i < deliverables.length; i++) {
      const deliverable = deliverables[i];

      if (!deliverable.title) {
        console.log(
          `Deliverable ${i} missing required field: title`,
          deliverable
        );
        return NextResponse.json(
          {
            error: `Deliverable at index ${i} missing required field: title`,
          },
          { status: 400 }
        );
      }

      // Validate date formats if provided
      if (deliverable.edit_deadline) {
        try {
          new Date(deliverable.edit_deadline);
        } catch (error) {
          console.log(
            `Deliverable ${i} has invalid edit_deadline format:`,
            error
          );
          return NextResponse.json(
            {
              error: `Deliverable at index ${i} has invalid edit_deadline format`,
            },
            { status: 400 }
          );
        }
      }

      if (deliverable.release_date) {
        try {
          new Date(deliverable.release_date);
        } catch (error) {
          console.log(
            `Deliverable ${i} has invalid release_date format:`,
            error
          );
          return NextResponse.json(
            {
              error: `Deliverable at index ${i} has invalid release_date format`,
            },
            { status: 400 }
          );
        }
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

    // Create all deliverables in parallel with relaxed defaults
    const deliverablePromises = deliverables.map(
      async (deliverableData, index) => {
        try {
          console.log(
            `📝 Creating relaxed deliverable ${index}: "${deliverableData.title}"`
          );

          // Generate default deadline if not provided (7 days from now)
          const defaultDeadline = new Date();
          defaultDeadline.setDate(defaultDeadline.getDate() + 7);

          const deliverable = new Deliverable({
            car_id: new ObjectId(carId),
            title: deliverableData.title,
            description: deliverableData.description || "",

            // Platform handling - allow null/unassigned for later assignment
            platform: deliverableData.platform || "Other",
            platform_id: deliverableData.platform_id
              ? new ObjectId(deliverableData.platform_id)
              : undefined,

            // Type handling - allow null/unassigned for later assignment
            type: deliverableData.type || "Video",
            mediaTypeId: deliverableData.mediaTypeId
              ? new ObjectId(deliverableData.mediaTypeId)
              : undefined,

            // Technical details with sensible defaults
            duration: deliverableData.duration || 0,
            actual_duration: deliverableData.actual_duration,
            aspect_ratio: deliverableData.aspect_ratio || "16:9",

            // Assignment details with defaults
            firebase_uid: deliverableData.firebase_uid || defaultFirebaseUid,
            editor: deliverableData.editor || "Unassigned",
            status: deliverableData.status || "not_started",

            // Date handling with defaults
            edit_dates: deliverableData.edit_dates || [],
            edit_deadline: deliverableData.edit_deadline
              ? new Date(deliverableData.edit_deadline)
              : defaultDeadline,
            release_date: deliverableData.release_date
              ? new Date(deliverableData.release_date)
              : new Date(defaultDeadline.getTime() + 86400000), // +1 day from deadline

            // Optional fields
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
            `✅ Saved relaxed deliverable ${index}: "${saved.title}"`
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
      message: `Successfully created ${createdDeliverables.length} deliverables with relaxed validation`,
      deliverables: createdDeliverables,
      count: createdDeliverables.length,
      info: "Deliverables created with minimal validation. Platform and editor assignments can be updated later.",
    });
  } catch (error) {
    console.error("Error creating relaxed batch deliverables:", error);
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
