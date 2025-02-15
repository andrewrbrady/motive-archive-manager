// app/api/cars/route.ts
import { NextResponse } from "next/server";
import { Car } from "@/models/Car";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

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

    // Handle make filter
    if (searchParams.get("make")) {
      query.make = searchParams.get("make");
    }

    // Handle year range filter
    const minYear = searchParams.get("minYear");
    const maxYear = searchParams.get("maxYear");
    if (minYear || maxYear) {
      query.year = {};
      if (minYear) query.year.$gte = parseInt(minYear);
      if (maxYear) query.year.$lte = parseInt(maxYear);
    }

    // Handle price range filter
    const minPrice = searchParams.get("minPrice");
    const maxPrice = searchParams.get("maxPrice");
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = parseInt(minPrice);
      if (maxPrice) query.price.$lte = parseInt(maxPrice);
    }

    // Handle client filter
    if (searchParams.get("clientId")) {
      const clientId = searchParams.get("clientId");
      console.log("Filtering by client ID:", clientId);

      try {
        const clientObjectId = new ObjectId(clientId);
        query.$or = [
          { client: clientObjectId },
          { clientId: clientObjectId },
          { "clientInfo._id": clientObjectId },
          { clientRef: clientObjectId },
        ];
      } catch (error) {
        console.error("Invalid ObjectId format:", error);
        // If the ID is invalid, return no results
        query.client = null;
      }
    }

    // Handle engine features filter
    if (searchParams.get("engineFeatures")) {
      query.engineFeatures = searchParams.get("engineFeatures");
    }

    // Handle status filter
    if (searchParams.get("status")) {
      query.status = searchParams.get("status");
    }

    // Get total count for pagination
    const total = await db.collection("cars").countDocuments(query);

    console.log("MongoDB Query:", JSON.stringify(query, null, 2));

    // Get cars with pagination
    const cars = await db
      .collection("cars")
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .toArray();

    console.log(`Found ${cars.length} cars for query`);
    if (cars.length === 0) {
      // Log a sample car to see the structure
      const sampleCar = await db.collection("cars").findOne({});
      console.log("Sample car client structure:", {
        client: sampleCar?.client,
        clientInfo: sampleCar?.clientInfo,
      });
    }

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
