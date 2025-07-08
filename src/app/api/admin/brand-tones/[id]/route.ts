import { NextRequest, NextResponse } from "next/server";
import { verifyAuthMiddleware } from "@/lib/firebase-auth-middleware";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { BrandTone } from "../route";

// GET - Fetch single brand tone by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  console.log(
    `🔒 GET /api/admin/brand-tones/${resolvedParams.id}: Starting request`
  );

  // Check authentication and admin role
  const authResult = await verifyAuthMiddleware(request, ["admin"]);
  if (authResult) {
    console.log(
      `❌ GET /api/admin/brand-tones/${resolvedParams.id}: Authentication failed`
    );
    return authResult;
  }

  try {
    const { id } = resolvedParams;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid brand tone ID" },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    const brandTone = await db
      .collection("brand_tones")
      .findOne({ _id: new ObjectId(id) });

    if (!brandTone) {
      return NextResponse.json(
        { error: "Brand tone not found" },
        { status: 404 }
      );
    }

    console.log(
      `✅ GET /api/admin/brand-tones/${resolvedParams.id}: Successfully fetched brand tone`
    );
    return NextResponse.json(brandTone);
  } catch (error) {
    console.error(
      `💥 GET /api/admin/brand-tones/${resolvedParams.id}: Error fetching brand tone:`,
      error
    );
    return NextResponse.json(
      { error: "Failed to fetch brand tone" },
      { status: 500 }
    );
  }
}

// PUT - Update single brand tone by ID
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  console.log(
    `🔒 PUT /api/admin/brand-tones/${resolvedParams.id}: Starting request`
  );

  // Check authentication and admin role
  const authResult = await verifyAuthMiddleware(request, ["admin"]);
  if (authResult) {
    console.log(
      `❌ PUT /api/admin/brand-tones/${resolvedParams.id}: Authentication failed`
    );
    return authResult;
  }

  try {
    const { id } = resolvedParams;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid brand tone ID" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { name, description, tone_instructions, example_phrases, is_active } =
      body;

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
      `✅ PUT /api/admin/brand-tones/${resolvedParams.id}: Successfully updated brand tone`
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(
      `💥 PUT /api/admin/brand-tones/${resolvedParams.id}: Error updating brand tone:`,
      error
    );
    return NextResponse.json(
      { error: "Failed to update brand tone" },
      { status: 500 }
    );
  }
}

// DELETE - Delete single brand tone by ID
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  console.log(
    `🔒 DELETE /api/admin/brand-tones/${resolvedParams.id}: Starting request`
  );

  // Check authentication and admin role
  const authResult = await verifyAuthMiddleware(request, ["admin"]);
  if (authResult) {
    console.log(
      `❌ DELETE /api/admin/brand-tones/${resolvedParams.id}: Authentication failed`
    );
    return authResult;
  }

  try {
    const { id } = resolvedParams;

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
      `✅ DELETE /api/admin/brand-tones/${resolvedParams.id}: Successfully deleted brand tone`
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(
      `💥 DELETE /api/admin/brand-tones/${resolvedParams.id}: Error deleting brand tone:`,
      error
    );
    return NextResponse.json(
      { error: "Failed to delete brand tone" },
      { status: 500 }
    );
  }
}
