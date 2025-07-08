import { NextRequest, NextResponse } from "next/server";
import { searchClasses, filterClassesByCategory } from "@/lib/css-parser";
import {
  StylesheetResponse,
  ClassSearchResponse,
  UpdateStylesheetRequest,
} from "@/types/stylesheet";
import { Stylesheet } from "@/models/Stylesheet";
import { dbConnect } from "@/lib/mongodb";
import { parseCSS } from "@/lib/css-parser";

/**
 * GET /api/stylesheets/[id]
 * Get a specific stylesheet by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // TODO: Replace with actual database query
    // For now, we'll simulate finding the stylesheet
    const stylesheet = await findStylesheetById(id);

    if (!stylesheet) {
      return NextResponse.json(
        { error: "Stylesheet not found" },
        { status: 404 }
      );
    }

    const response: StylesheetResponse = {
      stylesheet,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching stylesheet:", error);
    return NextResponse.json(
      { error: "Failed to fetch stylesheet" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/stylesheets/[id]
 * Update an existing stylesheet
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body: UpdateStylesheetRequest = await request.json();

    await dbConnect();

    // Find existing stylesheet
    const existingStylesheet = await Stylesheet.findOne({ id });
    if (!existingStylesheet) {
      return NextResponse.json(
        { error: "Stylesheet not found" },
        { status: 404 }
      );
    }

    // Validate required fields if they're being updated
    if (body.name !== undefined && !body.name.trim()) {
      return NextResponse.json(
        { error: "Name cannot be empty" },
        { status: 400 }
      );
    }

    // Allow empty CSS content but provide a default comment
    if (body.cssContent !== undefined && typeof body.cssContent !== "string") {
      return NextResponse.json(
        { error: "CSS content must be a string" },
        { status: 400 }
      );
    }

    // Prepare update data
    const updateData: any = {
      updatedAt: new Date(),
    };

    // Update name if provided
    if (body.name !== undefined) {
      updateData.name = body.name.trim();
    }

    // Update description if provided
    if (body.description !== undefined) {
      updateData.description = body.description;
    }

    // Update version if provided
    if (body.version !== undefined) {
      updateData.version = body.version;
    }

    // Update tags if provided
    if (body.tags !== undefined) {
      updateData.tags = body.tags;
    }

    // Update isDefault if provided
    if (body.isDefault !== undefined) {
      updateData.isDefault = body.isDefault;
    }

    // Update isActive if provided
    if (body.isActive !== undefined) {
      updateData.isActive = body.isActive;
    }

    // Handle CSS content update - re-parse if changed
    if (body.cssContent !== undefined) {
      // Provide a default comment for empty CSS content
      const cssContentToSave =
        body.cssContent.trim() || "/* Empty stylesheet */";
      updateData.cssContent = cssContentToSave;
      updateData.parsedCSS = parseCSS(cssContentToSave);
    }

    // Update the stylesheet in database
    const updatedStylesheet = await Stylesheet.findOneAndUpdate(
      { id },
      updateData,
      { new: true }
    );

    if (!updatedStylesheet) {
      return NextResponse.json(
        { error: "Failed to update stylesheet" },
        { status: 500 }
      );
    }

    // Convert to ClientStylesheet format for response
    const responseStylesheet = {
      id: updatedStylesheet.id,
      name: updatedStylesheet.name,
      clientId: updatedStylesheet.clientId,
      clientName: updatedStylesheet.clientName,
      cssContent: updatedStylesheet.cssContent,
      parsedCSS: updatedStylesheet.parsedCSS,
      isDefault: updatedStylesheet.isDefault,
      isActive: updatedStylesheet.isActive,
      uploadedAt: updatedStylesheet.uploadedAt,
      updatedAt: updatedStylesheet.updatedAt,
      uploadedBy: updatedStylesheet.uploadedBy,
      description: updatedStylesheet.description,
      version: updatedStylesheet.version,
      tags: updatedStylesheet.tags,
    };

    const response: StylesheetResponse = {
      stylesheet: responseStylesheet,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error updating stylesheet:", error);
    return NextResponse.json(
      { error: "Failed to update stylesheet" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/stylesheets/[id]
 * Soft delete a stylesheet by setting isActive to false
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await dbConnect();

    // Prevent deletion of demo stylesheet
    if (id === "demo-stylesheet-1") {
      return NextResponse.json(
        { error: "Cannot delete demo stylesheet" },
        { status: 403 }
      );
    }

    // Find existing stylesheet
    const existingStylesheet = await Stylesheet.findOne({ id });
    if (!existingStylesheet) {
      return NextResponse.json(
        { error: "Stylesheet not found" },
        { status: 404 }
      );
    }

    // Soft delete by setting isActive to false
    const deletedStylesheet = await Stylesheet.findOneAndUpdate(
      { id },
      {
        isActive: false,
        updatedAt: new Date(),
      },
      { new: true }
    );

    if (!deletedStylesheet) {
      return NextResponse.json(
        { error: "Failed to delete stylesheet" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Stylesheet deleted successfully",
      id: deletedStylesheet.id,
    });
  } catch (error) {
    console.error("Error deleting stylesheet:", error);
    return NextResponse.json(
      { error: "Failed to delete stylesheet" },
      { status: 500 }
    );
  }
}

/**
 * Helper function to find stylesheet by ID from database
 */
async function findStylesheetById(id: string) {
  try {
    await dbConnect();

    // Find stylesheet by id field (not MongoDB _id)
    const stylesheet = await Stylesheet.findOne({ id });

    if (!stylesheet) {
      return null;
    }

    // Convert to ClientStylesheet format
    return {
      id: stylesheet.id,
      name: stylesheet.name,
      clientId: stylesheet.clientId,
      clientName: stylesheet.clientName,
      cssContent: stylesheet.cssContent,
      parsedCSS: stylesheet.parsedCSS,
      isDefault: stylesheet.isDefault,
      isActive: stylesheet.isActive,
      uploadedAt: stylesheet.uploadedAt,
      updatedAt: stylesheet.updatedAt,
      uploadedBy: stylesheet.uploadedBy,
      description: stylesheet.description,
      version: stylesheet.version,
      tags: stylesheet.tags,
    };
  } catch (error) {
    console.error("Error finding stylesheet by ID:", error);
    return null;
  }
}
