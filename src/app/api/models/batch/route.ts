import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { VehicleModel } from "@/types/model";
import { ObjectId } from "mongodb";

export async function POST(request: NextRequest) {
  try {
    const { db } = await connectToDatabase();
    const body = await request.json();

    // Validate that body is an array
    if (!Array.isArray(body)) {
      return NextResponse.json(
        { error: "Request body must be an array of models" },
        { status: 400 }
      );
    }

    if (body.length === 0) {
      return NextResponse.json(
        { error: "Array cannot be empty" },
        { status: 400 }
      );
    }

    // Validate each model in the array
    const validatedModels: Omit<VehicleModel, "_id">[] = [];
    const errors: string[] = [];

    for (let i = 0; i < body.length; i++) {
      const modelData = body[i];

      // Required fields validation
      if (!modelData.make || !modelData.model) {
        errors.push(
          `Model at index ${i}: Missing required fields (make, model)`
        );
        continue;
      }

      // Check for generation structure
      if (!modelData.generation || !modelData.generation.code) {
        errors.push(
          `Model at index ${i}: Missing required generation information (generation.code)`
        );
        continue;
      }

      // Check for engine_options array
      if (
        !Array.isArray(modelData.engine_options) ||
        modelData.engine_options.length === 0
      ) {
        errors.push(
          `Model at index ${i}: Missing or empty engine_options array`
        );
        continue;
      }

      // Check for duplicates in the database
      const existingModel = await db.collection("models").findOne({
        make: modelData.make,
        model: modelData.model,
        "generation.code": modelData.generation.code,
        active: true,
      });

      if (existingModel) {
        errors.push(
          `Model at index ${i}: Duplicate model found (${modelData.make} ${modelData.model} ${modelData.generation.code})`
        );
        continue;
      }

      // Prepare model data
      const newModel: Omit<VehicleModel, "_id"> = {
        make: modelData.make,
        model: modelData.model,
        generation: {
          code: modelData.generation.code,
          year_range: modelData.generation.year_range || {
            start: new Date().getFullYear(),
          },
          body_styles: Array.isArray(modelData.generation.body_styles)
            ? modelData.generation.body_styles
            : [],
          trims: Array.isArray(modelData.generation.trims)
            ? modelData.generation.trims
            : [],
        },
        engine_options: Array.isArray(modelData.engine_options)
          ? modelData.engine_options
          : [],
        market_segment: modelData.market_segment || null,
        description: modelData.description || null,
        tags: Array.isArray(modelData.tags) ? modelData.tags : [],
        active: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      validatedModels.push(newModel);
    }

    // If there are validation errors, return them
    if (errors.length > 0) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: errors,
          validCount: validatedModels.length,
          totalCount: body.length,
        },
        { status: 400 }
      );
    }

    // Insert all valid models
    const result = await db.collection("models").insertMany(validatedModels);

    // Fetch the inserted models to return them with IDs
    const insertedModels = await db
      .collection("models")
      .find({ _id: { $in: Object.values(result.insertedIds) } })
      .toArray();

    // Convert ObjectIds to strings for client
    const clientModels = insertedModels.map((model) => ({
      ...model,
      _id: model._id.toString(),
    }));

    return NextResponse.json({
      success: true,
      message: `Successfully created ${clientModels.length} models`,
      models: clientModels,
      count: clientModels.length,
    });
  } catch (error) {
    console.error("Error in batch models creation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
