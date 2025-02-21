import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function PUT(
  request: Request,
  { params }: { params: { id: string; shotId: string } }
) {
  try {
    const { db } = await connectToDatabase();
    const data = await request.json();

    const result = await db.collection("shots").findOneAndUpdate(
      { _id: new ObjectId(params.shotId), carId: params.id },
      {
        $set: {
          title: data.title,
          description: data.description,
          angle: data.angle,
          lighting: data.lighting,
          notes: data.notes,
          updatedAt: new Date(),
        },
      },
      { returnDocument: "after" }
    );

    if (!result) {
      return NextResponse.json({ error: "Shot not found" }, { status: 404 });
    }

    return NextResponse.json({
      ...result,
      id: result._id.toString(),
    });
  } catch (error) {
    console.error("Error updating shot:", error);
    return NextResponse.json(
      { error: "Failed to update shot" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string; shotId: string } }
) {
  try {
    const { db } = await connectToDatabase();
    const data = await request.json();

    const result = await db.collection("shots").findOneAndUpdate(
      { _id: new ObjectId(params.shotId), carId: params.id },
      {
        $set: {
          ...data,
          updatedAt: new Date(),
        },
      },
      { returnDocument: "after" }
    );

    if (!result) {
      return NextResponse.json({ error: "Shot not found" }, { status: 404 });
    }

    return NextResponse.json({
      ...result,
      id: result._id.toString(),
    });
  } catch (error) {
    console.error("Error updating shot:", error);
    return NextResponse.json(
      { error: "Failed to update shot" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string; shotId: string } }
) {
  try {
    const { db } = await connectToDatabase();

    const result = await db.collection("shots").deleteOne({
      _id: new ObjectId(params.shotId),
      carId: params.id,
    });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Shot not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting shot:", error);
    return NextResponse.json(
      { error: "Failed to delete shot" },
      { status: 500 }
    );
  }
}
