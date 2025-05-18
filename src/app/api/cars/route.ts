// app/api/cars/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Car } from "@/models/Car";
import { getDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import { Car as InventoryCar } from "@/types/inventory";
import { getMongoClient } from "@/lib/mongodb";
import { DB_NAME } from "@/constants";
import { MongoPipelineStage } from "@/types/mongodb";
import { StandardizedCar } from "@/types/routes/cars";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const db = await getDatabase();
    const data = await request.json();
    console.log("Creating car with data:", JSON.stringify(data, null, 2));

    // Ensure dimensions are properly structured
    if (data.dimensions) {
      // Ensure GVWR has proper structure
      if (data.dimensions.gvwr && typeof data.dimensions.gvwr === "object") {
        data.dimensions.gvwr = {
          value: data.dimensions.gvwr.value || null,
          unit: data.dimensions.gvwr.unit || "lbs",
        };
      }

      // Ensure weight has proper structure
      if (
        data.dimensions.weight &&
        typeof data.dimensions.weight === "object"
      ) {
        data.dimensions.weight = {
          value: data.dimensions.weight.value || null,
          unit: data.dimensions.weight.unit || "lbs",
        };
      }
    }

    // Create a new car document
    const result = await db.collection("cars").insertOne({
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
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
    const db = await getDatabase();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const sort = searchParams.get("sort") || "createdAt_desc";
    const fieldsParam = searchParams.get("fields");

    // Create projection object for field selection
    const projection: Record<string, 1> = {};
    if (fieldsParam) {
      const fields = fieldsParam.split(",");
      fields.forEach((field) => {
        projection[field] = 1;
      });
    }

    // Build search query
    const query = search
      ? {
          $or: [
            { make: { $regex: search, $options: "i" } },
            { model: { $regex: search, $options: "i" } },
            { year: { $regex: search, $options: "i" } },
          ],
        }
      : {};

    // Parse sort parameter
    const [sortField, sortOrder] = sort.split("_");
    const sortOptions = {
      [sortField === "createdAt" ? "_id" : sortField]:
        sortOrder === "desc" ? -1 : 1,
    } as const;

    const cars = await db
      .collection("cars")
      .find(query)
      .project(projection)
      .sort(sortOptions)
      .limit(50)
      .toArray();

    return NextResponse.json({ cars });
  } catch (error) {
    console.error("Error fetching cars:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to fetch cars", details: errorMessage },
      { status: 500 }
    );
  }
}
