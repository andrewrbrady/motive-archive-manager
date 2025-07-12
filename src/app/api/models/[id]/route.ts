import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { verifyAuthMiddleware } from "@/lib/firebase-auth-middleware";
import { UpdateVehicleModelRequest } from "@/types/model";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log(`🚗 /api/models/${id} - Getting model`);

    // Verify authentication
    const authResult = await verifyAuthMiddleware(request);
    if (authResult) {
      return authResult;
    }

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid model ID format" },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    if (!db) {
      return NextResponse.json(
        { error: "Failed to connect to database" },
        { status: 500 }
      );
    }

    const model = await db
      .collection("models")
      .findOne({ _id: new ObjectId(id), active: true });

    if (!model) {
      return NextResponse.json({ error: "Model not found" }, { status: 404 });
    }

    const formattedModel = {
      ...model,
      _id: model._id.toString(),
    };

    console.log(
      `🚗 /api/models/${id} - Found model: ${model.make} ${model.model}`
    );

    const response = NextResponse.json(formattedModel);

    // Add cache headers
    response.headers.set(
      "Cache-Control",
      "public, s-maxage=3600, stale-while-revalidate=7200"
    );

    return response;
  } catch (error) {
    console.error(`🚗 /api/models/[id] - Error getting model:`, error);
    return NextResponse.json({ error: "Failed to get model" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log(`🚗 /api/models/${id} - Updating model`);

    // Verify authentication
    const authResult = await verifyAuthMiddleware(request);
    if (authResult) {
      return authResult;
    }

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid model ID format" },
        { status: 400 }
      );
    }

    const body = await request.json();

    const db = await getDatabase();
    if (!db) {
      return NextResponse.json(
        { error: "Failed to connect to database" },
        { status: 500 }
      );
    }

    // Add updated timestamp
    const updatePayload = {
      ...body,
      updated_at: new Date(),
    };

    const result = await db
      .collection("models")
      .updateOne(
        { _id: new ObjectId(id), active: true },
        { $set: updatePayload }
      );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Model not found" }, { status: 404 });
    }

    // Fetch and return updated model
    const updatedModel = await db
      .collection("models")
      .findOne({ _id: new ObjectId(id) });

    if (!updatedModel) {
      return NextResponse.json(
        { error: "Failed to fetch updated model" },
        { status: 500 }
      );
    }

    const formattedModel = {
      ...updatedModel,
      _id: updatedModel._id.toString(),
    };

    console.log(
      `🚗 /api/models/${id} - Updated model: ${updatedModel.make} ${updatedModel.model}`
    );

    return NextResponse.json(formattedModel);
  } catch (error) {
    console.error(`🚗 /api/models/[id] - Error updating model:`, error);
    return NextResponse.json(
      { error: "Failed to update model" },
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
    console.log(`🚗 /api/models/${id} - Deleting model`);

    // Verify authentication
    const authResult = await verifyAuthMiddleware(request);
    if (authResult) {
      return authResult;
    }

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid model ID format" },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    if (!db) {
      return NextResponse.json(
        { error: "Failed to connect to database" },
        { status: 500 }
      );
    }

    // Soft delete by setting active to false
    const result = await db.collection("models").updateOne(
      { _id: new ObjectId(id), active: true },
      {
        $set: {
          active: false,
          updated_at: new Date(),
        },
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Model not found" }, { status: 404 });
    }

    console.log(`🚗 /api/models/${id} - Soft deleted model`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`🚗 /api/models/[id] - Error deleting model:`, error);
    return NextResponse.json(
      { error: "Failed to delete model" },
      { status: 500 }
    );
  }
}
