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
    const shots = await db.collection("shots").find({ carId: id }).toArray();

    return NextResponse.json(
      shots.map((shot) => ({
        ...shot,
        id: shot._id.toString(),
      }))
    );
  } catch (error) {
    console.error("Error creating shot:", error);
    return NextResponse.json(
      { error: "Failed to create shot" },
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
