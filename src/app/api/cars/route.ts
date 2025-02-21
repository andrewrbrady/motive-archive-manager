// app/api/cars/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Car } from "@/models/Car";
import { getDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

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

export async function GET(request: NextRequest) {
  try {
    const db = await getDatabase();
    const searchParams = request.nextUrl.searchParams;

    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "48");
    const skip = (page - 1) * pageSize;

    // Build query based on filters
    const query: any = {};

    // Add make filter
    const make = searchParams.get("make");
    if (make) query.make = make;

    // Add year range filter
    const minYear = searchParams.get("minYear");
    const maxYear = searchParams.get("maxYear");
    if (minYear || maxYear) {
      query.year = {};
      if (minYear) query.year.$gte = parseInt(minYear);
      if (maxYear) query.year.$lte = parseInt(maxYear);
    }

    // Add price range filter
    const minPrice = searchParams.get("minPrice");
    const maxPrice = searchParams.get("maxPrice");
    if (minPrice || maxPrice) {
      query["price.listPrice"] = {};
      if (minPrice) query["price.listPrice"].$gte = parseFloat(minPrice);
      if (maxPrice) query["price.listPrice"].$lte = parseFloat(maxPrice);
    }

    // Add client filter
    const clientId = searchParams.get("clientId");
    if (clientId) {
      query.client = clientId;
    }

    // Get total count for pagination
    const total = await db.collection("cars").countDocuments(query);

    // Add sorting
    const sortParam = searchParams.get("sort") || "createdAt_desc";
    const [sortField, sortDirection] = sortParam.split("_");
    const sortOptions = { asc: 1, desc: -1 };
    const sortQuery = {
      [sortField === "createdAt" ? "_id" : sortField]:
        sortOptions[sortDirection as keyof typeof sortOptions] || -1,
    };

    // Fetch cars with aggregation to include images
    const cars = await db
      .collection("cars")
      .aggregate([
        { $match: query },
        {
          $lookup: {
            from: "images",
            localField: "imageIds",
            foreignField: "_id",
            as: "images",
          },
        },
        { $sort: sortQuery },
        { $skip: skip },
        { $limit: pageSize },
      ])
      .toArray();

    // Log the raw data for debugging
    console.log("Raw cars data sample:", cars[0]);

    // Standardize the response format with defensive checks
    const standardizedCars = cars
      .map((car) => {
        try {
          if (!car) {
            console.warn("Encountered null or undefined car in results");
            return null;
          }

          // Basic car data with defensive checks
          const standardizedCar: StandardizedCar = {
            ...car,
            _id: car._id?.toString() || "unknown",
            price: {
              listPrice:
                typeof car.price === "object"
                  ? car.price.listPrice
                  : typeof car.price === "string"
                  ? parseFloat(car.price)
                  : typeof car.price === "number"
                  ? car.price
                  : null,
              soldPrice:
                typeof car.price === "object" ? car.price.soldPrice : null,
              priceHistory:
                typeof car.price === "object" ? car.price.priceHistory : [],
            },
            year:
              typeof car.year === "string"
                ? parseInt(car.year, 10)
                : car.year || new Date().getFullYear(),
            mileage: car.mileage
              ? {
                  value:
                    typeof car.mileage.value === "string"
                      ? parseFloat(car.mileage.value)
                      : car.mileage.value || 0,
                  unit: car.mileage.unit || "mi",
                }
              : { value: 0, unit: "mi" },
            status: car.status || "available",
            imageIds: [],
            images: [],
            client: null,
            clientInfo: null,
            createdAt: "",
            updatedAt: "",
          };

          // Handle arrays with defensive checks
          if (Array.isArray(car.imageIds)) {
            standardizedCar.imageIds = car.imageIds
              .filter((id) => id != null)
              .map((id) => id?.toString() || "");
          }

          if (Array.isArray(car.images)) {
            standardizedCar.images = car.images
              .filter((img) => img != null)
              .map((img) => ({
                ...img,
                _id: img._id?.toString() || "",
                car_id: img.car_id?.toString() || "",
              }));
          }

          // Handle client info with defensive checks
          standardizedCar.client = car.client?.toString() || null;
          standardizedCar.clientInfo = car.clientInfo
            ? {
                ...car.clientInfo,
                _id: car.clientInfo._id?.toString() || "",
              }
            : null;

          // Handle dates with defensive checks
          standardizedCar.createdAt =
            car.createdAt instanceof Date
              ? car.createdAt.toISOString()
              : car.createdAt || new Date().toISOString();
          standardizedCar.updatedAt =
            car.updatedAt instanceof Date
              ? car.updatedAt.toISOString()
              : car.updatedAt || new Date().toISOString();

          return standardizedCar;
        } catch (error) {
          console.error("Error processing car:", error, "Car data:", car);
          return null;
        }
      })
      .filter(Boolean); // Remove any null entries

    // Log the standardized data for debugging
    console.log("Standardized cars sample:", standardizedCars[0]);

    return NextResponse.json({
      cars: standardizedCars,
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
