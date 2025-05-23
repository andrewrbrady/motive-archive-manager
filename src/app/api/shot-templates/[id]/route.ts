import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";

import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const segments = url.pathname.split("/");
    const id = segments[segments.length - 1];

    const { db } = await connectToDatabase();
    // [REMOVED] // [REMOVED] console.log("GET request for template ID:", id);

    // Check if the ID is a valid ObjectId
    let query;
    try {
      query = { _id: new ObjectId(id) };
      // [REMOVED] // [REMOVED] console.log("Valid ObjectId, using query:", query);
    } catch (error) {
      console.error("Invalid ObjectId format:", error);
      return NextResponse.json({ error: "Invalid ID format" }, { status: 400 });
    }

    const template = await db.collection("shotTemplates").findOne(query);

    if (!template) {
      // [REMOVED] // [REMOVED] console.log("Template not found for ID:", id);
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    // [REMOVED] // [REMOVED] console.log("Template found:", template._id.toString());
    return NextResponse.json({
      ...template,
      id: template._id.toString(),
    });
  } catch (error) {
    console.error("Error fetching shot template:", error);
    return NextResponse.json(
      { error: "Failed to fetch shot template" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const url = new URL(request.url);
    const segments = url.pathname.split("/");
    const id = segments[segments.length - 1];

    const { db } = await connectToDatabase();
    const data = await request.json();
    // [REMOVED] // [REMOVED] console.log("PUT request for template ID:", id);

    // Check if the ID is a valid ObjectId
    let objectId;
    try {
      objectId = new ObjectId(id);
      // [REMOVED] // [REMOVED] console.log("Valid ObjectId:", objectId);
    } catch (error) {
      console.error("Invalid ObjectId format:", error);
      return NextResponse.json({ error: "Invalid ID format" }, { status: 400 });
    }

    // Check if template exists
    const existingTemplate = await db.collection("shotTemplates").findOne({
      _id: objectId,
    });

    if (!existingTemplate) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    const result = await db.collection("shotTemplates").updateOne(
      { _id: objectId },
      {
        $set: {
          name: data.name,
          description: data.description,
          shots: data.shots || [],
          thumbnail: data.thumbnail || null,
          updatedAt: new Date(),
        },
      }
    );

    if (result.matchedCount === 0) {
      // [REMOVED] // [REMOVED] console.log("Template not found for update:", id);
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    // Get the updated template
    const updatedTemplate = await db.collection("shotTemplates").findOne({
      _id: objectId,
    });

    if (!updatedTemplate) {
      return NextResponse.json(
        { error: "Failed to fetch updated template" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ...updatedTemplate,
      id: updatedTemplate._id.toString(),
    });
  } catch (error) {
    console.error("Error updating shot template:", error);
    return NextResponse.json(
      { error: "Failed to update shot template" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const segments = url.pathname.split("/");
    const id = segments[segments.length - 1];

    const { db } = await connectToDatabase();
    // [REMOVED] // [REMOVED] console.log("DELETE request for template ID:", id);

    // Check if the ID is a valid ObjectId
    let objectId;
    try {
      objectId = new ObjectId(id);
      // [REMOVED] // [REMOVED] console.log("Valid ObjectId:", objectId);
    } catch (error) {
      console.error("Invalid ObjectId format:", error);
      return NextResponse.json({ error: "Invalid ID format" }, { status: 400 });
    }

    // Check if template exists
    const existingTemplate = await db.collection("shotTemplates").findOne({
      _id: objectId,
    });

    if (!existingTemplate) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    const result = await db.collection("shotTemplates").deleteOne({
      _id: objectId,
    });

    if (result.deletedCount === 0) {
      // [REMOVED] // [REMOVED] console.log("Template not found for deletion:", id);
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting shot template:", error);
    return NextResponse.json(
      { error: "Failed to delete shot template" },
      { status: 500 }
    );
  }
}

// OPTIONS for CORS
export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
