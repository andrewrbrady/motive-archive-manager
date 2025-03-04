import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { db } = await connectToDatabase();
    console.log("GET request for template ID:", params.id);

    // Check if the ID is a valid ObjectId
    let query;
    try {
      query = { _id: new ObjectId(params.id) };
      console.log("Valid ObjectId, using query:", query);
    } catch (error) {
      console.error("Invalid ObjectId format:", error);
      return NextResponse.json({ error: "Invalid ID format" }, { status: 400 });
    }

    const template = await db.collection("shotTemplates").findOne(query);

    if (!template) {
      console.log("Template not found for ID:", params.id);
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    console.log("Template found:", template._id.toString());
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

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { db } = await connectToDatabase();
    const data = await request.json();
    console.log("PUT request for template ID:", params.id);

    // Check if the ID is a valid ObjectId
    let objectId;
    try {
      objectId = new ObjectId(params.id);
      console.log("Valid ObjectId:", objectId);
    } catch (error) {
      console.error("Invalid ObjectId format:", error);
      return NextResponse.json({ error: "Invalid ID format" }, { status: 400 });
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
      console.log("Template not found for update:", params.id);
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    console.log("Template updated successfully:", params.id);
    return NextResponse.json({
      id: params.id,
      ...data,
      updatedAt: new Date(),
    });
  } catch (error) {
    console.error("Error updating shot template:", error);
    return NextResponse.json(
      { error: "Failed to update shot template" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { db } = await connectToDatabase();
    console.log("DELETE request for template ID:", params.id);

    // Check if the ID is a valid ObjectId
    let objectId;
    try {
      objectId = new ObjectId(params.id);
      console.log("Valid ObjectId:", objectId);
    } catch (error) {
      console.error("Invalid ObjectId format:", error);
      return NextResponse.json({ error: "Invalid ID format" }, { status: 400 });
    }

    const result = await db
      .collection("shotTemplates")
      .deleteOne({ _id: objectId });

    if (result.deletedCount === 0) {
      console.log("Template not found for deletion:", params.id);
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    console.log("Template deleted successfully:", params.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting shot template:", error);
    return NextResponse.json(
      { error: "Failed to delete shot template" },
      { status: 500 }
    );
  }
}
