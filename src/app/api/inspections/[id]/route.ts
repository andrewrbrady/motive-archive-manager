import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { UpdateInspectionRequest } from "@/types/inspection";

// GET /api/inspections/[id] - Get a specific inspection
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: inspectionId } = await params;

    if (!ObjectId.isValid(inspectionId)) {
      return NextResponse.json(
        { error: "Invalid inspection ID" },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const inspection = await db
      .collection("inspections")
      .findOne({ _id: new ObjectId(inspectionId) });

    if (!inspection) {
      return NextResponse.json(
        { error: "Inspection not found" },
        { status: 404 }
      );
    }

    // Sanitize the response
    const sanitizedInspection = {
      ...inspection,
      _id: inspection._id.toString(),
      carId: inspection.carId.toString(),
    };

    return NextResponse.json({ inspection: sanitizedInspection });
  } catch (error) {
    console.error("Error fetching inspection:", error);
    return NextResponse.json(
      { error: "Failed to fetch inspection" },
      { status: 500 }
    );
  }
}

// PUT /api/inspections/[id] - Update a specific inspection
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: inspectionId } = await params;

    if (!ObjectId.isValid(inspectionId)) {
      return NextResponse.json(
        { error: "Invalid inspection ID" },
        { status: 400 }
      );
    }

    const body: Partial<UpdateInspectionRequest> = await request.json();
    const db = await getDatabase();

    // Check if inspection exists
    const existingInspection = await db
      .collection("inspections")
      .findOne({ _id: new ObjectId(inspectionId) });

    if (!existingInspection) {
      return NextResponse.json(
        { error: "Inspection not found" },
        { status: 404 }
      );
    }

    // Prepare update data
    const updateData: any = {
      updatedAt: new Date(),
    };

    // Only update fields that are provided
    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined)
      updateData.description = body.description;
    if (body.status !== undefined) {
      if (!["pass", "needs_attention"].includes(body.status)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      }
      updateData.status = body.status;
    }
    if (body.inspectionImageIds !== undefined)
      updateData.inspectionImageIds = body.inspectionImageIds;
    if (body.dropboxVideoFolderUrl !== undefined)
      updateData.dropboxVideoFolderUrl = body.dropboxVideoFolderUrl;
    if (body.dropboxImageFolderUrl !== undefined)
      updateData.dropboxImageFolderUrl = body.dropboxImageFolderUrl;
    if (body.inspectedBy !== undefined)
      updateData.inspectedBy = body.inspectedBy;

    // Handle checklist items with proper ID generation
    if (body.checklistItems !== undefined) {
      updateData.checklistItems = body.checklistItems.map((item) => ({
        ...item,
        id: item.id || new ObjectId().toString(),
        completed: item.completed || false,
      }));
    }

    // Update the inspection
    const result = await db
      .collection("inspections")
      .updateOne({ _id: new ObjectId(inspectionId) }, { $set: updateData });

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: "Inspection not found" },
        { status: 404 }
      );
    }

    // Fetch the updated inspection
    const updatedInspection = await db
      .collection("inspections")
      .findOne({ _id: new ObjectId(inspectionId) });

    if (!updatedInspection) {
      throw new Error("Failed to retrieve updated inspection");
    }

    // Sanitize the response
    const sanitizedInspection = {
      ...updatedInspection,
      _id: updatedInspection._id.toString(),
      carId: updatedInspection.carId.toString(),
    };

    return NextResponse.json({ inspection: sanitizedInspection });
  } catch (error) {
    console.error("Error updating inspection:", error);
    return NextResponse.json(
      { error: "Failed to update inspection" },
      { status: 500 }
    );
  }
}

// DELETE /api/inspections/[id] - Delete a specific inspection
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: inspectionId } = await params;

    if (!ObjectId.isValid(inspectionId)) {
      return NextResponse.json(
        { error: "Invalid inspection ID" },
        { status: 400 }
      );
    }

    // Parse request body to check if images should be deleted
    let deleteImages = false;
    try {
      const body = await request.json();
      deleteImages = body?.deleteImages === true;
    } catch (error) {
      // Body parsing failed, continue with default deleteImages = false
    }

    const db = await getDatabase();

    // Check if inspection exists and get its data
    const inspection = await db
      .collection("inspections")
      .findOne({ _id: new ObjectId(inspectionId) });

    if (!inspection) {
      return NextResponse.json(
        { error: "Inspection not found" },
        { status: 404 }
      );
    }

    // Prepare response data
    const responseData: {
      message: string;
      imagesDeleted?: number;
      imageDeleteErrors?: Array<{ id: string; error: string }>;
    } = {
      message: "Inspection deleted successfully",
    };

    // Delete images from Cloudflare if requested and images exist
    if (
      deleteImages &&
      inspection.inspectionImageIds &&
      inspection.inspectionImageIds.length > 0
    ) {
      const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
      const apiToken = process.env.CLOUDFLARE_API_TOKEN;

      if (!accountId || !apiToken) {
        console.warn(
          "Cloudflare credentials not configured, skipping image deletion"
        );
      } else {
        let imagesDeleted = 0;
        const imageDeleteErrors: Array<{ id: string; error: string }> = [];

        console.log(
          `Deleting ${inspection.inspectionImageIds.length} images from Cloudflare`
        );

        for (const imageId of inspection.inspectionImageIds) {
          try {
            const response = await fetch(
              `https://api.cloudflare.com/client/v4/accounts/${accountId}/images/v1/${imageId}`,
              {
                method: "DELETE",
                headers: {
                  Authorization: `Bearer ${apiToken}`,
                },
              }
            );

            const result = await response.json();

            if (result.success) {
              imagesDeleted++;
              console.log(
                `Successfully deleted image ${imageId} from Cloudflare`
              );
            } else {
              console.error(
                `Failed to delete image ${imageId} from Cloudflare:`,
                result.errors
              );
              imageDeleteErrors.push({
                id: imageId,
                error:
                  result.errors?.[0]?.message || "Unknown Cloudflare error",
              });
            }
          } catch (error) {
            console.error(
              `Error deleting image ${imageId} from Cloudflare:`,
              error
            );
            imageDeleteErrors.push({
              id: imageId,
              error: error instanceof Error ? error.message : "Network error",
            });
          }
        }

        responseData.imagesDeleted = imagesDeleted;
        if (imageDeleteErrors.length > 0) {
          responseData.imageDeleteErrors = imageDeleteErrors;
        }

        // Also delete the images from the main images collection if they exist
        try {
          const deleteFromMainCollection = await db
            .collection("images")
            .deleteMany({
              cloudflareId: { $in: inspection.inspectionImageIds },
            });

          console.log(
            `Deleted ${deleteFromMainCollection.deletedCount} images from main collection`
          );
        } catch (error) {
          console.error("Error deleting images from main collection:", error);
        }
      }
    }

    // Delete the inspection
    const result = await db
      .collection("inspections")
      .deleteOne({ _id: new ObjectId(inspectionId) });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: "Inspection not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(responseData);
  } catch (error) {
    console.error("Error deleting inspection:", error);
    return NextResponse.json(
      { error: "Failed to delete inspection" },
      { status: 500 }
    );
  }
}
