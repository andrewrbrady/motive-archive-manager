// lib/fetchModels.ts
import { getDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { VehicleModelClient } from "@/types/model";

export async function fetchModels(): Promise<VehicleModelClient[]> {
  try {
    const db = await getDatabase();

    if (process.env.NODE_ENV !== "production") {
      console.log("Fetching models from MongoDB...");
    }

    const models = await db
      .collection("models")
      .find({ active: true })
      .sort({ make: 1, model: 1, generation: 1 })
      .toArray();

    if (process.env.NODE_ENV !== "production") {
      console.log(`Successfully fetched ${models.length} models`);
    }

    return models.map((model) => ({
      _id: model._id instanceof ObjectId ? model._id.toString() : model._id,
      make: model.make,
      model: model.model,
      generation: model.generation,
      engine_options: model.engine_options,
      market_segment: model.market_segment,
      description: model.description,
      tags: model.tags,
      active: model.active,
      created_at: model.created_at,
      updated_at: model.updated_at,
    }));
  } catch (error) {
    console.error("Error fetching models:", error);
    throw error;
  }
}

export async function fetchModelById(
  id: string
): Promise<VehicleModelClient | null> {
  try {
    if (!ObjectId.isValid(id)) {
      return null;
    }

    const db = await getDatabase();
    const model = await db
      .collection("models")
      .findOne({ _id: new ObjectId(id), active: true });

    if (!model) {
      return null;
    }

    return {
      _id: model._id.toString(),
      make: model.make,
      model: model.model,
      generation: model.generation,
      engine_options: model.engine_options,
      market_segment: model.market_segment,
      description: model.description,
      tags: model.tags,
      active: model.active,
      created_at: model.created_at,
      updated_at: model.updated_at,
    };
  } catch (error) {
    console.error("Error fetching model by ID:", error);
    throw error;
  }
}

export async function fetchModelsByMake(
  make: string
): Promise<VehicleModelClient[]> {
  try {
    const db = await getDatabase();

    const models = await db
      .collection("models")
      .find({
        make: { $regex: make, $options: "i" },
        active: true,
      })
      .sort({ model: 1, generation: 1 })
      .toArray();

    return models.map((model) => ({
      _id: model._id instanceof ObjectId ? model._id.toString() : model._id,
      make: model.make,
      model: model.model,
      generation: model.generation,
      engine_options: model.engine_options,
      market_segment: model.market_segment,
      description: model.description,
      tags: model.tags,
      active: model.active,
      created_at: model.created_at,
      updated_at: model.updated_at,
    }));
  } catch (error) {
    console.error("Error fetching models by make:", error);
    throw error;
  }
}

export async function fetchModelsByFilters(filters: {
  make?: string;
  year?: number;
  body_style?: string;
  market_segment?: string;
  search?: string;
}): Promise<VehicleModelClient[]> {
  try {
    const db = await getDatabase();

    // Build query
    const query: Record<string, any> = { active: true };

    if (filters.make) {
      query.make = { $regex: filters.make, $options: "i" };
    }

    if (filters.year) {
      query.$and = [
        { "generation.year_range.start": { $lte: filters.year } },
        {
          $or: [
            { "generation.year_range.end": { $gte: filters.year } },
            { "generation.year_range.end": { $exists: false } },
            { "generation.year_range.end": null },
          ],
        },
      ];
    }

    if (filters.body_style) {
      query["generation.body_styles"] = { $in: [filters.body_style] };
    }

    if (filters.market_segment) {
      query.market_segment = filters.market_segment;
    }

    if (filters.search) {
      query.$or = [
        { make: { $regex: filters.search, $options: "i" } },
        { model: { $regex: filters.search, $options: "i" } },
        { description: { $regex: filters.search, $options: "i" } },
        { "generation.code": { $regex: filters.search, $options: "i" } },
      ];
    }

    const models = await db
      .collection("models")
      .find(query)
      .sort({ make: 1, model: 1, generation: 1 })
      .toArray();

    return models.map((model) => ({
      _id: model._id instanceof ObjectId ? model._id.toString() : model._id,
      make: model.make,
      model: model.model,
      generation: model.generation,
      engine_options: model.engine_options,
      market_segment: model.market_segment,
      description: model.description,
      tags: model.tags,
      active: model.active,
      created_at: model.created_at,
      updated_at: model.updated_at,
    }));
  } catch (error) {
    console.error("Error fetching models by filters:", error);
    throw error;
  }
}
