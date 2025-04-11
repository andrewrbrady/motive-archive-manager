import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";

import { getDatabase } from "@/lib/mongodb";
import { Contact } from "@/types/contact";
import { ObjectId } from "mongodb";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const segments = url.pathname.split("/");
    const id = segments[segments.length - 1];

    const db = await getDatabase();

    // Check if this contact is a primary contact for any client
    const clientWithPrimaryContact = await db.collection("clients").findOne({
      primaryContactId: new ObjectId(id),
    });

    if (clientWithPrimaryContact) {
      return NextResponse.json(
        {
          error: "Cannot delete contact that is set as primary for a client",
          clientId: clientWithPrimaryContact._id.toString(),
          clientName: clientWithPrimaryContact.name,
        },
        { status: 400 }
      );
    }

    // Delete contact
    const result = await db.collection("contacts").deleteOne({
      _id: new ObjectId(id),
    });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
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
