import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { db } = await connectToDatabase();
    const shots = await db
      .collection("shots")
      .find({ carId: params.id })
      .toArray();

    return NextResponse.json(
      shots.map((shot) => ({
        ...shot,
        id: shot._id.toString(),
      }))
    );
  } catch (error) {
    console.error("Error fetching shots:", error);
    return NextResponse.json(
      { error: "Failed to fetch shots" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { db } = await connectToDatabase();
    const data = await request.json();

    const result = await db.collection("shots").insertOne({
      carId: params.id,
      title: data.title,
      description: data.description,
      angle: data.angle,
      lighting: data.lighting,
      notes: data.notes,
      completed: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json({
      id: result.insertedId.toString(),
      ...data,
    });
  } catch (error) {
    console.error("Error creating shot:", error);
    return NextResponse.json(
      { error: "Failed to create shot" },
      { status: 500 }
    );
  }
}
