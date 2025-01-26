import { cache } from "react";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

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

export const fetchAuctions = cache(async function fetchAuctions(
  page: number = 1,
  filters: Record<string, any> = {},
  pageSize: number = 24
): Promise<AuctionsResponse> {
  try {
    const client = await clientPromise;
    const db = client.db("motive_archive");
    const skip = (page - 1) * pageSize;

    // Build MongoDB query from filters
    const query: any = {};

    // Handle platform filter
    if (filters.platformId) {
      try {
        query.platformId = new ObjectId(filters.platformId);
      } catch (err) {
        console.error("Invalid platformId ObjectId:", filters.platformId);
      }
    }

    // Handle make filter
    if (filters.make && filters.make !== "All Makes") {
      query.make = { $regex: filters.make, $options: "i" };
    }

    // Handle model filter
    if (filters.model) {
      query.model = { $regex: filters.model, $options: "i" };
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
    if (filters.noReserve === true) {
      query.no_reserve = true;
    }

    // Handle search filter
    if (filters.$or) {
      query.$or = filters.$or;
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
      auctions: auctions.map((auction: any) => ({
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
