import { MongoClient, ObjectId } from "mongodb";
import { NextResponse } from "next/server";

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB || "motive_archive";

if (!MONGODB_URI) {
  throw new Error("Please add your Mongo URI to .env.local");
}

// Helper function to get MongoDB client
async function getMongoClient() {
  const client = new MongoClient(MONGODB_URI, {
    connectTimeoutMS: 10000,
    socketTimeoutMS: 45000,
  });
  await client.connect();
  return client;
}

export async function GET(
  request: Request,
  context: { params: { id: string } }
) {
  let client;
  try {
    const { id } = await Promise.resolve(context.params);
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid client ID format" },
        { status: 400 }
      );
    }
    const objectId = new ObjectId(id);

    client = await getMongoClient();
    const db = client.db(DB_NAME);

    console.log(`Fetching client with ID: ${id}`);
    const clientDoc = await db.collection("clients").findOne({
      _id: objectId,
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
  } finally {
    if (client) {
      console.log(`Closing MongoDB connection for client ${context.params.id}`);
      await client.close();
    }
  }
}
