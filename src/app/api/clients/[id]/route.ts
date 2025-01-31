import { ObjectId, Collection } from "mongodb";
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";

interface Client {
  _id: ObjectId;
  name: string;
  email: string;
  phone: string;
  address: string;
  instagram: string;
}

export async function GET(
  request: Request,
  context: { params: { id: string } }
) {
  let dbConnection;
  try {
    const { id } = context.params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid client ID format" },
        { status: 400 }
      );
    }

    // Get database connection from our connection pool
    dbConnection = await connectToDatabase();
    const db = dbConnection.db;

    // Get typed collection
    const clientsCollection: Collection<Client> = db.collection("clients");

    console.log(`Fetching client with ID: ${id}`);
    const clientDoc = await clientsCollection.findOne({
      _id: new ObjectId(id),
    });

    if (!clientDoc) {
      console.log(`Client not found with ID: ${id}`);
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    return NextResponse.json({
      _id: clientDoc._id.toString(),
      name: clientDoc.name,
      email: clientDoc.email,
      phone: clientDoc.phone,
      address: clientDoc.address,
      instagram: clientDoc.instagram,
    });
  } catch (error) {
    console.error("Error fetching client:", error);
    return NextResponse.json(
      { error: "Failed to fetch client" },
      { status: 500 }
    );
  }
}
