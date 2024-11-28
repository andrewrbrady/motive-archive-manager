import { MongoClient } from "mongodb";
import { NextRequest, NextResponse } from "next/server";

const uri = "mongodb://localhost:27017";
const dbName = "arb_assets";

export async function GET(request: NextRequest) {
  let client;

  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const sortOrder = searchParams.get("sortOrder") || "desc";
    const searchQuery = searchParams.get("search") || "";
    const skip = (page - 1) * limit;

    console.log("Connecting to MongoDB..."); // Debug log
    client = await MongoClient.connect(uri);
    console.log("Connected successfully"); // Debug log

    const db = client.db(dbName);

    // Build search query if search term exists
    const query = searchQuery
      ? {
          $or: [
            { name: { $regex: searchQuery, $options: "i" } },
            { description: { $regex: searchQuery, $options: "i" } },
          ],
        }
      : {};

    console.log("Executing query:", query); // Debug log

    // Get paginated results and total count with search filter
    const [assets, totalCount] = await Promise.all([
      db
        .collection("raw")
        .find(query)
        .sort({ name: sortOrder === "desc" ? -1 : 1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      db.collection("raw").countDocuments(query),
    ]);

    console.log(`Found ${totalCount} total assets`); // Debug log

    return NextResponse.json({
      assets,
      pagination: {
        totalItems: totalCount,
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        itemsPerPage: limit,
        sortOrder,
      },
    });
  } catch (error) {
    console.error("Detailed MongoDB Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to fetch assets",
      },
      { status: 500 }
    );
  } finally {
    if (client) {
      console.log("Closing MongoDB connection"); // Debug log
      await client.close();
    }
  }
}
