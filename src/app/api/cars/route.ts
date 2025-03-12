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

    // DATABASE CONNECTION DEBUGGING
    console.log("=== DATABASE CONNECTION DEBUGGING ===");
    try {
      const client = await clientPromise;

      // List all databases
      const adminDb = client.db().admin();
      const dbInfo = await adminDb.listDatabases();
      console.log(
        "Available databases:",
        dbInfo.databases.map((db) => db.name)
      );

      // Get current database name from environment or use default
      const DB_NAME = process.env.MONGODB_DB || "motive_archive";
      console.log("Using database from environment or default:", DB_NAME);

      // Get connected to the correct database, not the default "test" database
      const db = client.db(DB_NAME);
      console.log("Currently connected to database:", db.databaseName);

      // List all collections
      const collections = await db.listCollections().toArray();
      console.log(
        "Available collections:",
        collections.map((c) => c.name)
      );

      // Check for various collection name possibilities
      const possibleCollectionNames = [
        "cars",
        "Cars",
        "car",
        "Car",
        "vehicles",
        "Vehicles",
      ];
      for (const collName of possibleCollectionNames) {
        if (!collections.find((c) => c.name === collName)) continue;
        const count = await db.collection(collName).countDocuments({});
        console.log(`Collection "${collName}" has ${count} documents`);
      }

      const carsCollection = db.collection("cars");

      // Log the connection string (partially redacted)
      const connStr = process.env.MONGODB_URI || "";
      const redactedConnStr = connStr.replace(/:([^@/]+)@/, ":****@");
      console.log("MongoDB connection string (redacted):", redactedConnStr);

      // Try a direct query with no limits to see if anything returns
      const firstFiveCars = await carsCollection.find({}).limit(5).toArray();
      console.log(
        "First 5 cars query returned:",
        firstFiveCars.length,
        "documents"
      );
      if (firstFiveCars.length > 0) {
        console.log("Sample car document keys:", Object.keys(firstFiveCars[0]));
      }

      // Build query
      const query: any = {};

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

      // Enhanced fuzzy search implementation
      if (search && search.trim() !== "") {
        const searchTerm = search.trim();

        // Split search terms for multi-term searching
        const searchTerms = searchTerm
          .split(/\s+/)
          .filter((term) => term && term.length > 1);

        const searchConditions = [];

        // If we have multiple terms, we'll handle them specially
        if (searchTerms.length > 0) {
          // Process potential year patterns (4 digits)
          const yearTerms = searchTerms
            .filter((term) => /^\d{4}$/.test(term))
            .map((term) => parseInt(term));

          // Process VIN patterns (alphanumeric patterns that might be VINs)
          const vinTerms = searchTerms.filter((term) =>
            /^[A-Za-z0-9]{5,17}$/.test(term)
          );

          // Process remaining text terms
          const textTerms = searchTerms.filter(
            (term) => !/^\d{4}$/.test(term) && !/^[A-Za-z0-9]{5,17}$/.test(term)
          );

          // Build text search conditions
          if (textTerms.length > 0) {
            // Create regex for each term - case insensitive
            const regexTerms = textTerms.map(
              (term) =>
                new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")
            );

            // For each regex term, search across all text fields
            for (const regexTerm of regexTerms) {
              searchConditions.push(
                { make: { $regex: regexTerm } },
                { model: { $regex: regexTerm } },
                { color: { $regex: regexTerm } },
                { interior_color: { $regex: regexTerm } },
                { condition: { $regex: regexTerm } },
                { location: { $regex: regexTerm } },
                { type: { $regex: regexTerm } },
                { description: { $regex: regexTerm } },
                { "engine.type": { $regex: regexTerm } },
                { "clientInfo.name": { $regex: regexTerm } },
                { "clientInfo.contact": { $regex: regexTerm } },
                { "clientInfo.notes": { $regex: regexTerm } },
                { "engine.features": { $regex: regexTerm } }
              );
            }
          }

          // Add year-specific search
          if (yearTerms.length > 0) {
            searchConditions.push(...yearTerms.map((year) => ({ year })));
          }

          // Add VIN-specific search
          if (vinTerms.length > 0) {
            for (const vinTerm of vinTerms) {
              searchConditions.push({
                vin: { $regex: new RegExp(vinTerm, "i") },
              });
            }
          }

          // Add raw search term as a fallback for partial matches
          if (searchTerm.length > 2) {
            const rawRegex = new RegExp(
              searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
              "i"
            );
            searchConditions.push(
              { make: { $regex: rawRegex } },
              { model: { $regex: rawRegex } },
              { vin: { $regex: rawRegex } },
              { color: { $regex: rawRegex } },
              { interior_color: { $regex: rawRegex } },
              { location: { $regex: rawRegex } },
              { description: { $regex: rawRegex } },
              { "clientInfo.name": { $regex: rawRegex } }
            );
          }
        } else {
          // For a single search term we can be more efficient
          const singleTermRegex = new RegExp(
            searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
            "i"
          );

          // Check if it's a year
          if (/^\d{4}$/.test(searchTerm)) {
            searchConditions.push({ year: parseInt(searchTerm) });
          }

          // Add text searches for all key fields
          searchConditions.push(
            { make: { $regex: singleTermRegex } },
            { model: { $regex: singleTermRegex } },
            { vin: { $regex: singleTermRegex } },
            { color: { $regex: singleTermRegex } },
            { interior_color: { $regex: singleTermRegex } },
            { location: { $regex: singleTermRegex } },
            { type: { $regex: singleTermRegex } },
            { description: { $regex: singleTermRegex } },
            { "engine.type": { $regex: singleTermRegex } },
            { "clientInfo.name": { $regex: singleTermRegex } },
            { "clientInfo.contact": { $regex: singleTermRegex } }
          );

          // Try to parse as numbers for numerical fields
          const numericValue = parseFloat(searchTerm);
          if (!isNaN(numericValue)) {
            searchConditions.push(
              { year: numericValue },
              { "price.listPrice": numericValue },
              { "price.soldPrice": numericValue },
              { "mileage.value": numericValue },
              { horsepower: numericValue }
            );
          }
        }

        // Apply the search conditions with $or operator
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
          // Use $or to match both ObjectId and string client IDs
          query.$or = [
            { client: new ObjectId(clientId) },
            { client: clientId },
          ];
        } catch (error) {
          console.error("Invalid client ID format:", error);
          // If the ID is invalid, just use the string version
          query.client = clientId;
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
        debug: {
          databaseName: db.databaseName,
          collectionsAvailable: collections.map((c) => c.name),
          totalCarsInCollection,
          environment: process.env.NODE_ENV,
          vercelUrl: process.env.VERCEL_URL || "not set",
        },
      });
    } catch (dbError) {
      console.error("DATABASE ERROR:", dbError);
      return NextResponse.json(
        {
          error: "Database error",
          details: dbError instanceof Error ? dbError.message : String(dbError),
          stack: dbError instanceof Error ? dbError.stack : undefined,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error fetching cars:", error);
    return NextResponse.json(
      { error: "Failed to fetch cars" },
      { status: 500 }
    );
  }
}
