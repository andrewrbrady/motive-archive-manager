import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { Contact } from "@/types/contact";
import { ObjectId } from "mongodb";

interface ContactsQuery {
  search?: string;
  status?: "active" | "inactive";
  company?: string;
  role?: string;
  page?: number;
  limit?: number;
}

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query: ContactsQuery = {
      search: searchParams.get("search") || undefined,
      status:
        (searchParams.get("status") as "active" | "inactive") || undefined,
      company: searchParams.get("company") || undefined,
      role: searchParams.get("role") || undefined,
      page: parseInt(searchParams.get("page") || "1"),
      limit: parseInt(searchParams.get("limit") || "50"),
    };

    const db = await getDatabase();
    const collection = db.collection<Contact>("contacts");

    // Build MongoDB filter
    const filter: any = {};

    if (query.search) {
      const searchRegex = { $regex: query.search, $options: "i" };
      filter.$or = [
        { firstName: searchRegex },
        { lastName: searchRegex },
        { email: searchRegex },
        { phone: searchRegex },
        { role: searchRegex },
        { company: searchRegex },
      ];
    }

    if (query.status) {
      filter.status = query.status;
    }

    if (query.company) {
      filter.company = { $regex: query.company, $options: "i" };
    }

    if (query.role) {
      filter.role = { $regex: query.role, $options: "i" };
    }

    // Calculate pagination
    const skip = ((query.page || 1) - 1) * (query.limit || 50);

    // Get total count for pagination
    const total = await collection.countDocuments(filter);

    // Get contacts with pagination
    const contacts = await collection
      .find(filter)
      .sort({ firstName: 1, lastName: 1 })
      .skip(skip)
      .limit(query.limit || 50)
      .toArray();

    // Convert ObjectIds to strings
    const serializedContacts = contacts.map((contact) => ({
      ...contact,
      _id: contact._id.toString(),
    }));

    return NextResponse.json({
      contacts: serializedContacts,
      pagination: {
        page: query.page || 1,
        limit: query.limit || 50,
        total,
        pages: Math.ceil(total / (query.limit || 50)),
      },
    });
  } catch (error) {
    console.error("Error fetching contacts:", error);
    return NextResponse.json(
      { error: "Failed to fetch contacts" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const db = await getDatabase();
    const collection = db.collection<Contact>("contacts");

    // Validate required fields
    const { firstName, lastName } = body;
    if (!firstName || !lastName) {
      return NextResponse.json(
        { error: "Missing required fields: firstName, lastName" },
        { status: 400 }
      );
    }

    // Check if email already exists (only if email is provided)
    if (body.email) {
      const existingContact = await collection.findOne({
        email: body.email.toLowerCase(),
      });
      if (existingContact) {
        return NextResponse.json(
          { error: "A contact with this email already exists" },
          { status: 400 }
        );
      }
    }

    const now = new Date();
    const newContact = {
      ...body,
      email: body.email ? body.email.toLowerCase() : undefined,
      status: body.status || "active",
      createdAt: now,
      updatedAt: now,
    };

    const result = await collection.insertOne(newContact);

    return NextResponse.json({
      ...newContact,
      _id: result.insertedId.toString(),
    });
  } catch (error) {
    console.error("Error creating contact:", error);
    return NextResponse.json(
      { error: "Failed to create contact" },
      { status: 500 }
    );
  }
}
