import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Client } from "@/types/contact";
import { ObjectId } from "mongodb";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { db } = await connectToDatabase();
    const collection = db.collection<Client>("clients");
    const client = await collection.findOne({
      _id: new ObjectId(params.id),
    });

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    // Fetch associated contact if exists
    let primaryContact = null;
    if (client.primaryContactId) {
      const contactsCollection = db.collection("contacts");
      primaryContact = await contactsCollection.findOne({
        _id: client.primaryContactId,
      });
    }

    // Format the response with string IDs
    const formattedClient = {
      ...client,
      _id: client._id.toString(),
      primaryContactId: client.primaryContactId?.toString(),
      primaryContact,
      // Format the cars array if it exists
      cars:
        client.cars?.map((car) => ({
          ...car,
          _id: car._id.toString(),
        })) || [],
      // Format document IDs if they exist
      documents:
        client.documents?.map((doc) => ({
          ...doc,
          _id: doc._id.toString(),
        })) || [],
    };

    return NextResponse.json(formattedClient);
  } catch (error) {
    console.error("Error fetching client:", error);
    return NextResponse.json(
      { error: "Failed to fetch client" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
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

    const updateData = {
      ...body,
      primaryContactId: body.primaryContactId
        ? new ObjectId(body.primaryContactId)
        : null,
      updatedAt: new Date(),
    };

    const result = await collection.findOneAndUpdate(
      { _id: new ObjectId(params.id) },
      { $set: updateData },
      { returnDocument: "after" }
    );

    if (!result) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    return NextResponse.json({
      ...result,
      _id: result._id.toString(),
      primaryContactId: result.primaryContactId?.toString(),
    });
  } catch (error) {
    console.error("Error updating client:", error);
    return NextResponse.json(
      { error: "Failed to update client" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { db } = await connectToDatabase();
    const collection = db.collection<Client>("clients");

    const result = await collection.findOneAndDelete({
      _id: new ObjectId(params.id),
    });

    if (!result) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting client:", error);
    return NextResponse.json(
      { error: "Failed to delete client" },
      { status: 500 }
    );
  }
}
