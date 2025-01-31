// lib/fetchDealers.ts
import { connectToDatabase } from "@/lib/mongodb";

export interface Dealer {
  _id: string;
  name: string;
  created_at: Date;
}

export async function fetchDealers() {
  try {
    // Get database connection from our connection pool
    const dbConnection = await connectToDatabase();
    const db = dbConnection.db;

    const dealers = await db
      .collection("dealers")
      .find({})
      .sort({ name: 1 })
      .toArray();

    return dealers.map((dealer) => ({
      _id: dealer._id.toString(),
      name: dealer.name,
      created_at: dealer.created_at,
    }));
  } catch (error) {
    console.error("Error fetching dealers:", error);
    return [];
  }
}
