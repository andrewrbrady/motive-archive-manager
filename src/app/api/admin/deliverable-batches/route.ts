import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

// Define interfaces locally for batch management
interface DeliverableTemplate {
  title: string;
  platform_id?: string;
  platform?: string; // Legacy field
  mediaTypeId?: string;
  type?: string; // Legacy field
  duration?: number;
  aspect_ratio: string;
}

interface BatchTemplate {
  name: string;
  templates: DeliverableTemplate[];
}

export async function GET() {
  try {
    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("GET /api/admin/deliverable-batches called");
    const db = await getDatabase();

    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("Connected to database:", db.databaseName);
    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("Checking collection deliverable_batches...");

    // Check if collection exists
    const collections = await db.listCollections().toArray();
    console.log(
      "Available collections:",
      collections.map((c) => c.name)
    );

    const batches = await db
      .collection("deliverable_batches")
      .find({})
      .toArray();
    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("Raw batches from MongoDB:", JSON.stringify(batches, null, 2));
    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("Number of batches found:", batches.length);

    // Return empty array if no batches in DB
    const response = {
      success: true,
      batches: batches || [],
    };

    console.log(
      "Returning MongoDB batches:",
      JSON.stringify(response, null, 2)
    );
    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching batch templates:", error);
    return NextResponse.json(
      { error: "Failed to fetch batch templates" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("POST /api/admin/deliverable-batches called");
    const body = await request.json();
    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("POST body received:", body);
    const { name, templates } = body;

    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("Extracted name:", name);
    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("Extracted templates:", templates);

    if (!name || !templates || !Array.isArray(templates)) {
      // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("Validation failed - missing name or templates");
      return NextResponse.json(
        { error: "Name and templates array are required" },
        { status: 400 }
      );
    }

    const db = await getDatabase();

    // Check if batch already exists
    const existingBatch = await db
      .collection("deliverable_batches")
      .findOne({ name });
    if (existingBatch) {
      // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("Batch already exists:", name);
      return NextResponse.json(
        { error: "Batch template with this name already exists" },
        { status: 409 }
      );
    }

    // Convert string IDs to ObjectIds in templates
    const processedTemplates = templates.map((template: any) => ({
      ...template,
      platform_id: template.platform_id
        ? new ObjectId(template.platform_id)
        : undefined,
      mediaTypeId: template.mediaTypeId
        ? new ObjectId(template.mediaTypeId)
        : undefined,
    }));

    const batchTemplate: BatchTemplate = {
      name,
      templates: processedTemplates,
    };

    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("Creating batch template:", batchTemplate);
    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("About to insert into MongoDB...");

    try {
      const result = await db
        .collection("deliverable_batches")
        .insertOne(batchTemplate);
      // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("MongoDB insert result:", result);
      // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("Batch saved to MongoDB with ID:", result.insertedId);
      // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("Insert acknowledged:", result.acknowledged);

      // Verify the document was actually saved
      const savedDoc = await db
        .collection("deliverable_batches")
        .findOne({ _id: result.insertedId });
      // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("Verification - document found:", !!savedDoc);
      if (savedDoc) {
        // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("Saved document:", JSON.stringify(savedDoc, null, 2));
      }
    } catch (insertError) {
      console.error("MongoDB insert failed:", insertError);
      throw insertError;
    }

    return NextResponse.json({
      success: true,
      batch: batchTemplate,
    });
  } catch (error) {
    console.error("Error creating batch template:", error);
    return NextResponse.json(
      { error: "Failed to create batch template" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("PUT /api/admin/deliverable-batches called");
    const body = await request.json();
    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("PUT body received:", body);
    const { oldName, name, templates } = body;

    if (!oldName || !name || !templates || !Array.isArray(templates)) {
      return NextResponse.json(
        { error: "oldName, name, and templates array are required" },
        { status: 400 }
      );
    }

    const db = await getDatabase();

    // Check if original batch exists
    const existingBatch = await db
      .collection("deliverable_batches")
      .findOne({ name: oldName });
    if (!existingBatch) {
      return NextResponse.json(
        { error: "Batch template not found" },
        { status: 404 }
      );
    }

    // If name is changing, check if new name already exists
    if (oldName !== name) {
      const nameConflict = await db
        .collection("deliverable_batches")
        .findOne({ name });
      if (nameConflict) {
        return NextResponse.json(
          { error: "Batch template with new name already exists" },
          { status: 409 }
        );
      }
    }

    // Convert string IDs to ObjectIds in templates
    const processedTemplates = templates.map((template: any) => ({
      ...template,
      platform_id: template.platform_id
        ? new ObjectId(template.platform_id)
        : undefined,
      mediaTypeId: template.mediaTypeId
        ? new ObjectId(template.mediaTypeId)
        : undefined,
    }));

    const updatedBatch: BatchTemplate = {
      name,
      templates: processedTemplates,
    };

    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("Updating batch template:", updatedBatch);

    // Update the batch (MongoDB will update the same document even if name changes)
    const result = await db
      .collection("deliverable_batches")
      .replaceOne({ name: oldName }, updatedBatch);

    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("Batch updated in MongoDB:", result.modifiedCount);

    return NextResponse.json({
      success: true,
      batch: updatedBatch,
    });
  } catch (error) {
    console.error("Error updating batch template:", error);
    return NextResponse.json(
      { error: "Failed to update batch template" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("DELETE /api/admin/deliverable-batches called");
    const body = await request.json();
    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("DELETE body received:", body);
    const { name } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Batch name is required" },
        { status: 400 }
      );
    }

    const db = await getDatabase();

    // Check if batch exists
    const existingBatch = await db
      .collection("deliverable_batches")
      .findOne({ name });
    if (!existingBatch) {
      return NextResponse.json(
        { error: "Batch template not found" },
        { status: 404 }
      );
    }

    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("Deleting batch template:", name);
    const result = await db
      .collection("deliverable_batches")
      .deleteOne({ name });
    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("Batch deleted from MongoDB:", result.deletedCount);

    return NextResponse.json({
      success: true,
      message: "Batch template deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting batch template:", error);
    return NextResponse.json(
      { error: "Failed to delete batch template" },
      { status: 500 }
    );
  }
}
