import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { Car } from "@/types/inventory";
import { ObjectId } from "mongodb";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    let ids: string[] = [];

    try {
      const { searchParams } = new URL(request.url);
      ids = searchParams.get("ids")?.split(",") || [];
    } catch (urlError) {
      console.error("Error parsing URL:", urlError, request.url);
      return NextResponse.json(
        { error: "Invalid URL format" },
        { status: 400 }
      );
    }

    if (ids.length === 0) {
      return NextResponse.json({ cars: [] });
    }

    const client = await clientPromise;
    const DB_NAME = process.env.MONGODB_DB || "motive_archive";
    const db = client.db(DB_NAME);
    const carsCollection = db.collection("cars");

    const cars = await carsCollection
      .find({
        _id: {
          $in: ids.map((id) => new ObjectId(id)),
        },
      })
      .sort({ make: 1, model: 1, year: -1 })
      .toArray();

    return NextResponse.json({
      cars: cars.map((car) => ({
        ...car,
        _id: car._id.toString(),
      })),
    });
  } catch (error) {
    console.error("Error fetching cars:", error);
    return NextResponse.json(
      { error: "Failed to fetch cars" },
      { status: 500 }
    );
  }
}
