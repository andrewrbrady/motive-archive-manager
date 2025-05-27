import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";

import { getDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

interface Contact {
  _id: ObjectId;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  role?: string;
  company?: string;
  status: "active" | "inactive";
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid contact ID" },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const collection = db.collection<Contact>("contacts");

    const contact = await collection.findOne({ _id: new ObjectId(id) });

    if (!contact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    return NextResponse.json({
      ...contact,
      _id: contact._id.toString(),
    });
  } catch (error) {
    console.error("Error fetching contact:", error);
    return NextResponse.json(
      { error: "Failed to fetch contact" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid contact ID" },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const collection = db.collection<Contact>("contacts");

    // Check if contact exists
    const existingContact = await collection.findOne({ _id: new ObjectId(id) });
    if (!existingContact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    // If email is being updated, check for duplicates (only if email is provided)
    if (body.email && body.email.toLowerCase() !== existingContact.email) {
      const emailExists = await collection.findOne({
        email: body.email.toLowerCase(),
        _id: { $ne: new ObjectId(id) },
      });
      if (emailExists) {
        return NextResponse.json(
          { error: "A contact with this email already exists" },
          { status: 400 }
        );
      }
    }

    const updateData = {
      ...body,
      email: body.email
        ? body.email.toLowerCase()
        : body.email === ""
          ? undefined
          : existingContact.email,
      updatedAt: new Date(),
    };

    // Remove _id from update data if present
    delete updateData._id;

    const result = await collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    // Fetch and return updated contact
    const updatedContact = await collection.findOne({ _id: new ObjectId(id) });

    return NextResponse.json({
      ...updatedContact,
      _id: updatedContact!._id.toString(),
    });
  } catch (error) {
    console.error("Error updating contact:", error);
    return NextResponse.json(
      { error: "Failed to update contact" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid contact ID" },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const contactsCollection = db.collection<Contact>("contacts");

    // Check if contact exists
    const contact = await contactsCollection.findOne({ _id: new ObjectId(id) });
    if (!contact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    // Check if contact is referenced by any clients
    const clientsCollection = db.collection("clients");
    const referencingClients = await clientsCollection
      .find({
        primaryContactId: new ObjectId(id),
      })
      .toArray();

    if (referencingClients.length > 0) {
      return NextResponse.json(
        {
          error:
            "Cannot delete contact. It is referenced by one or more clients.",
          referencingClients: referencingClients.map((client) => ({
            _id: client._id.toString(),
            name: client.name,
          })),
        },
        { status: 400 }
      );
    }

    const result = await contactsCollection.deleteOne({
      _id: new ObjectId(id),
    });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Contact deleted successfully" });
  } catch (error) {
    console.error("Error deleting contact:", error);
    return NextResponse.json(
      { error: "Failed to delete contact" },
      { status: 500 }
    );
  }
}

export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Methods": "GET, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
