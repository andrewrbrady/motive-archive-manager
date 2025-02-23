// app/api/cars/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Car } from "@/models/Car";
import { getDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import { Car as InventoryCar } from "@/types/inventory";

interface StandardizedCar {
  _id: string;
  price: {
    listPrice: number | null;
    soldPrice?: number | null;
    priceHistory: Array<{
      type: "list" | "sold";
      price: number | null;
      date: string;
      notes?: string;
    }>;
  };
  year: number;
  mileage: {
    value: number;
    unit: string;
  };
  status: string;
  imageIds: string[];
  images: Array<{
    _id: string;
    car_id: string;
    [key: string]: any;
  }>;
  client: string | null;
  clientInfo: {
    _id: string;
    [key: string]: any;
  } | null;
  createdAt: string;
  updatedAt: string;
  [key: string]: any;
}

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
    return NextResponse.json(
      {
        _id: result.insertedId,
        ...data,
      },
      { status: 201 }
    );
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
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "48");
    const search = searchParams.get("search") || "";
    const sort = searchParams.get("sort") || "createdAt_desc";

    // Get filter parameters
    const make = searchParams.get("make");
    const minYear = searchParams.get("minYear");
    const maxYear = searchParams.get("maxYear");
    const clientId = searchParams.get("clientId");
    const minPrice = searchParams.get("minPrice");
    const maxPrice = searchParams.get("maxPrice");

    const client = await clientPromise;
    const db = client.db();
    const carsCollection = db.collection("cars");

    // Build query
    const query: any = {};

    // Add search condition if search term exists
    if (search) {
      const searchTerms = search.split(/\s+/).filter((term) => term);

      // Look for year patterns (4 digits)
      const yearTerms = searchTerms
        .filter((term) => /^\d{4}$/.test(term))
        .map((term) => parseInt(term));

      // Create regex for non-year terms
      const textTerms = searchTerms
        .filter((term) => !/^\d{4}$/.test(term))
        .map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));

      const searchConditions = [];

      // Add text-based searches
      if (textTerms.length > 0) {
        const textRegex = { $regex: textTerms.join("|"), $options: "i" };
        searchConditions.push(
          { make: textRegex },
          { model: textRegex },
          { vin: textRegex },
          { color: textRegex },
          { "manufacturing.series": textRegex },
          { "manufacturing.trim": textRegex }
        );
      }

      // Add year-based searches
      if (yearTerms.length > 0) {
        searchConditions.push(
          ...yearTerms.map((year) => ({
            $or: [{ year: year }, { year: year.toString() }],
          }))
        );
      }

      if (searchConditions.length > 0) {
        query.$or = searchConditions;
      }
    }

    // Add make filter
    if (make) {
      query.make = make;
    }

    // Add year range filter
    if (minYear || maxYear) {
      query.year = {};
      if (minYear) query.year.$gte = parseInt(minYear);
      if (maxYear) query.year.$lte = parseInt(maxYear);
    }

    // Add client filter
    if (clientId) {
      query.client = clientId;
    }

    // Add price range filter
    if (minPrice || maxPrice) {
      query["price.listPrice"] = {};
      if (minPrice) query["price.listPrice"].$gte = parseInt(minPrice);
      if (maxPrice) query["price.listPrice"].$lte = parseInt(maxPrice);
    }

    // Determine sort order
    const [sortField, sortDirection] = sort.split("_");
    const sortOptions: any = {};
    sortOptions[sortField] = sortDirection === "desc" ? -1 : 1;

    // Get total count for pagination
    const totalCount = await carsCollection.countDocuments(query);
    const totalPages = Math.ceil(totalCount / pageSize);

    // Execute query with pagination and sorting
    const cars = await carsCollection
      .find(query)
      .sort(sortOptions)
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .toArray();

    return NextResponse.json({
      cars,
      totalPages,
      currentPage: page,
    });
  } catch (error) {
    console.error("Error fetching cars:", error);
    return NextResponse.json(
      { error: "Failed to fetch cars" },
      { status: 500 }
    );
  }
}
