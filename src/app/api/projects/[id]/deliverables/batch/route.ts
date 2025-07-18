import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { dbConnect } from "@/lib/mongodb";
import { Deliverable } from "@/models/Deliverable";
import { Project } from "@/models/Project";

export async function POST(
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

    const { deliverables } = await request.json();

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
        return NextResponse.json(
          {
            error: `Deliverable at index ${i} missing required fields: title, platform, type, edit_deadline`,
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
        return NextResponse.json(
          {
            error: `Deliverable at index ${i} has invalid date format`,
          },
          { status: 400 }
        );
      }
    }

    await dbConnect();

    // Check if project exists
    const project = await Project.findById(projectId);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Create all deliverables
    const createdDeliverables = [];
    const deliverableIds = [];

    for (const deliverableData of deliverables) {
      const deliverable = new Deliverable({
        car_id: deliverableData.car_id
          ? new ObjectId(deliverableData.car_id)
          : undefined,
        title: deliverableData.title,
        description: deliverableData.description || "",
        platform: deliverableData.platform,
        type: deliverableData.type,
        duration: deliverableData.duration || 0,
        actual_duration: deliverableData.actual_duration,
        aspect_ratio: deliverableData.aspect_ratio || "16:9",
        firebase_uid: deliverableData.firebase_uid || "",
        editor: deliverableData.editor || "",
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

      const savedDeliverable = await deliverable.save();
      createdDeliverables.push(savedDeliverable.toPublicJSON());
      deliverableIds.push((savedDeliverable._id as any).toString());
    }

    // Add deliverable IDs to project
    if (!project.deliverableIds) {
      project.deliverableIds = [];
    }
    project.deliverableIds.push(...deliverableIds);
    project.updatedAt = new Date();
    await project.save();

    return NextResponse.json({
      message: `Successfully created ${createdDeliverables.length} deliverables`,
      deliverables: createdDeliverables,
      count: createdDeliverables.length,
    });
  } catch (error) {
    console.error("Error creating batch deliverables:", error);
    return NextResponse.json(
      { error: "Failed to create deliverables" },
      { status: 500 }
    );
  }
}
