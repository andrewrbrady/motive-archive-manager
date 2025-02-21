import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { db } = await connectToDatabase();
    const data = await request.json();

    const result = await db.collection("shotTemplates").findOneAndUpdate(
      { _id: new ObjectId(params.id) },
      {
        $set: {
          name: data.name,
          description: data.description,
          shots: data.shots,
          updatedAt: new Date(),
        },
      },
      { returnDocument: "after" }
    );

    if (!result) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ...result,
      id: result._id.toString(),
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

    const result = await db.collection("shotTemplates").deleteOne({
      _id: new ObjectId(params.id),
    });

    if (result.deletedCount === 0) {
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
