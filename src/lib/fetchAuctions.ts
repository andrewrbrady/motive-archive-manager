import { cache } from "react";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

interface MongoQuery {
  platformId?: ObjectId;
  make?: { $regex: string; $options: string };
  model?: { $regex: string; $options: string };
  year?: {
    $gte?: number;
    $lte?: number;
  };
  end_date?: {
    $ne: null;
    $gte: Date;
    $lte: Date;
  };
  no_reserve?: boolean;
  $or?: Array<{ [key: string]: { $regex: string; $options: string } }>;
}

export interface Auction {
  _id: string;
  title: string;
  make: string;
  model: string;
  year: number;
  trim?: string;
  images: string[];
  link: string;
  excerpt: string;
  no_reserve?: boolean;
  date: string;
  end_date?: string;
  categories?: string[];
  comments_count: number;
  bid_count?: number;
  current_bid?: number;
  location?: string;
  platformId: string;
  platform: {
    name: string;
    shortName: string;
  };
}

export interface AuctionsResponse {
  auctions: Auction[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface AuctionFilters {
  make?: string;
  model?: string;
  year?: number;
  platform?: string;
  platformId?: string;
  status?: string;
  sort?: string;
  order?: "asc" | "desc";
  minYear?: number;
  maxYear?: number;
  endDate?: string;
  noReserve?: boolean;
  $or?: Array<Record<string, unknown>>;
}

export const fetchAuctions = cache(async function fetchAuctions(
  page: number = 1,
  filters: AuctionFilters = {},
  pageSize: number = 24
): Promise<AuctionsResponse> {
  try {
    const client = await clientPromise;
    const db = client.db("motive_archive");
    const skip = (page - 1) * pageSize;

    // Build MongoDB query from filters
    const query: MongoQuery = {};

    // Handle platform filter
    if (filters.platformId) {
      try {
        query.platformId = new ObjectId(filters.platformId);
      } catch (_err) {
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
    if (filters.endDate) {
      const now = new Date();
      const endDateTime = new Date(now); // Clone current date

      switch (filters.endDate) {
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
          console.warn("Unknown endDate option:", filters.endDate);
      }

      query.end_date = {
        $ne: null,
        $gte: now,
        $lte: endDateTime,
      };
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

    console.log("MongoDB Query:", JSON.stringify(query, null, 2));

    const [auctions, total] = await Promise.all([
      db
        .collection("auctions")
        .find(query)
        .sort({ end_date: 1 })
        .skip(skip)
        .limit(pageSize)
        .toArray(),
      db.collection("auctions").countDocuments(query),
    ]);

    console.log(`Successfully fetched ${auctions.length} auctions`);

    return {
      auctions: auctions.map((auction) => ({
        ...auction,
        _id: auction._id.toString(),
        platformId: auction.platformId?.toString() || "",
        platform: auction.platform || { name: "Unknown", shortName: "UNK" },
      })) as Auction[],
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  } catch (error) {
    console.error("Error fetching auctions:", error);
    throw error;
  }
});
