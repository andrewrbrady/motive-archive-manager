import { NextResponse } from "next/server";
import { Collection, ObjectId } from "mongodb";
import { connectToDatabase } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

interface AuctionQuery {
  platformId?: ObjectId;
  make?: {
    $regex: string;
    $options: string;
  };
  end_date?: {
    $ne: null;
    $gte: Date;
    $lte: Date;
  };
}

interface Auction {
  _id: ObjectId;
  platformId: ObjectId;
  make: string;
  end_date: Date;
}

export async function GET(request: Request) {
  let dbConnection;
  try {
    const { searchParams } = new URL(request.url);
    console.log("API Route - Search Params:", Object.fromEntries(searchParams));

    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "24", 10);
    const skip = (page - 1) * pageSize;

    // Get database connection from our connection pool
    dbConnection = await connectToDatabase();
    const db = dbConnection.db;

    // Get typed collection
    const auctionsCollection: Collection<Auction> = db.collection("auctions");

    // Build base query
    const query: AuctionQuery = {};

    // Handle platform filter
    const platformId = searchParams.get("platformId");
    if (platformId) {
      try {
        query.platformId = new ObjectId(platformId);
      } catch (err) {
        console.error("Invalid platformId ObjectId:", platformId, err);
        return NextResponse.json(
          { error: "Invalid platform ID format" },
          { status: 400 }
        );
      }
    }

    // Handle make filter
    const make = searchParams.get("make");
    if (make && make !== "All Makes") {
      query.make = { $regex: make, $options: "i" };
    }

    // Handle end date filter
    const endDate = searchParams.get("endDate");
    if (endDate) {
      const now = new Date();
      const endDateTime = new Date(now); // Clone current date

      switch (endDate) {
        case "24h":
          endDateTime.setHours(now.getHours() + 24);
          break;
        case "48h":
          endDateTime.setHours(now.getHours() + 48);
          break;
        case "72h":
          endDateTime.setHours(now.getHours() + 72);
          break;
        case "1w":
          endDateTime.setDate(now.getDate() + 7);
          break;
        case "2w":
          endDateTime.setDate(now.getDate() + 14);
          break;
        case "1m":
          endDateTime.setMonth(now.getMonth() + 1);
          break;
        default:
          console.warn("Unknown endDate option:", endDate);
      }

      query.end_date = {
        $ne: null,
        $gte: now,
        $lte: endDateTime,
      };

      console.log("Computed end_date filter:", query.end_date);
    }

    // Get total count for pagination
    const total = await auctionsCollection.countDocuments(query);

    // Get auctions with pagination
    const auctions = await auctionsCollection
      .find(query)
      .sort({ end_date: 1 })
      .skip(skip)
      .limit(pageSize)
      .toArray();

    return NextResponse.json({
      auctions,
      total,
      page,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error("Error fetching auctions:", error);
    return NextResponse.json(
      { error: "Failed to fetch auctions" },
      { status: 500 }
    );
  }
}
