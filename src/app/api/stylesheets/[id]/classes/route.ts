import { NextRequest, NextResponse } from "next/server";
import { searchClasses, filterClassesByCategory } from "@/lib/css-parser";
import { ClassSearchResponse } from "@/types/stylesheet";

/**
 * GET /api/stylesheets/[id]/classes
 * Search and filter CSS classes within a stylesheet
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;

    const query = searchParams.get("query") || "";
    const category = searchParams.get("category") || "";
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Get the stylesheet (placeholder implementation)
    const stylesheet = await findStylesheetById(id);

    if (!stylesheet) {
      return NextResponse.json(
        { error: "Stylesheet not found" },
        { status: 404 }
      );
    }

    let classes = stylesheet.parsedCSS.classes;

    // Apply search filter
    if (query) {
      classes = searchClasses(classes, query);
    }

    // Apply category filter
    if (category) {
      classes = filterClassesByCategory(classes, category);
    }

    // Get all available categories
    const allCategories = Array.from(
      new Set(
        stylesheet.parsedCSS.classes.map(
          (cls: any) => cls.category || "general"
        )
      )
    ).sort() as string[];

    // Apply pagination
    const paginatedClasses = classes.slice(offset, offset + limit);

    const response: ClassSearchResponse = {
      classes: paginatedClasses,
      total: classes.length,
      categories: allCategories,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error searching classes:", error);
    return NextResponse.json(
      { error: "Failed to search classes" },
      { status: 500 }
    );
  }
}

/**
 * Helper function to find stylesheet by ID
 * Uses the same Mongoose model approach as other stylesheet endpoints
 */
async function findStylesheetById(id: string) {
  // Import here to avoid circular dependencies
  const { dbConnect } = await import("@/lib/mongodb");
  const { Stylesheet } = await import("@/models/Stylesheet");

  try {
    await dbConnect();

    // Try to fetch using Mongoose model (prioritize custom id field)
    let stylesheet: any = await Stylesheet.findOne({ id: id }).lean();

    // If not found by custom id, try by MongoDB _id
    if (!stylesheet) {
      stylesheet = await Stylesheet.findOne({ _id: id }).lean();
    }

    if (stylesheet) {
      return {
        id: stylesheet.id || stylesheet._id.toString(),
        name: stylesheet.name,
        clientId: stylesheet.clientId,
        clientName: stylesheet.clientName,
        cssContent: stylesheet.cssContent,
        parsedCSS: stylesheet.parsedCSS,
        createdAt: stylesheet.createdAt,
        updatedAt: stylesheet.updatedAt,
      };
    }
  } catch (error) {
    console.error("Database error:", error);
  }

  // Fallback to demo stylesheet if requesting the demo ID or if database fails
  if (id === "demo-stylesheet-1") {
    return {
      id: "demo-stylesheet-1",
      name: "Demo Newsletter Styles",
      clientId: "demo-client",
      clientName: "Demo Client",
      cssContent: `
        .container { background-color: #ffffff; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; background-color: #1A234E; padding: 40px 20px; color: white; border-radius: 8px; }
        .intro-text { font-size: 22px; color: #1a1a1a; text-align: center; margin: 40px 0; line-height: 1.4; font-weight: 600; padding: 20px; }
        .curatorial-quote { font-size: 22px; color: #1a1a1a; text-align: center; margin: 0; font-style: italic; line-height: 1.5; font-weight: 500; }
        .services-title { color: #1a1a1a; font-size: 42px; font-weight: 900; text-align: center; margin: 60px 0 50px 0; letter-spacing: 3px; text-transform: uppercase; }
        .cta-button { display: inline-block; background-color: #000; color: #fff; text-decoration: none; padding: 18px 40px; border-radius: 50px; font-weight: 700; font-size: 16px; text-align: center; margin: 20px 0; letter-spacing: 1px; }
        .newsletter-title { color: #1a1a1a; font-size: 24px; font-weight: 700; margin: 0 0 20px 0; text-align: center; }
        .footer { text-align: center; margin-top: 40px; padding-top: 30px; border-top: 1px solid #e0e0e0; color: #666; font-size: 14px; }
      `,
      parsedCSS: {
        classes: [
          {
            name: "container",
            selector: ".container",
            properties: {
              "background-color": "#ffffff",
              padding: "40px",
              "border-radius": "8px",
              "box-shadow": "0 2px 10px rgba(0,0,0,0.1)",
            },
            description: "container, background styling, spacing, borders",
            category: "layout",
          },
          {
            name: "header",
            selector: ".header",
            properties: {
              "text-align": "center",
              "background-color": "#1A234E",
              padding: "40px 20px",
              color: "white",
              "border-radius": "8px",
            },
            description:
              "header, text alignment, background styling, text color, spacing, borders",
            category: "structure",
          },
          {
            name: "intro-text",
            selector: ".intro-text",
            properties: {
              "font-size": "22px",
              color: "#1a1a1a",
              "text-align": "center",
              margin: "40px 0",
              "line-height": "1.4",
              "font-weight": "600",
              padding: "20px",
            },
            description: "text content, typography, text alignment, spacing",
            category: "typography",
          },
          {
            name: "curatorial-quote",
            selector: ".curatorial-quote",
            properties: {
              "font-size": "22px",
              color: "#1a1a1a",
              "text-align": "center",
              margin: "0",
              "font-style": "italic",
              "line-height": "1.5",
              "font-weight": "500",
            },
            description: "text content, typography, text alignment",
            category: "typography",
          },
          {
            name: "services-title",
            selector: ".services-title",
            properties: {
              color: "#1a1a1a",
              "font-size": "42px",
              "font-weight": "900",
              "text-align": "center",
              margin: "60px 0 50px 0",
              "letter-spacing": "3px",
              "text-transform": "uppercase",
            },
            description: "heading, typography, text alignment, spacing",
            category: "typography",
          },
          {
            name: "cta-button",
            selector: ".cta-button",
            properties: {
              display: "inline-block",
              "background-color": "#000",
              color: "#fff",
              "text-decoration": "none",
              padding: "18px 40px",
              "border-radius": "50px",
              "font-weight": "700",
              "font-size": "16px",
              "text-align": "center",
              margin: "20px 0",
              "letter-spacing": "1px",
            },
            description:
              "button, layout, background styling, text color, spacing, borders, typography, text alignment",
            category: "buttons",
          },
          {
            name: "newsletter-title",
            selector: ".newsletter-title",
            properties: {
              color: "#1a1a1a",
              "font-size": "24px",
              "font-weight": "700",
              margin: "0 0 20px 0",
              "text-align": "center",
            },
            description: "heading, typography, text alignment, spacing",
            category: "typography",
          },
          {
            name: "footer",
            selector: ".footer",
            properties: {
              "text-align": "center",
              "margin-top": "40px",
              "padding-top": "30px",
              "border-top": "1px solid #e0e0e0",
              color: "#666",
              "font-size": "14px",
            },
            description:
              "footer, text alignment, spacing, borders, text color, typography",
            category: "structure",
          },
        ] as any,
        variables: {},
        globalStyles: {},
      },
      isDefault: true,
      isActive: true,
      uploadedAt: new Date(),
      updatedAt: new Date(),
      uploadedBy: "system",
      description: "Sample newsletter styles for demonstration",
      version: "1.0.0",
      tags: ["demo", "newsletter", "sample"],
    };
  }

  // TODO: Replace with actual database query for other stylesheets
  return null;
}
