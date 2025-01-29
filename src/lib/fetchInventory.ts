// lib/fetchInventory.ts
import clientPromise from "@/lib/mongodb";
import { InventoryItemRaw } from "@/types/inventory";

interface InventoryFilters extends Partial<Omit<InventoryItemRaw, "_id">> {
  minYear?: string | number;
  maxYear?: string | number;
}

interface MongoQuery {
  year?: {
    $gte?: number;
    $lte?: number;
  };
  make?: string;
  model?: string;
  dealer?: string;
  price?: number;
  mileage?: number;
  transmission?: string;
  [key: string]: unknown;
}

export async function fetchInventory(
  page: number,
  limit: number,
  filters: InventoryFilters = {}
) {
  try {
    const client = await clientPromise;
    const db = client.db("motive_archive");
    const collection = db.collection<InventoryItemRaw>("inventory");

    // Calculate skip value for pagination
    const skip = (page - 1) * limit;

    // Build MongoDB query
    const query: MongoQuery = {};

    // Handle year range filters
    if (filters.minYear || filters.maxYear) {
      query.year = {};
      if (filters.minYear && !isNaN(parseInt(String(filters.minYear)))) {
        query.year.$gte = parseInt(String(filters.minYear));
      }
      if (filters.maxYear && !isNaN(parseInt(String(filters.maxYear)))) {
        query.year.$lte = parseInt(String(filters.maxYear));
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
      page,
      limit,
    };
  } catch (error) {
    console.error("Error fetching inventory:", error);
    throw error;
  }
}
