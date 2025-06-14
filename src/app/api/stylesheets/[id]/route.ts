import { NextRequest, NextResponse } from "next/server";
import { searchClasses, filterClassesByCategory } from "@/lib/css-parser";
import { StylesheetResponse, ClassSearchResponse } from "@/types/stylesheet";

// Import the in-memory storage (in production, this would be a database query)
// For now, we'll need to access the stylesheets array from the main route
// In a real implementation, this would be replaced with database operations

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
 * Helper function to find stylesheet by ID
 * In production, this would be a database query
 */
async function findStylesheetById(id: string) {
  // TODO: Replace with actual database query
  // This is a placeholder implementation
  return {
    id,
    name: "Sample Stylesheet",
    clientId: "client-1",
    clientName: "Sample Client",
    cssContent: `
      .container { background-color: #ffffff; padding: 40px; }
      .header { background-color: #1A234E; color: white; padding: 40px; }
      .intro-text { font-size: 22px; color: #1a1a1a; text-align: center; }
      .cta-button { background-color: #000; color: #fff; padding: 18px 40px; border-radius: 50px; }
    `,
    parsedCSS: {
      classes: [
        {
          name: "container",
          selector: ".container",
          properties: { "background-color": "#ffffff", padding: "40px" },
          description: "container, background styling, spacing",
          category: "layout",
        },
        {
          name: "header",
          selector: ".header",
          properties: {
            "background-color": "#1A234E",
            color: "white",
            padding: "40px",
          },
          description: "header, background styling, text color, spacing",
          category: "structure",
        },
        {
          name: "intro-text",
          selector: ".intro-text",
          properties: {
            "font-size": "22px",
            color: "#1a1a1a",
            "text-align": "center",
          },
          description: "text content, typography, text alignment",
          category: "typography",
        },
        {
          name: "cta-button",
          selector: ".cta-button",
          properties: {
            "background-color": "#000",
            color: "#fff",
            padding: "18px 40px",
            "border-radius": "50px",
          },
          description:
            "button, background styling, text color, spacing, borders",
          category: "buttons",
        },
      ] as any,
      variables: {},
      globalStyles: {},
    },
    isDefault: false,
    isActive: true,
    uploadedAt: new Date(),
    updatedAt: new Date(),
    uploadedBy: "user-1",
    description: "Sample stylesheet for testing",
    version: "1.0.0",
    tags: ["sample", "test"],
  };
}
