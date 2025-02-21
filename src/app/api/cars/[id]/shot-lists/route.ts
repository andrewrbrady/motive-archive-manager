import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { db } = await connectToDatabase();
    const shotLists = await db
      .collection("shotLists")
      .find({ carId: params.id })
      .toArray();

    return NextResponse.json(
      shotLists.map((list) => ({
        ...list,
        id: list._id.toString(),
      }))
    );
  } catch (error) {
    console.error("Error fetching shot lists:", error);
    return NextResponse.json(
      { error: "Failed to fetch shot lists" },
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

    const result = await db.collection("shotLists").insertOne({
      carId: params.id,
      name: data.name,
      description: data.description,
      shots: data.shots.map((shot: any) => ({
        ...shot,
        completed: false,
      })),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json({
      id: result.insertedId.toString(),
      ...data,
    });
  } catch (error) {
    console.error("Error creating shot list:", error);
    return NextResponse.json(
      { error: "Failed to create shot list" },
      { status: 500 }
    );
  }
}
