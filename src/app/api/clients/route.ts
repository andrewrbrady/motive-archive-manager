import { NextResponse } from "next/server";
import { Collection, ObjectId } from "mongodb";
import { connectToDatabase } from "@/lib/mongodb";

interface Client {
  _id: ObjectId;
  name: string;
  email: string;
  phone: string;
  address: string;
  documents: string[];
  cars: string[];
  instagram: string;
}

export async function GET() {
  let dbConnection;
  try {
    // Get database connection from our connection pool
    dbConnection = await connectToDatabase();
    const db = dbConnection.db;

    // Get typed collection
    const clientsCollection: Collection<Client> = db.collection("clients");

    console.log("Fetching clients from MongoDB...");
    const clients = await clientsCollection
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
