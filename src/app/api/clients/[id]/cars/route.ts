import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const segments = url.pathname.split("/");
    const id = segments[segments.length - 2]; // /clients/[id]/cars

    // Validate client ID
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid client ID format" },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const client = await db.collection("clients").findOne({
      _id: new ObjectId(id),
    });

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const cars = await db
      .collection("cars")
      .find({ clientId: new ObjectId(id) })
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json(
      cars.map((car) => ({
        ...car,
        id: car._id.toString(),
        clientId: car.clientId.toString(),
      }))
    );
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch client's cars" },
      { status: 500 }
    );
  }
}

export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
