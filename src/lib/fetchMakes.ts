// lib/fetchMakes.ts
import { getDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export interface Make {
  _id: string;
  name: string;
  country_of_origin: string;
  founded: number;
  type: string[];
  parent_company: string;
  created_at: Date;
  updated_at: Date;
  active: boolean;
}

export async function fetchMakes() {
  try {
    const db = await getDatabase();

    if (process.env.NODE_ENV !== "production") {
      // [REMOVED] // [REMOVED] console.log("Fetching makes from MongoDB...");
    }

    const makes = await db
      .collection("makes")
      .find({ active: true })
      .sort({ name: 1 })
      .toArray();

    if (process.env.NODE_ENV !== "production") {
      // [REMOVED] // [REMOVED] console.log(`Successfully fetched ${makes.length} makes`);
    }

    return makes.map((make) => ({
      _id: make._id instanceof ObjectId ? make._id.toString() : make._id,
      name: make.name,
      country_of_origin: make.country_of_origin,
      founded: make.founded,
      type: make.type,
      parent_company: make.parent_company,
      created_at: make.created_at,
      updated_at: make.updated_at,
      active: make.active,
    }));
  } catch (error) {
    console.error("Error fetching makes:", error);
    throw error;
  }
}
