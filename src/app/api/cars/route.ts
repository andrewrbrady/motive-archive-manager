// app/api/cars/route.ts
import { NextResponse } from "next/server";
import { Car } from "@/models/Car";
import clientPromise from "@/lib/mongodb";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log("Creating car with data:", JSON.stringify(body, null, 2));

    // Connect to the database
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB || "motive_archive");

    // Ensure dimensions are properly structured
    if (body.dimensions) {
      // Ensure GVWR has proper structure
      if (body.dimensions.gvwr && typeof body.dimensions.gvwr === "object") {
        body.dimensions.gvwr = {
          value: body.dimensions.gvwr.value || null,
          unit: body.dimensions.gvwr.unit || "lbs",
        };
      }

      // Ensure weight has proper structure
      if (
        body.dimensions.weight &&
        typeof body.dimensions.weight === "object"
      ) {
        body.dimensions.weight = {
          value: body.dimensions.weight.value || null,
          unit: body.dimensions.weight.unit || "lbs",
        };
      }
    }

    // Create a new car document
    const result = await db.collection("cars").insertOne(body);
    const car = await db.collection("cars").findOne({ _id: result.insertedId });

    console.log("Created car:", JSON.stringify(car, null, 2));
    return NextResponse.json(car, { status: 201 });
  } catch (error) {
    console.error("Error creating car:", error);
    return NextResponse.json(
      { error: "Failed to create car" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    // Connect to the database
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB || "motive_archive");

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "48");
    const skip = (page - 1) * pageSize;

    // Build query based on search parameters
    const query: any = {};
    if (searchParams.get("make")) query.make = searchParams.get("make");
    if (searchParams.get("model")) query.model = searchParams.get("model");
    if (searchParams.get("year"))
      query.year = parseInt(searchParams.get("year")!);
    if (searchParams.get("status")) query.status = searchParams.get("status");

    // Get total count for pagination
    const total = await db.collection("cars").countDocuments(query);

    // Get cars with pagination
    const cars = await db
      .collection("cars")
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .toArray();

    return NextResponse.json({
      cars,
      total,
      page,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error("Error fetching cars:", error);
    return NextResponse.json(
      { error: "Failed to fetch cars" },
      { status: 500 }
    );
  }
}
