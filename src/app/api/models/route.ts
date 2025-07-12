import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { verifyAuthMiddleware } from "@/lib/firebase-auth-middleware";
import {
  VehicleModel,
  CreateVehicleModelRequest,
  UpdateVehicleModelRequest,
} from "@/types/model";

// Cache models for 1 hour since they don't change as frequently as cars
export const revalidate = 3600;

export async function GET(request: NextRequest) {
  try {
    console.log("🚗 /api/models - Starting request");

    // Verify authentication
    const authResult = await verifyAuthMiddleware(request);
    if (authResult) {
      console.log("🚗 /api/models - Authentication failed");
      return authResult;
    }

    const { searchParams } = new URL(request.url);

    // Pagination
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
    const skip = (page - 1) * limit;

    // Build query filters
    const query: Record<string, any> = { active: true };

    // Make filter
    const make = searchParams.get("make");
    if (make) {
      query.make = { $regex: make, $options: "i" };
    }

    // Year filter (within year_range)
    const year = searchParams.get("year");
    if (year) {
      const yearNum = parseInt(year);
      query.$and = [
        { "year_range.start": { $lte: yearNum } },
        {
          $or: [
            { "year_range.end": { $gte: yearNum } },
            { "year_range.end": { $exists: false } },
            { "year_range.end": null },
          ],
        },
      ];
    }

    // Body style filter
    const bodyStyle = searchParams.get("body_style");
    if (bodyStyle) {
      query.body_styles = { $in: [bodyStyle] };
    }

    // Market segment filter
    const marketSegment = searchParams.get("market_segment");
    if (marketSegment) {
      query.market_segment = marketSegment;
    }

    // Text search across make, model, description
    const search = searchParams.get("search");
    if (search) {
      query.$or = [
        { make: { $regex: search, $options: "i" } },
        { model: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { generation: { $regex: search, $options: "i" } },
      ];
    }

    const db = await getDatabase();
    if (!db) {
      return NextResponse.json(
        { error: "Failed to connect to database" },
        { status: 500 }
      );
    }

    // Get total count for pagination
    const totalCount = await db.collection("models").countDocuments(query);
    const totalPages = Math.ceil(totalCount / limit);

    // Fetch models with pagination
    const models = await db
      .collection("models")
      .find(query)
      .sort({ make: 1, model: 1, generation: 1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    // Format response
    const formattedModels = models.map((model) => ({
      ...model,
      _id: model._id.toString(),
      created_at: model.created_at || new Date(),
      updated_at: model.updated_at || new Date(),
    }));

    console.log(
      `🚗 /api/models - Successfully fetched ${formattedModels.length} models`
    );

    const response = NextResponse.json({
      models: formattedModels,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        pageSize: limit,
        hasMore: page < totalPages,
      },
    });

    // Add cache headers
    response.headers.set(
      "Cache-Control",
      "public, s-maxage=3600, stale-while-revalidate=7200"
    );

    return response;
  } catch (error) {
    console.error("🚗 /api/models - Error fetching models:", error);
    return NextResponse.json(
      { error: "Failed to fetch models" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log("🚗 /api/models - Creating new model");

    // Verify authentication
    const authResult = await verifyAuthMiddleware(request);
    if (authResult) {
      return authResult;
    }

    const body: CreateVehicleModelRequest = await request.json();

    // Validate required fields
    if (!body.make || !body.model) {
      return NextResponse.json(
        { error: "Make and model are required" },
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

    // Check for duplicate make/model/generation combination
    const existingModel = await db.collection("models").findOne({
      make: body.make,
      model: body.model,
      generation: body.generation || null,
      active: true,
    });

    if (existingModel) {
      return NextResponse.json(
        {
          error: "A model with this make, model, and generation already exists",
        },
        { status: 409 }
      );
    }

    // Create new model
    const newModel: Omit<VehicleModel, "_id"> = {
      ...body,
      active: true,
      created_at: new Date(),
      updated_at: new Date(),
    };

    const result = await db.collection("models").insertOne(newModel);

    const createdModel = {
      _id: result.insertedId.toString(),
      ...newModel,
    };

    console.log(
      `🚗 /api/models - Created model: ${createdModel.make} ${createdModel.model}`
    );

    return NextResponse.json(createdModel, { status: 201 });
  } catch (error) {
    console.error("🚗 /api/models - Error creating model:", error);
    return NextResponse.json(
      { error: "Failed to create model" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    console.log("🚗 /api/models - Updating model");

    // Verify authentication
    const authResult = await verifyAuthMiddleware(request);
    if (authResult) {
      return authResult;
    }

    const body: UpdateVehicleModelRequest = await request.json();

    if (!body._id) {
      return NextResponse.json(
        { error: "Model ID is required" },
        { status: 400 }
      );
    }

    if (!ObjectId.isValid(body._id)) {
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

    const { _id, ...updateData } = body;

    // Add updated timestamp
    const updatePayload = {
      ...updateData,
      updated_at: new Date(),
    };

    const result = await db
      .collection("models")
      .updateOne({ _id: new ObjectId(_id) }, { $set: updatePayload });

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Model not found" }, { status: 404 });
    }

    // Fetch and return updated model
    const updatedModel = await db
      .collection("models")
      .findOne({ _id: new ObjectId(_id) });

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
      `🚗 /api/models - Updated model: ${updatedModel.make} ${updatedModel.model}`
    );

    return NextResponse.json(formattedModel);
  } catch (error) {
    console.error("🚗 /api/models - Error updating model:", error);
    return NextResponse.json(
      { error: "Failed to update model" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    console.log("🚗 /api/models - Deleting model");

    // Verify authentication
    const authResult = await verifyAuthMiddleware(request);
    if (authResult) {
      return authResult;
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Model ID is required" },
        { status: 400 }
      );
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
      { _id: new ObjectId(id) },
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

    console.log(`🚗 /api/models - Soft deleted model: ${id}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("🚗 /api/models - Error deleting model:", error);
    return NextResponse.json(
      { error: "Failed to delete model" },
      { status: 500 }
    );
  }
}
