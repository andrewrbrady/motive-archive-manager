import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    console.log("API Route - Search Params:", Object.fromEntries(searchParams));

    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "24", 10);
    const skip = (page - 1) * pageSize;

    const client = await clientPromise;
    const db = client.db("motive_archive");

    // Build base query
    const query: any = {};

    // Handle platform filter
    const platformId = searchParams.get("platformId");
    if (platformId) {
      try {
        query.platformId = new ObjectId(platformId);
      } catch (err) {
        console.error("Invalid platformId ObjectId:", platformId);
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
        $gte: now, // Date object
        $lte: endDateTime, // Date object
      };

      console.log("Computed end_date filter:", query.end_date);
    }

    const auctions = await db
      .collection("auctions")
      .find(query)
      .sort({ end_date: 1 })
      .skip(skip)
      .limit(pageSize)
      .toArray();

    const total = await db.collection("auctions").countDocuments(query);

    return NextResponse.json({
      results: auctions,
      total,
    });
  } catch (error) {
    console.error("Error in GET /api/auctions:", error);
    return NextResponse.error();
  }
}
