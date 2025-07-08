import { NextRequest, NextResponse } from "next/server";
import {
  withFirebaseAuth,
  verifyAuthMiddleware,
} from "@/lib/firebase-auth-middleware";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export interface BrandTone {
  _id?: string;
  name: string;
  description: string;
  tone_instructions: string;
  example_phrases: string[];
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  created_by?: string;
}

// GET - Fetch all brand tones
export async function GET(request: NextRequest) {
  // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("🔒 GET /api/admin/brand-tones: Starting request");

  // Check authentication and admin role
  const authResult = await verifyAuthMiddleware(request, ["admin"]);
  if (authResult) {
    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("❌ GET /api/admin/brand-tones: Authentication failed");
    return authResult;
  }

  try {
    console.log(
      "🔒 GET /api/admin/brand-tones: Authentication successful, fetching brand tones"
    );
    const { db } = await connectToDatabase();
    const brandTones = await db
      .collection("brand_tones")
      .find({})
      .sort({ name: 1 })
      .toArray();

    console.log(
      "✅ GET /api/admin/brand-tones: Successfully fetched brand tones",
      {
        count: brandTones.length,
      }
    );
    return NextResponse.json(brandTones);
  } catch (error) {
    console.error(
      "💥 GET /api/admin/brand-tones: Error fetching brand tones:",
      error
    );
    return NextResponse.json(
      { error: "Failed to fetch brand tones" },
      { status: 500 }
    );
  }
}

// POST - Create a new brand tone
export async function POST(request: NextRequest) {
  // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("🔒 POST /api/admin/brand-tones: Starting request");

  // Check authentication and admin role
  const authResult = await verifyAuthMiddleware(request, ["admin"]);
  if (authResult) {
    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("❌ POST /api/admin/brand-tones: Authentication failed");
    return authResult;
  }

  try {
    const body = await request.json();
    const {
      name,
      description,
      tone_instructions,
      example_phrases,
      is_active,
      created_by,
    } = body;

    if (!name || !description || !tone_instructions) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: name, description, and tone_instructions are required",
        },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();

    // Check for duplicate name
    const existingTone = await db
      .collection("brand_tones")
      .findOne({ name: { $regex: new RegExp(`^${name}$`, "i") } });

    if (existingTone) {
      return NextResponse.json(
        { error: "A brand tone with this name already exists" },
        { status: 409 }
      );
    }

    const newBrandTone: Omit<BrandTone, "_id"> = {
      name: name.trim(),
      description: description.trim(),
      tone_instructions: tone_instructions.trim(),
      example_phrases: Array.isArray(example_phrases)
        ? example_phrases.filter((phrase) => phrase.trim())
        : [],
      is_active: is_active ?? true,
      created_by: created_by || undefined,
      created_at: new Date(),
      updated_at: new Date(),
    };

    const result = await db.collection("brand_tones").insertOne(newBrandTone);

    console.log(
      "✅ POST /api/admin/brand-tones: Successfully created brand tone"
    );
    return NextResponse.json({
      _id: result.insertedId,
      ...newBrandTone,
    });
  } catch (error) {
    console.error(
      "💥 POST /api/admin/brand-tones: Error creating brand tone:",
      error
    );
    return NextResponse.json(
      { error: "Failed to create brand tone" },
      { status: 500 }
    );
  }
}

// PUT - Update a brand tone
export async function PUT(request: NextRequest) {
  // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("🔒 PUT /api/admin/brand-tones: Starting request");

  // Check authentication and admin role
  const authResult = await verifyAuthMiddleware(request, ["admin"]);
  if (authResult) {
    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("❌ PUT /api/admin/brand-tones: Authentication failed");
    return authResult;
  }

  try {
    const body = await request.json();
    const {
      id,
      name,
      description,
      tone_instructions,
      example_phrases,
      is_active,
    } = body;

    if (!id || !name || !description || !tone_instructions) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: id, name, description, and tone_instructions are required",
        },
        { status: 400 }
      );
    }

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid brand tone ID" },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();

    // Check for duplicate name (excluding current record)
    const existingTone = await db.collection("brand_tones").findOne({
      name: { $regex: new RegExp(`^${name}$`, "i") },
      _id: { $ne: new ObjectId(id) },
    });

    if (existingTone) {
      return NextResponse.json(
        { error: "A brand tone with this name already exists" },
        { status: 409 }
      );
    }

    const updateData = {
      name: name.trim(),
      description: description.trim(),
      tone_instructions: tone_instructions.trim(),
      example_phrases: Array.isArray(example_phrases)
        ? example_phrases.filter((phrase) => phrase.trim())
        : [],
      is_active: is_active ?? true,
      updated_at: new Date(),
    };

    const result = await db
      .collection("brand_tones")
      .updateOne({ _id: new ObjectId(id) }, { $set: updateData });

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: "Brand tone not found" },
        { status: 404 }
      );
    }

    console.log(
      "✅ PUT /api/admin/brand-tones: Successfully updated brand tone"
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(
      "💥 PUT /api/admin/brand-tones: Error updating brand tone:",
      error
    );
    return NextResponse.json(
      { error: "Failed to update brand tone" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a brand tone
export async function DELETE(request: NextRequest) {
  // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("🔒 DELETE /api/admin/brand-tones: Starting request");

  // Check authentication and admin role
  const authResult = await verifyAuthMiddleware(request, ["admin"]);
  if (authResult) {
    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("❌ DELETE /api/admin/brand-tones: Authentication failed");
    return authResult;
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Brand tone ID is required" },
        { status: 400 }
      );
    }

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid brand tone ID" },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    const result = await db
      .collection("brand_tones")
      .deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: "Brand tone not found" },
        { status: 404 }
      );
    }

    console.log(
      "✅ DELETE /api/admin/brand-tones: Successfully deleted brand tone"
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(
      "💥 DELETE /api/admin/brand-tones: Error deleting brand tone:",
      error
    );
    return NextResponse.json(
      { error: "Failed to delete brand tone" },
      { status: 500 }
    );
  }
}
