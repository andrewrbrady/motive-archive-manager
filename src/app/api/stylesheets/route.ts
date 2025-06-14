import { NextRequest, NextResponse } from "next/server";
import { parseCSS } from "@/lib/css-parser";
import { getAvailableCategories } from "@/lib/css-parser";
import {
  ClientStylesheet,
  CreateStylesheetRequest,
  StylesheetListResponse,
} from "@/types/stylesheet";

// In-memory storage for development (replace with database in production)
const stylesheets: ClientStylesheet[] = [
  // Demo stylesheet with sample CSS
  {
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
      ],
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
  },
];

/**
 * GET /api/stylesheets
 * Retrieve all stylesheets or filter by client
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const clientId = searchParams.get("clientId");
    const includeInactive = searchParams.get("includeInactive") === "true";

    let filteredStylesheets = stylesheets;

    // Filter by client if specified
    if (clientId) {
      filteredStylesheets = stylesheets.filter((s) => s.clientId === clientId);
    }

    // Filter out inactive stylesheets unless requested
    if (!includeInactive) {
      filteredStylesheets = filteredStylesheets.filter(
        (s) => s.isActive !== false
      );
    }

    // Convert to metadata format
    const metadata = filteredStylesheets.map((stylesheet) => ({
      id: stylesheet.id,
      name: stylesheet.name,
      clientId: stylesheet.clientId,
      clientName: stylesheet.clientName,
      isDefault: stylesheet.isDefault,
      isActive: stylesheet.isActive,
      classCount: stylesheet.parsedCSS.classes.length,
      categoryCount: getAvailableCategories(stylesheet.parsedCSS.classes)
        .length,
      uploadedAt: stylesheet.uploadedAt,
      uploadedBy: stylesheet.uploadedBy,
      description: stylesheet.description,
      version: stylesheet.version,
      tags: stylesheet.tags,
    }));

    const response: StylesheetListResponse = {
      stylesheets: metadata,
      total: metadata.length,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching stylesheets:", error);
    return NextResponse.json(
      { error: "Failed to fetch stylesheets" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/stylesheets
 * Upload and parse a new stylesheet
 */
export async function POST(request: NextRequest) {
  try {
    const body: CreateStylesheetRequest = await request.json();

    // Validate required fields
    if (!body.name || !body.cssContent) {
      return NextResponse.json(
        { error: "Name and CSS content are required" },
        { status: 400 }
      );
    }

    // Parse the CSS content
    const parsedCSS = parseCSS(body.cssContent);

    // Create the stylesheet record
    const stylesheet: ClientStylesheet = {
      id: generateId(),
      name: body.name,
      clientId: body.clientId,
      clientName: body.clientId
        ? await getClientName(body.clientId)
        : undefined,
      cssContent: body.cssContent,
      parsedCSS,
      isDefault: body.isDefault || false,
      isActive: true,
      uploadedAt: new Date(),
      updatedAt: new Date(),
      uploadedBy: "current-user", // TODO: Get from auth
      description: body.description,
      version: body.version || "1.0.0",
      tags: body.tags || [],
    };

    // Store the stylesheet
    stylesheets.push(stylesheet);

    return NextResponse.json({ stylesheet }, { status: 201 });
  } catch (error) {
    console.error("Error creating stylesheet:", error);
    return NextResponse.json(
      { error: "Failed to create stylesheet" },
      { status: 500 }
    );
  }
}

/**
 * Helper function to generate unique IDs
 */
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Helper function to get client name (placeholder)
 */
async function getClientName(clientId: string): Promise<string> {
  // TODO: Implement actual client lookup
  return `Client ${clientId}`;
}
