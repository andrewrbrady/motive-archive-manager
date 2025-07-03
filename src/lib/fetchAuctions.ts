import { cache } from "react";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { Auction, AuctionFilters, AuctionsResponse } from "@/types/auction";
import {
  startOfDay,
  endOfDay,
  startOfTomorrow,
  endOfTomorrow,
  startOfWeek,
  endOfWeek,
  addWeeks,
} from "date-fns";

export type { AuctionFilters, Auction };

interface MongoQuery {
  platformId?: ObjectId;
  make?: { $regex: string; $options: string };
  model?: { $regex: string; $options: string };
  year?: {
    $gte?: number;
    $lte?: number;
  };
  end_date?: {
    $ne?: null;
    $gte?: Date;
    $lte?: Date;
    $lt?: Date;
  };
  no_reserve?: boolean;
  $or?: Array<{ [key: string]: { $regex: string; $options: string } }>;
}

export const fetchAuctions = cache(async function fetchAuctions(
  page: number = 1,
  filters: AuctionFilters = {},
  pageSize: number = 24
): Promise<AuctionsResponse> {
  try {
    const client = await clientPromise;

    if (!client) {
      throw new Error("Failed to connect to MongoDB");
    }

    const db = client.db("motive_archive");
    const skip = (page - 1) * pageSize;

    // Build MongoDB query from filters
    const query: MongoQuery = {};

    // Handle platform filter
    if (filters.platformId) {
      try {
        query.platformId = new ObjectId(filters.platformId);
      } catch {
        console.error("Invalid platformId ObjectId:", filters.platformId);
      }
    }

    // Handle make filter
    if (filters.make && filters.make !== "All Makes") {
      query.make = { $regex: String(filters.make), $options: "i" };
    }

    // Handle model filter
    if (filters.model) {
      query.model = { $regex: String(filters.model), $options: "i" };
    }

    // Handle year range filters
    if (filters.minYear || filters.maxYear) {
      query.year = {};
      if (filters.minYear) {
        const minYear =
          typeof filters.minYear === "string"
            ? parseInt(filters.minYear)
            : filters.minYear;
        if (!isNaN(minYear)) {
          query.year.$gte = minYear;
        }
      }
      if (filters.maxYear) {
        const maxYear =
          typeof filters.maxYear === "string"
            ? parseInt(filters.maxYear)
            : filters.maxYear;
        if (!isNaN(maxYear)) {
          query.year.$lte = maxYear;
        }
      }
      // Only delete if we successfully used them
      if (query.year.$gte || query.year.$lte) {
        delete filters.minYear;
        delete filters.maxYear;
      }
    }

    // Handle end date filter
    if (filters.endDate && filters.endDate !== "all") {
      const now = new Date();
      switch (filters.endDate) {
        case "today":
          query.end_date = {
            $gte: startOfDay(now),
            $lte: endOfDay(now),
          };
          break;
        case "tomorrow":
          query.end_date = {
            $gte: startOfTomorrow(),
            $lte: endOfTomorrow(),
          };
          break;
        case "this-week":
          query.end_date = {
            $gte: startOfDay(now),
            $lte: endOfWeek(now),
          };
          break;
        case "next-week":
          query.end_date = {
            $gte: startOfWeek(addWeeks(now, 1)),
            $lte: endOfWeek(addWeeks(now, 1)),
          };
          break;
        case "ended":
          query.end_date = {
            $lt: now,
          };
          break;
        default:
          if (process.env.NODE_ENV !== "production") {
            console.warn("Unknown endDate option:", filters.endDate);
          }
          break;
      }
    }

    // Handle noReserve filter
    if (filters.noReserve) {
      query.no_reserve =
        filters.noReserve === true || filters.noReserve === "true";
    }

    // Handle search filter
    if (filters.$or) {
      query.$or = filters.$or.map((condition) => {
        const field = Object.keys(condition)[0];
        const value = condition[field] as { $regex: string };
        return {
          [field]: { $regex: String(value.$regex), $options: "i" },
        };
      });
    }

    if (process.env.NODE_ENV !== "production") {
      // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("MongoDB Query:", JSON.stringify(query, null, 2));
    }

    // Build the aggregation pipeline with default sorting
    const pipeline = [
      { $match: query },
      { $sort: { end_date: -1 } }, // Default sort by end_date descending
    ];

    // Execute the query
    const collection = db.collection<Auction>("auctions");
    const cursor = collection.aggregate(pipeline);
    const auctions = await cursor.toArray();

    // Convert ObjectId fields to strings for JSON serialization
    const serializedAuctions = auctions.map((auction) => ({
      ...auction,
      _id: auction._id.toString(),
      platformId: auction.platformId?.toString(),
    }));

    if (process.env.NODE_ENV !== "production") {
      // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log(`Successfully fetched ${auctions.length} auctions`);
    }

    return {
      auctions: serializedAuctions.map((auction) => ({
        ...auction,
        _id: auction._id.toString(),
        platformId: auction.platformId?.toString() || "",
      })) as Auction[],
      total: auctions.length,
      page,
      pageSize,
      totalPages: Math.ceil(auctions.length / pageSize),
    };
  } catch (error) {
    console.error("Error fetching auctions:", error);
    throw error;
  }
});
