import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    console.log("Testing simple cars endpoint...");

    const client = await clientPromise;
    const db = client.db();

    // Simple query - just count the cars
    const carsCount = await db.collection("cars").countDocuments();
    const firstCar = await db.collection("cars").findOne({});

    return NextResponse.json({
      status: "success",
      count: carsCount,
      firstCarId: firstCar ? firstCar._id.toString() : null,
      message: "Successfully queried cars collection",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Cars test endpoint failed:", error);

    return NextResponse.json(
      {
        status: "error",
        message: "Failed to query cars collection",
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
