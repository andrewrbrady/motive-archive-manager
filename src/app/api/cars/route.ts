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
    const result = await db.collection("cars").insertOne({
      ...body,
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

      // Log sample cars to understand client data structure
      const sampleCars = await db.collection("cars").find().limit(5).toArray();
      console.log(
        "Sample cars client data:",
        sampleCars.map((car) => ({
          _id: car._id,
          clientFields: {
            client: car.client,
            clientId: car.clientId,
            clientInfo: car.clientInfo,
            clientRef: car.clientRef,
            owner_id: car.owner_id,
            owner: car.owner,
          },
        }))
      );

      // Build query to match both ObjectId and string representations
      const queries: { [key: string]: string | ObjectId }[] = [
        { client: clientId }, // String match
        { clientId: clientId },
        { owner_id: clientId },
        { owner: clientId },
      ];

      try {
        const clientObjectId = new ObjectId(clientId);
        // Add ObjectId matches
        queries.push(
          { client: clientObjectId },
          { clientId: clientObjectId },
          { "clientInfo._id": clientObjectId },
          { clientRef: clientObjectId },
          { owner_id: clientObjectId },
          { owner: clientObjectId },
          { "owner._id": clientObjectId }
        );
      } catch (error) {
        console.error("Invalid ObjectId format:", error);
        // Continue with string-based queries if ObjectId is invalid
      }

      query.$or = queries;
      console.log("Client filter query:", JSON.stringify(query.$or, null, 2));
    }

    // Get total count for pagination
    const total = await db.collection("cars").countDocuments(query);

    console.log("MongoDB Query:", JSON.stringify(query, null, 2));

    // Handle sorting
    const sortParam = searchParams.get("sort") || "createdAt_desc";
    console.log("Sorting with parameter:", sortParam);

    const [sortField, sortDirection] = sortParam.split("_");
    console.log("Sort field:", sortField, "Sort direction:", sortDirection);

    const sortOptions = {
      asc: 1 as const,
      desc: -1 as const,
    };

    // Validate sort field and direction
    const validSortFields = ["createdAt", "price", "year"] as const;
    const validSortDirections = ["asc", "desc"] as const;

    const isValidSort =
      validSortFields.includes(sortField as (typeof validSortFields)[number]) &&
      validSortDirections.includes(
        sortDirection as (typeof validSortDirections)[number]
      );

    // For "Recently Added" sorting, use _id as a fallback since it contains a timestamp
    const sortQuery = isValidSort
      ? sortField === "createdAt"
        ? { _id: sortOptions[sortDirection as keyof typeof sortOptions] }
        : {
            [sortField]: sortOptions[sortDirection as keyof typeof sortOptions],
          }
      : { _id: -1 as const };

    console.log("Final sort query:", sortQuery);

    // Get cars with pagination and sorting
    const cars = await db
      .collection("cars")
      .find(query)
      .sort(sortQuery)
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
