import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Client } from "@/types/contact";
import { ObjectId } from "mongodb";
import { verifyAuthMiddleware } from "@/lib/firebase-auth-middleware";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuthMiddleware(request);
    if (authResult) {
      return authResult;
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status");
    const businessType = searchParams.get("businessType");

    console.log("Fetching clients with params:", {
      page,
      limit,
      search,
      status,
      businessType,
    });

    const { db } = await connectToDatabase();
    const collection = db.collection<Client>("clients");

    // Log the database and collection being used
    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("Using database:", db.databaseName);
    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("Using collection:", collection.collectionName);

    // First, let's see what's in the database
    const allClients = await collection.find({}).toArray();
    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("Total clients in database:", allClients.length);
    if (allClients.length > 0) {
      // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("Sample client:", allClients[0]);
    }

    // Build the query
    const query: any = {};
    if (search) {
      query.name = { $regex: search, $options: "i" };
    }
    if (status && status !== "all") {
      query.status = status;
    }
    if (businessType && businessType !== "all") {
      query.businessType = { $regex: `^${businessType}$`, $options: "i" };
    }

    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("Query:", JSON.stringify(query, null, 2));

    // Get total count for pagination
    const total = await collection.countDocuments(query);
    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("Total matching clients:", total);

    // Get paginated results
    const skip = (page - 1) * limit;
    const clients = await collection
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log(`Found ${clients.length} clients for page ${page}`);
    if (clients.length > 0) {
      // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("Sample client:", JSON.stringify(clients[0], null, 2));
    }

    // Get all primary contact IDs from the clients
    const contactIds = clients
      .map((client) => client.primaryContactId)
      .filter((id): id is ObjectId => id instanceof ObjectId);

    // Fetch associated contact information if there are any contact IDs
    const contactsCollection = db.collection("contacts");
    const contacts =
      contactIds.length > 0
        ? await contactsCollection.find({ _id: { $in: contactIds } }).toArray()
        : [];

    // Create a map of contacts for easy lookup
    const contactMap = new Map(
      contacts.map((contact) => [contact._id.toString(), contact])
    );

    // Return the response with properly formatted data
    return NextResponse.json({
      clients: clients.map((client) => ({
        ...client,
        _id: client._id.toString(),
        primaryContactId: client.primaryContactId?.toString(),
        primaryContact: client.primaryContactId
          ? contactMap.get(client.primaryContactId.toString())
          : null,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Error fetching clients:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch clients",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuthMiddleware(request);
    if (authResult) {
      return authResult;
    }

    const body = await request.json();
    const { db } = await connectToDatabase();
    const collection = db.collection<Client>("clients");

    // Validate primary contact exists if provided
    if (body.primaryContactId) {
      const contactsCollection = db.collection("contacts");
      const contact = await contactsCollection.findOne({
        _id: new ObjectId(body.primaryContactId),
      });
      if (!contact) {
        return NextResponse.json(
          { error: "Primary contact not found" },
          { status: 400 }
        );
      }
    }

    const now = new Date();
    const newClient = {
      ...body,
      primaryContactId: body.primaryContactId
        ? new ObjectId(body.primaryContactId)
        : null,
      createdAt: now,
      updatedAt: now,
    };

    const result = await collection.insertOne(newClient);

    return NextResponse.json({
      ...newClient,
      _id: result.insertedId.toString(),
      primaryContactId: newClient.primaryContactId?.toString(),
    });
  } catch (error) {
    console.error("Error creating client:", error);
    return NextResponse.json(
      { error: "Failed to create client" },
      { status: 500 }
    );
  }
}
