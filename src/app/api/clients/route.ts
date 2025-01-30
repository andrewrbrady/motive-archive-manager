import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("motive_archive");

    console.log("Fetching clients from MongoDB...");
    const clients = await db
      .collection("clients")
      .find({})
      .sort({ name: 1 })
      .toArray();

    console.log(`Successfully fetched ${clients.length} clients`);

    return NextResponse.json(
      clients.map((client) => ({
        _id: client._id.toString(),
        name: client.name,
        email: client.email || "",
        phone: client.phone || "",
        address: client.address || "",
        documents: client.documents || [],
        cars: client.cars || [],
        instagram: client.instagram || "",
      }))
    );
  } catch (error) {
    console.error("Error fetching clients:", error);
    return NextResponse.json(
      { error: "Failed to fetch clients" },
      { status: 500 }
    );
  }
}
