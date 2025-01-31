// lib/fetchClients.ts
import { connectToDatabase } from "@/lib/mongodb";

export interface Client {
  _id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  documents: string[];
  cars: string[];
}

export async function fetchClients() {
  try {
    // Get database connection from our connection pool
    const dbConnection = await connectToDatabase();
    const db = dbConnection.db;

    const clients = await db
      .collection("clients")
      .find({})
      .sort({ name: 1 })
      .toArray();

    return clients.map((client) => ({
      _id: client._id.toString(),
      name: client.name,
      email: client.email,
      phone: client.phone,
      address: client.address,
      documents: client.documents,
      cars: client.cars,
    }));
  } catch (error) {
    console.error("Error fetching clients:", error);
    return [];
  }
}
