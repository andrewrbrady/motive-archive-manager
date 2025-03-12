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
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = Math.min(
      parseInt(searchParams.get("pageSize") || "48"),
      96 // Maximum page size
    );
    const search = searchParams.get("search") || "";
    const sort = searchParams.get("sort") || "createdAt_desc";

    console.log("Request parameters:", {
      page,
      pageSize,
      search,
      sort,
      filters: {
        make: searchParams.get("make"),
        minYear: searchParams.get("minYear"),
        maxYear: searchParams.get("maxYear"),
        clientId: searchParams.get("clientId"),
        minPrice: searchParams.get("minPrice"),
        maxPrice: searchParams.get("maxPrice"),
      },
    });

    // Validate page number
    if (page < 1) {
      return NextResponse.json(
        { error: "Invalid page number" },
        { status: 400 }
      );
    }

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
    const query: any = {
      // Remove the createdAt exists filter since documents don't have this field
      // We'll use an empty query object initially, then add filters as needed
    };

    console.log("Received filter parameters:", {
      make,
      minYear,
      maxYear,
      clientId,
      minPrice,
      maxPrice,
      search,
      sort,
    });

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
      if (minYear) {
        const minYearNum = parseInt(minYear);
        if (!isNaN(minYearNum)) {
          query.year.$gte = minYearNum;
        }
      }
      if (maxYear) {
        const maxYearNum = parseInt(maxYear);
        if (!isNaN(maxYearNum)) {
          query.year.$lte = maxYearNum;
        }
      }
      // If no valid year filters were added, remove the empty year query
      if (Object.keys(query.year).length === 0) {
        delete query.year;
      }
    }

    // Add client filter
    if (clientId) {
      try {
        query.client = new ObjectId(clientId);
      } catch (error) {
        console.error("Invalid client ID format:", error);
        // If the ID is invalid, return no results
        query.client = null;
      }
    }

    // Add price range filter
    if (minPrice || maxPrice) {
      query["price.listPrice"] = {};
      if (minPrice) {
        const minPriceNum = parseInt(minPrice);
        if (!isNaN(minPriceNum)) {
          query["price.listPrice"].$gte = minPriceNum;
        }
      }
      if (maxPrice) {
        const maxPriceNum = parseInt(maxPrice);
        if (!isNaN(maxPriceNum)) {
          query["price.listPrice"].$lte = maxPriceNum;
        }
      }
      // If no valid price filters were added, remove the empty price query
      if (Object.keys(query["price.listPrice"]).length === 0) {
        delete query["price.listPrice"];
      }
    }

    // Determine sort order
    const [sortField, sortDirection] = sort.split("_");
    const sortOptions: any = {};

    // Map sort fields to their database counterparts
    const sortFieldMap: { [key: string]: string } = {
      price: "price.listPrice",
      createdAt: "createdAt",
      year: "year",
      make: "make",
      model: "model",
    };

    // Get the actual database field name
    const dbSortField = sortFieldMap[sortField] || "createdAt";

    // If sorting by createdAt but it doesn't exist on documents, use _id as a fallback
    // since MongoDB ObjectIDs have creation time embedded in them
    if (dbSortField === "createdAt") {
      // Check if any car has createdAt field
      const hasCreatedAt = await carsCollection.countDocuments({
        createdAt: { $exists: true },
      });
      if (hasCreatedAt === 0) {
        console.log(
          "No cars have createdAt field, using _id for sorting instead"
        );
        sortOptions["_id"] = sortDirection === "desc" ? -1 : 1;
      } else {
        sortOptions[dbSortField] = sortDirection === "desc" ? -1 : 1;
      }
    } else {
      sortOptions[dbSortField] = sortDirection === "desc" ? -1 : 1;
    }

    console.log("Using sort options:", {
      requestedSort: sort,
      dbField: dbSortField,
      direction: sortDirection,
      finalSortOptions: sortOptions,
      query,
    });

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

    console.log("Final MongoDB query:", JSON.stringify(query, null, 2));
    console.log("Found", cars.length, "cars matching the query");
    console.log("Total cars in database matching query:", totalCount);
    console.log("Total pages:", totalPages, "Page size:", pageSize);

    // Check if there are ANY cars in the collection at all, without filters
    const totalCarsInCollection = await carsCollection.countDocuments({});
    console.log(
      "Total cars in collection (without filters):",
      totalCarsInCollection
    );

    // If there are cars but our query found none, examine the first car to debug
    if (totalCarsInCollection > 0 && cars.length === 0) {
      const sampleCar = await carsCollection.findOne({});
      console.log("Sample car fields:", Object.keys(sampleCar || {}));
      console.log(
        "Sample car (first 500 chars):",
        JSON.stringify(sampleCar).substring(0, 500)
      );
    }

    return NextResponse.json({
      cars,
      totalPages,
      currentPage: page,
      totalCount,
    });
  } catch (error) {
    console.error("Error fetching cars:", error);
    return NextResponse.json(
      { error: "Failed to fetch cars" },
      { status: 500 }
    );
  }
}
