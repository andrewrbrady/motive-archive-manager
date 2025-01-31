// app/api/cars/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Car } from "@/models/Car";
import { connectToDatabase } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "48");
    const skip = (page - 1) * pageSize;

    // Build query based on search parameters
    const query: Record<string, any> = {};
    if (searchParams.get("make")) query.make = searchParams.get("make");
    if (searchParams.get("model")) query.model = searchParams.get("model");
    if (searchParams.get("year"))
      query.year = parseInt(searchParams.get("year")!);
    if (searchParams.get("status")) query.status = searchParams.get("status");

    const { db } = await connectToDatabase();

    // Execute queries in parallel
    const [total, cars] = await Promise.all([
      db.collection("cars").countDocuments(query),
      db
        .collection("cars")
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageSize)
        .toArray(),
    ]);

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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { db } = await connectToDatabase();

    // Add creation timestamp
    const carDoc = {
      ...body,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection("cars").insertOne(carDoc);
    const car = await db.collection("cars").findOne({ _id: result.insertedId });

    return NextResponse.json(car, { status: 201 });
  } catch (error: any) {
    console.error("Error creating car:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create car" },
      { status: 500 }
    );
  }
}
