import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { verifyFirebaseToken } from "@/lib/firebase-auth-middleware";

interface ProjectModelsRouteParams {
  params: Promise<{ id: string }>;
}

// GET - Fetch models linked to project
async function getProjectModels(
  request: NextRequest,
  { params }: ProjectModelsRouteParams
) {
  try {
    // Get the token from the authorization header
    const authHeader = request.headers.get("authorization") || "";
    const token = authHeader.split("Bearer ")[1];
    const tokenData = await verifyFirebaseToken(token);

    if (!tokenData) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const userId =
      tokenData.tokenType === "api_token" ? tokenData.userId : tokenData.uid;

    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid project ID" },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const projectId = new ObjectId(id);

    // Get project and verify user has access
    const project = await db.collection("projects").findOne({
      _id: projectId,
    });

    if (!project) {
      return NextResponse.json(
        { error: "Project not found or access denied" },
        { status: 404 }
      );
    }

    // Parse query parameters for server-side filtering and pagination
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get("limit") || "20");
    const offset = parseInt(url.searchParams.get("offset") || "0");

    console.time("getProjectModels-fetch");

    // Fetch model details
    const models = [];
    if (project.modelIds && project.modelIds.length > 0) {
      // modelIds should already be ObjectIds in the database
      const modelObjectIds = project.modelIds
        .filter(
          (modelId: any) =>
            modelId instanceof ObjectId || ObjectId.isValid(modelId)
        )
        .map((modelId: any) =>
          modelId instanceof ObjectId ? modelId : new ObjectId(modelId)
        );

      if (modelObjectIds.length > 0) {
        const modelDocs = await db
          .collection("models")
          .find({
            _id: { $in: modelObjectIds },
            active: true, // Only fetch active models
          })
          .sort({ make: 1, model: 1, "generation.code": 1 })
          .skip(offset)
          .limit(limit)
          .toArray();

        models.push(...modelDocs);
      }
    }

    console.timeEnd("getProjectModels-fetch");

    // Format models for frontend
    const formattedModels = models.map((model) => ({
      ...model,
      _id: model._id.toString(),
    }));

    return NextResponse.json({
      models: formattedModels,
      total: formattedModels.length,
      limit,
      offset,
      hasMore: formattedModels.length === limit,
    });
  } catch (error) {
    console.error("Error fetching project models:", error);
    return NextResponse.json(
      { error: "Failed to fetch project models" },
      { status: 500 }
    );
  }
}

// POST - Link model to project
async function linkModelToProject(
  request: NextRequest,
  { params }: ProjectModelsRouteParams
) {
  try {
    // Get the token from the authorization header
    const authHeader = request.headers.get("authorization") || "";
    const token = authHeader.split("Bearer ")[1];
    const tokenData = await verifyFirebaseToken(token);

    if (!tokenData) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const userId =
      tokenData.tokenType === "api_token" ? tokenData.userId : tokenData.uid;

    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid project ID" },
        { status: 400 }
      );
    }

    const { modelId } = await request.json();
    if (!modelId || !ObjectId.isValid(modelId)) {
      return NextResponse.json({ error: "Invalid model ID" }, { status: 400 });
    }

    const db = await getDatabase();
    const projectId = new ObjectId(id);
    const modelObjectId = new ObjectId(modelId);

    // Verify project exists and user has access
    const project = await db.collection("projects").findOne({
      _id: projectId,
    });

    if (!project) {
      return NextResponse.json(
        { error: "Project not found or insufficient permissions" },
        { status: 404 }
      );
    }

    // Verify model exists and is active
    const model = await db.collection("models").findOne({
      _id: modelObjectId,
      active: true,
    });
    if (!model) {
      return NextResponse.json(
        { error: "Model not found or inactive" },
        { status: 404 }
      );
    }

    // Check if model is already linked
    const modelIdExists =
      project.modelIds &&
      project.modelIds.some((id: any) => {
        const idStr = id instanceof ObjectId ? id.toString() : id;
        return idStr === modelId;
      });

    if (modelIdExists) {
      return NextResponse.json(
        { error: "Model is already linked to this project" },
        { status: 400 }
      );
    }

    // Add model to project (store as ObjectId)
    await db.collection("projects").updateOne(
      { _id: projectId },
      {
        $addToSet: { modelIds: modelObjectId },
        $set: { updatedAt: new Date() },
      }
    );

    return NextResponse.json({
      message: "Model linked to project successfully",
      modelId: modelId,
    });
  } catch (error) {
    console.error("Error linking model to project:", error);
    return NextResponse.json(
      { error: "Failed to link model to project" },
      { status: 500 }
    );
  }
}

// DELETE - Unlink model from project
async function unlinkModelFromProject(
  request: NextRequest,
  { params }: ProjectModelsRouteParams
) {
  try {
    // Get the token from the authorization header
    const authHeader = request.headers.get("authorization") || "";
    const token = authHeader.split("Bearer ")[1];
    const tokenData = await verifyFirebaseToken(token);

    if (!tokenData) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const userId =
      tokenData.tokenType === "api_token" ? tokenData.userId : tokenData.uid;

    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid project ID" },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const modelId = searchParams.get("modelId");

    if (!modelId || !ObjectId.isValid(modelId)) {
      return NextResponse.json({ error: "Invalid model ID" }, { status: 400 });
    }

    const db = await getDatabase();
    const projectId = new ObjectId(id);
    const modelObjectId = new ObjectId(modelId);

    // Verify project exists and user has access
    const project = await db.collection("projects").findOne({
      _id: projectId,
    });

    if (!project) {
      return NextResponse.json(
        { error: "Project not found or insufficient permissions" },
        { status: 404 }
      );
    }

    // Remove model from project
    await db.collection("projects").updateOne(
      { _id: projectId },
      {
        $pull: { modelIds: modelObjectId } as any,
        $set: { updatedAt: new Date() },
      }
    );

    return NextResponse.json({
      message: "Model unlinked from project successfully",
      modelId: modelId,
    });
  } catch (error) {
    console.error("Error unlinking model from project:", error);
    return NextResponse.json(
      { error: "Failed to unlink model from project" },
      { status: 500 }
    );
  }
}

export { getProjectModels as GET };
export { linkModelToProject as POST };
export { unlinkModelFromProject as DELETE };
