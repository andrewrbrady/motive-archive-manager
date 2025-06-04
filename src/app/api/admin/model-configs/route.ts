import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import {
  verifyAuthMiddleware,
  verifyFirebaseToken,
  getUserIdFromToken,
} from "@/lib/firebase-auth-middleware";
import { AIModel, DEFAULT_MODEL_CONFIGS } from "@/utils/aiHelpers";

export const runtime = "nodejs";

interface ModelConfigData {
  _id?: ObjectId;
  modelId: AIModel;
  displayName: string;
  description: string;
  defaultTokens: number;
  maxTokens: number;
  enabled: boolean;
  cost?: number;
  createdAt: Date;
  updatedAt: Date;
}

interface ModelConfigRequest {
  configs: Array<{
    modelId: AIModel;
    displayName: string;
    description: string;
    defaultTokens: number;
    maxTokens: number;
    enabled: boolean;
    cost?: number;
  }>;
}

export async function GET(req: NextRequest) {
  try {
    // Check authentication using Firebase middleware
    const authResult = await verifyAuthMiddleware(req);
    if (authResult) {
      return authResult;
    }

    // Get user ID from Firebase token
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Missing authorization token" },
        { status: 401 }
      );
    }

    const token = authHeader.split("Bearer ")[1];
    const tokenData = await verifyFirebaseToken(token);

    if (!tokenData) {
      return NextResponse.json(
        { error: "Invalid authentication token" },
        { status: 401 }
      );
    }

    const userId = getUserIdFromToken(tokenData);

    // Check if user has admin privileges (implement your admin check logic here)
    // For now, we'll check for a specific admin user or role
    // This should be replaced with proper role-based access control
    const db = await getDatabase();
    const user = await db.collection("users").findOne({ firebaseUid: userId });

    if (!user || !user.isAdmin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    // Get model configurations from database
    const modelConfigs = await db
      .collection("ai_model_configs")
      .find({})
      .sort({ createdAt: 1 })
      .toArray();

    if (modelConfigs.length === 0) {
      return NextResponse.json(
        { error: "Model configurations not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      configs: modelConfigs,
      total: modelConfigs.length,
    });
  } catch (error) {
    console.error("Error getting model configs:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    // Check authentication using Firebase middleware
    const authResult = await verifyAuthMiddleware(req);
    if (authResult) {
      return authResult;
    }

    // Get user ID from Firebase token
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Missing authorization token" },
        { status: 401 }
      );
    }

    const token = authHeader.split("Bearer ")[1];
    const tokenData = await verifyFirebaseToken(token);

    if (!tokenData) {
      return NextResponse.json(
        { error: "Invalid authentication token" },
        { status: 401 }
      );
    }

    const userId = getUserIdFromToken(tokenData);

    // Check if user has admin privileges
    const db = await getDatabase();
    const user = await db.collection("users").findOne({ firebaseUid: userId });

    if (!user || !user.isAdmin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const body: ModelConfigRequest = await req.json();
    const { configs } = body;

    if (!configs || !Array.isArray(configs)) {
      return NextResponse.json(
        { error: "Invalid configurations data" },
        { status: 400 }
      );
    }

    // Validate each configuration
    for (const config of configs) {
      if (!config.modelId || !config.displayName || !config.description) {
        return NextResponse.json(
          { error: "Missing required fields in configuration" },
          { status: 400 }
        );
      }

      if (config.defaultTokens < 500 || config.defaultTokens > 4000) {
        return NextResponse.json(
          { error: "Default tokens must be between 500 and 4000" },
          { status: 400 }
        );
      }

      if (config.maxTokens < config.defaultTokens || config.maxTokens > 4000) {
        return NextResponse.json(
          { error: "Max tokens must be between default tokens and 4000" },
          { status: 400 }
        );
      }
    }

    const collection = db.collection("ai_model_configs");
    const now = new Date();

    // Use upsert approach - update existing or insert new for each model
    const operations = configs.map((config) => ({
      updateOne: {
        filter: { modelId: config.modelId },
        update: {
          $set: {
            displayName: config.displayName,
            description: config.description,
            defaultTokens: config.defaultTokens,
            maxTokens: config.maxTokens,
            enabled: config.enabled,
            cost: config.cost || 0,
            updatedAt: now,
          },
          $setOnInsert: {
            modelId: config.modelId,
            createdAt: now,
          },
        },
        upsert: true,
      },
    }));

    await collection.bulkWrite(operations);

    // Get the updated configurations
    const updatedConfigs = await collection
      .find({})
      .sort({ createdAt: 1 })
      .toArray();

    return NextResponse.json({
      configs: updatedConfigs,
      message: "Model configurations saved successfully",
    });
  } catch (error) {
    console.error("Error saving model configs:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Initialize default model configurations if none exist
export async function PUT(req: NextRequest) {
  try {
    // Check authentication using Firebase middleware
    const authResult = await verifyAuthMiddleware(req);
    if (authResult) {
      return authResult;
    }

    // Get user ID from Firebase token
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Missing authorization token" },
        { status: 401 }
      );
    }

    const token = authHeader.split("Bearer ")[1];
    const tokenData = await verifyFirebaseToken(token);

    if (!tokenData) {
      return NextResponse.json(
        { error: "Invalid authentication token" },
        { status: 401 }
      );
    }

    const userId = getUserIdFromToken(tokenData);

    // Check if user has admin privileges
    const db = await getDatabase();
    const user = await db.collection("users").findOne({ firebaseUid: userId });

    if (!user || !user.isAdmin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const collection = db.collection("ai_model_configs");
    const now = new Date();

    // Check if any configurations already exist
    const existingCount = await collection.countDocuments();

    if (existingCount > 0) {
      return NextResponse.json(
        { error: "Model configurations already exist" },
        { status: 409 }
      );
    }

    // Insert default configurations
    const defaultConfigs: ModelConfigData[] = DEFAULT_MODEL_CONFIGS.map(
      (config) => ({
        modelId: config.id,
        displayName: config.displayName,
        description: config.description,
        defaultTokens: config.defaultTokens,
        maxTokens: config.maxTokens,
        enabled: config.enabled,
        cost: 0,
        createdAt: now,
        updatedAt: now,
      })
    );

    await collection.insertMany(defaultConfigs);

    return NextResponse.json({
      configs: defaultConfigs,
      message: "Default model configurations initialized",
    });
  } catch (error) {
    console.error("Error initializing model configs:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
