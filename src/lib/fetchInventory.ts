// lib/fetchInventory.ts
import clientPromise from "@/lib/mongodb";
import { InventoryItemRaw } from "@/types/inventory";

interface InventoryFilters {
  make?: string;
  model?: string;
  year?: string;
  minYear?: string;
  maxYear?: string;
  minMileage?: string;
  maxMileage?: string;
  dealer?: string;
}

interface MongoQuery {
  make?: string;
  model?: string;
  year?: number | { $gte?: number; $lte?: number };
  dealer?: string;
  "mileage.value"?: { $gte?: number; $lte?: number };
  [key: string]: unknown;
}

export async function fetchInventory(
  page = 1,
  limit = 48,
  filters: InventoryFilters = {}
) {
  try {
    const client = await clientPromise;

    if (!client) {
      throw new Error("Failed to connect to MongoDB");
    }

    const db = client.db(process.env.MONGODB_DB || "motive_archive");
    const collection = db.collection<InventoryItemRaw>("inventory");

    const skip = (page - 1) * limit;

    // Build query based on filters
    const query: MongoQuery = {};
    if (filters.make) query.make = filters.make;
    if (filters.model) query.model = filters.model;
    if (filters.year) query.year = parseInt(filters.year);
    if (filters.minYear || filters.maxYear) {
      query.year = {};
      if (filters.minYear) query.year.$gte = parseInt(filters.minYear);
      if (filters.maxYear) query.year.$lte = parseInt(filters.maxYear);
    }
    if (filters.minMileage || filters.maxMileage) {
      query["mileage.value"] = {};
      if (filters.minMileage)
        query["mileage.value"].$gte = parseInt(filters.minMileage);
      if (filters.maxMileage)
        query["mileage.value"].$lte = parseInt(filters.maxMileage);
    }
    if (filters.dealer) query.dealer = filters.dealer;

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
