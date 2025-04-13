import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";

import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const segments = url.pathname.split("/");
    const id = segments[segments.length - 2];

    const { db } = await connectToDatabase();
    const shotLists = await db
      .collection("shotLists")
      .find({ carId: id })
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

export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    const segments = url.pathname.split("/");
    const id = segments[segments.length - 2];

    const { db } = await connectToDatabase();
    const data = await request.json();

    const result = await db.collection("shotLists").insertOne({
      carId: id,
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

export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
