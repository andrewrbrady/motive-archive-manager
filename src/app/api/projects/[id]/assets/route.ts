import { NextRequest, NextResponse } from "next/server";
import {
  verifyAuthMiddleware,
  getUserIdFromToken,
  verifyFirebaseToken,
} from "@/lib/firebase-auth-middleware";
import { connectToDatabase } from "@/lib/mongodb";
import { Project } from "@/models/Project";
import { ObjectId } from "mongodb";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log("🔒 GET /api/projects/[id]/assets: Starting request");

  // Check authentication
  const authResult = await verifyAuthMiddleware(request);
  if (authResult) {
    console.log("❌ GET /api/projects/[id]/assets: Authentication failed");
    return authResult;
  }

  try {
    // Get token data and extract user ID
    const authHeader = request.headers.get("authorization") || "";
    const token = authHeader.split("Bearer ")[1];
    const tokenData = await verifyFirebaseToken(token);

    if (!tokenData) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const userId = getUserIdFromToken(tokenData);

    const { id } = await params;
    await connectToDatabase();

    const project = await Project.findById(id);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Check if user has access to this project
    const hasAccess =
      project.ownerId === userId ||
      project.members.some((member: any) => member.userId === userId);

    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    console.log(
      "✅ GET /api/projects/[id]/assets: Successfully fetched assets"
    );
    return NextResponse.json({
      assets: project.assets,
      carIds: project.carIds,
      galleryIds: project.galleryIds,
      deliverableIds: project.deliverableIds,
    });
  } catch (error) {
    console.error(
      "💥 GET /api/projects/[id]/assets: Error fetching project assets:",
      error
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log("🔒 POST /api/projects/[id]/assets: Starting request");

  // Check authentication
  const authResult = await verifyAuthMiddleware(request);
  if (authResult) {
    console.log("❌ POST /api/projects/[id]/assets: Authentication failed");
    return authResult;
  }

  try {
    // Get token data and extract user ID
    const authHeader = request.headers.get("authorization") || "";
    const token = authHeader.split("Bearer ")[1];
    const tokenData = await verifyFirebaseToken(token);

    if (!tokenData) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const userId = getUserIdFromToken(tokenData);

    const body = await request.json();
    const { type, referenceId, name, url } = body;
    const { id } = await params;

    if (!type || !referenceId || !name) {
      return NextResponse.json(
        { error: "Type, reference ID, and name are required" },
        { status: 400 }
      );
    }

    // Validate asset type
    const validTypes = ["gallery", "image", "deliverable", "document"];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: "Invalid asset type" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const project = await Project.findById(id);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Check if user has permission to add assets
    const canAddAssets =
      project.ownerId === userId ||
      project.members.some(
        (member: any) =>
          member.userId === userId &&
          ["owner", "manager", "photographer", "editor"].includes(member.role)
      );

    if (!canAddAssets) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Check if asset already exists
    const existingAsset = project.assets.find(
      (asset: any) => asset.type === type && asset.referenceId === referenceId
    );
    if (existingAsset) {
      return NextResponse.json(
        { error: "Asset is already linked to this project" },
        { status: 400 }
      );
    }

    // Create new asset
    const newAsset = {
      id: new ObjectId().toString(),
      type,
      referenceId,
      name,
      url: url || undefined,
      addedAt: new Date(),
      addedBy: userId,
    };

    // Update project with new asset and reference IDs
    const updateData: any = {
      $push: { assets: newAsset },
    };

    // Also add to appropriate reference arrays
    if (type === "gallery") {
      updateData.$addToSet = { galleryIds: referenceId };
    } else if (type === "deliverable") {
      updateData.$addToSet = { deliverableIds: referenceId };
    }

    const updatedProject = await Project.findByIdAndUpdate(id, updateData, {
      new: true,
    });

    if (!updatedProject) {
      return NextResponse.json(
        { error: "Failed to add asset" },
        { status: 500 }
      );
    }

    console.log("✅ POST /api/projects/[id]/assets: Successfully added asset");
    return NextResponse.json({
      message: "Asset added successfully",
      asset: newAsset,
      assets: updatedProject.assets,
    });
  } catch (error) {
    console.error(
      "💥 POST /api/projects/[id]/assets: Error adding project asset:",
      error
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log("🔒 DELETE /api/projects/[id]/assets: Starting request");

  // Check authentication
  const authResult = await verifyAuthMiddleware(request);
  if (authResult) {
    console.log("❌ DELETE /api/projects/[id]/assets: Authentication failed");
    return authResult;
  }

  try {
    // Get token data and extract user ID
    const authHeader = request.headers.get("authorization") || "";
    const token = authHeader.split("Bearer ")[1];
    const tokenData = await verifyFirebaseToken(token);

    if (!tokenData) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const userId = getUserIdFromToken(tokenData);

    const { searchParams } = new URL(request.url);
    const assetId = searchParams.get("assetId");
    const { id } = await params;

    if (!assetId) {
      return NextResponse.json(
        { error: "Asset ID is required" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const project = await Project.findById(id);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Check if user has permission to remove assets
    const canRemoveAssets =
      project.ownerId === userId ||
      project.members.some(
        (member: any) =>
          member.userId === userId && ["owner", "manager"].includes(member.role)
      );

    if (!canRemoveAssets) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Find the asset to get its reference info before removing
    const assetToRemove = project.assets.find(
      (asset: any) => asset.id === assetId
    );
    if (!assetToRemove) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    // Remove asset from project
    const updateData: any = {
      $pull: { assets: { id: assetId } },
    };

    // Also remove from appropriate reference arrays if no other assets reference it
    const otherAssetsOfSameType = project.assets.filter(
      (asset: any) =>
        asset.id !== assetId &&
        asset.type === assetToRemove.type &&
        asset.referenceId === assetToRemove.referenceId
    );

    if (otherAssetsOfSameType.length === 0) {
      if (assetToRemove.type === "gallery") {
        updateData.$pull.galleryIds = assetToRemove.referenceId;
      } else if (assetToRemove.type === "deliverable") {
        updateData.$pull.deliverableIds = assetToRemove.referenceId;
      }
    }

    const updatedProject = await Project.findByIdAndUpdate(id, updateData, {
      new: true,
    });

    if (!updatedProject) {
      return NextResponse.json(
        { error: "Failed to remove asset" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Asset removed successfully",
      assets: updatedProject.assets,
    });
  } catch (error) {
    console.error(
      "💥 DELETE /api/projects/[id]/assets: Error removing project asset:",
      error
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
