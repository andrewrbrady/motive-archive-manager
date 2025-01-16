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

    // Get total count with filters
    const total = await collection.countDocuments(filters);

    // Get paginated results with filters
    const results = await collection
      .find(filters)
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
