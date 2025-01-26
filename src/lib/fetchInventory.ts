// lib/fetchInventory.ts
import clientPromise from "@/lib/mongodb";

export async function fetchInventory(
  page: number,
  limit: number,
  filters: any = {}
) {
  try {
    const client = await clientPromise;
    const db = client.db("motive_archive");
    const collection = db.collection("inventory");

    // Calculate skip value for pagination
    const skip = (page - 1) * limit;

    // Build MongoDB query
    const query: any = {};

    // Handle year range filters
    if (filters.minYear || filters.maxYear) {
      query.year = {};
      if (filters.minYear && !isNaN(parseInt(filters.minYear))) {
        query.year.$gte = parseInt(filters.minYear);
      }
      if (filters.maxYear && !isNaN(parseInt(filters.maxYear))) {
        query.year.$lte = parseInt(filters.maxYear);
      }
      // Only delete if we successfully used them
      if (query.year.$gte || query.year.$lte) {
        delete filters.minYear;
        delete filters.maxYear;
      }
    }

    // Handle other filters
    Object.assign(query, filters);

    // Get total count with filters
    const total = await collection.countDocuments(query);

    // Get paginated results with filters
    const results = await collection
      .find(query)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    return {
      results,
      total,
    };
  } catch (error) {
    console.error("Error fetching inventory:", error);
    return {
      results: [],
      total: 0,
    };
  }
}
