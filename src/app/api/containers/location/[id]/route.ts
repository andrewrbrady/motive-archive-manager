import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const segments = url.pathname.split("/");
    const id = segments[segments.length - 1]; // /containers/location/[id]

    // Validate location ID
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid location ID format" },
        { status: 400 }
      );
    }

    const db = await getDatabase();

    // Find location by ID
    const location = await db.collection("locations").findOne({
      _id: new ObjectId(id),
    });

    if (!location) {
      return NextResponse.json(
        { error: "Location not found" },
        { status: 404 }
      );
    }

    // Get containers for this location
    const containers = await db
      .collection("containers")
      .find({ locationId: new ObjectId(id) })
      .toArray();

    // Return location with containers
    return NextResponse.json({
      ...location,
      id: location._id.toString(),
      containers: containers.map((container) => ({
        ...container,
        id: container._id.toString(),
        locationId: container.locationId.toString(),
      })),
    });
  } catch (error) {
    console.error("Error fetching location data:", error);
    return NextResponse.json(
      { error: "Internal server error" },
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
