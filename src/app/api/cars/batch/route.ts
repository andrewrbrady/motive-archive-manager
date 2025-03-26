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

    // Convert IDs to ObjectId where possible, handling errors gracefully
    const objectIdArray = [];
    const stringIds = [];

    for (const id of ids) {
      const trimmedId = id.trim();
      if (!trimmedId) continue;

      try {
        objectIdArray.push(new ObjectId(trimmedId));
      } catch (e) {
        console.warn(
          `Invalid ObjectId: ${trimmedId}. Will try string matching.`
        );
        stringIds.push(trimmedId);
      }
    }

    // Count total cars in the database for debugging
    const totalCarsCount = await carsCollection.countDocuments({});
    console.log(`Total cars in the database: ${totalCarsCount}`);

    // DEBUG: Sample some cars to understand their structure
    const sampleCars = await carsCollection.find({}).limit(2).toArray();
    if (sampleCars.length > 0) {
      console.log("Sample car ID type:", typeof sampleCars[0]._id);
      console.log("Sample car ID:", sampleCars[0]._id);
      console.log("Sample car fields:", Object.keys(sampleCars[0]).join(", "));
    }

    // Try an alternate lookup approach
    // First: Try loading each ID directly to handle potential format differences
    const foundCars = [];
    let notFoundIds = [];

    // Try direct lookup for each ID - this is more reliable but slower
    for (const id of ids) {
      try {
        // Try as ObjectId first
        let car = null;
        try {
          const objId = new ObjectId(id);
          car = await carsCollection.findOne({ _id: objId });
        } catch (e) {
          // Not a valid ObjectId, that's ok
        }

        // If not found, try as string ID
        if (!car) {
          car = await carsCollection.findOne({ _id: id } as any);
        }

        // If still not found, try by other potential ID fields
        if (!car) {
          car = await carsCollection.findOne({ id: id } as any);
        }

        if (car) {
          foundCars.push(car);
        } else {
          notFoundIds.push(id);
        }
      } catch (err) {
        console.error(`Error finding car with ID ${id}:`, err);
        notFoundIds.push(id);
      }
    }

    console.log(
      `Found ${foundCars.length} cars directly out of ${ids.length} requested IDs`
    );
    if (notFoundIds.length > 0) {
      console.log(`IDs not found: ${notFoundIds.join(", ")}`);
    }

    // If we found all cars via direct lookup, skip the batch query
    if (foundCars.length === ids.length) {
      return NextResponse.json({
        cars: foundCars.map((car) => ({
          ...car,
          _id: car._id.toString(),
        })),
        debug: {
          idsRequested: ids.length,
          idsFound: foundCars.length,
          totalCarsInDb: totalCarsCount,
          method: "direct-lookup",
        },
      });
    }

    // If we still have missing cars, try the original batch approach as fallback
    if (notFoundIds.length > 0) {
      // Convert IDs to ObjectId where possible for batch query
      const batchObjectIds = [];
      const batchStringIds = [];

      for (const id of notFoundIds) {
        try {
          batchObjectIds.push(new ObjectId(id));
        } catch (e) {
          batchStringIds.push(id);
        }
      }

      // Build query
      const query: any = {};
      const orConditions = [];

      if (batchObjectIds.length > 0) {
        orConditions.push({ _id: { $in: batchObjectIds } });
      }

      if (batchStringIds.length > 0) {
        orConditions.push({ _id: { $in: batchStringIds } });
        orConditions.push({ id: { $in: batchStringIds } });
      }

      if (orConditions.length > 0) {
        query.$or = orConditions;
      }

      console.log(
        `Trying batch lookup for remaining ${notFoundIds.length} IDs`
      );

      // Execute query
      const batchCars = await carsCollection.find(query).toArray();

      // Add batch results to found cars
      foundCars.push(...batchCars);
    }

    // Return the found cars with string IDs
    return NextResponse.json({
      cars: foundCars.map((car) => ({
        ...car,
        _id: car._id.toString(),
      })),
      debug: {
        idsRequested: ids.length,
        idsFound: foundCars.length,
        totalCarsInDb: totalCarsCount,
        method: "mixed-lookup",
      },
    });
  } catch (error) {
    console.error("Error fetching cars:", error);
    return NextResponse.json(
      { error: "Failed to fetch cars" },
      { status: 500 }
    );
  }
}
