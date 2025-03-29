// lib/fetchDealers.ts
import clientPromise from "@/lib/mongodb";

export interface Dealer {
  _id: string;
  name: string;
  created_at: Date;
}

export async function fetchDealers() {
  try {
    const client = await clientPromise;

    if (!client) {
      throw new Error("Failed to connect to MongoDB");
    }

    const db = client.db("motive_archive");

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
