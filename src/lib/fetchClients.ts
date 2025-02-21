// lib/fetchClients.ts
import { getDatabase } from "@/lib/mongodb";
import { Client } from "@/types/contact";

export async function fetchClients() {
  try {
    const db = await getDatabase();

    const clients = await db
      .collection<Client>("clients")
      .find({})
      .sort({ name: 1 })
      .toArray();

    return clients.map((client) => ({
      ...client,
      _id: client._id.toString(),
      primaryContactId: client.primaryContactId?.toString(),
    }));
  } catch (error) {
    console.error("Error fetching clients:", error);
    return [];
  }
}
