import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import {
  verifyAuthMiddleware,
  getUserIdFromToken,
  verifyFirebaseToken,
} from "@/lib/firebase-auth-middleware";

interface ProjectGalleriesRouteParams {
  params: Promise<{ id: string }>;
}

// GET - Fetch galleries linked to project
export async function GET(
  request: NextRequest,
  { params }: ProjectGalleriesRouteParams
) {
  // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("🔒 GET /api/projects/[id]/galleries: Starting request");

  // Check authentication
  const authResult = await verifyAuthMiddleware(request);
  if (authResult) {
    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("❌ GET /api/projects/[id]/galleries: Authentication failed");
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
      $or: [{ ownerId: userId }, { "members.userId": userId }],
    });

    if (!project) {
      return NextResponse.json(
        { error: "Project not found or access denied" },
        { status: 404 }
      );
    }

    // Fetch gallery details for linked galleries
    const galleries = [];
    if (project.galleryIds && project.galleryIds.length > 0) {
      // galleryIds should already be ObjectIds in the database
      const galleryObjectIds = project.galleryIds
        .filter(
          (galleryId: any) =>
            galleryId instanceof ObjectId || ObjectId.isValid(galleryId)
        )
        .map((galleryId: any) =>
          galleryId instanceof ObjectId ? galleryId : new ObjectId(galleryId)
        );

      if (galleryObjectIds.length > 0) {
        const galleryDocs = await db
          .collection("galleries")
          .find({ _id: { $in: galleryObjectIds } })
          .project({
            _id: 1,
            name: 1,
            description: 1,
            imageIds: 1,
            orderedImages: 1,
            createdAt: 1,
            updatedAt: 1,
          })
          .toArray();

        // Get thumbnail images for each gallery
        const galleriesWithThumbnails = await Promise.all(
          galleryDocs.map(async (gallery) => {
            let thumbnailImage = null;

            // Get the first image ID, handling both orderedImages and imageIds
            const firstImageId = gallery.orderedImages?.length
              ? gallery.orderedImages[0].id
              : gallery.imageIds[0];

            if (firstImageId) {
              const imageDoc = await db.collection("images").findOne({
                _id:
                  firstImageId instanceof ObjectId
                    ? firstImageId
                    : new ObjectId(firstImageId),
              });

              if (imageDoc) {
                thumbnailImage = {
                  _id: imageDoc._id.toString(),
                  url: imageDoc.url,
                };
              }
            }

            return {
              ...gallery,
              _id: gallery._id.toString(),
              imageIds:
                gallery.imageIds?.map((id: ObjectId) => id.toString()) || [],
              orderedImages:
                gallery.orderedImages?.map((item: any) => ({
                  id:
                    item.id instanceof ObjectId ? item.id.toString() : item.id,
                  order: item.order,
                })) || [],
              thumbnailImage,
              imageCount: gallery.imageIds?.length || 0,
            };
          })
        );

        galleries.push(...galleriesWithThumbnails);
      }
    }

    return NextResponse.json({ galleries });
  } catch (error) {
    console.error("Error fetching project galleries:", error);
    return NextResponse.json(
      { error: "Failed to fetch project galleries" },
      { status: 500 }
    );
  }
}

// POST - Link gallery to project
export async function POST(
  request: NextRequest,
  { params }: ProjectGalleriesRouteParams
) {
  // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("🔒 POST /api/projects/[id]/galleries: Starting request");

  // Check authentication
  const authResult = await verifyAuthMiddleware(request);
  if (authResult) {
    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("❌ POST /api/projects/[id]/galleries: Authentication failed");
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
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid project ID" },
        { status: 400 }
      );
    }

    const { galleryId } = await request.json();
    if (!galleryId || !ObjectId.isValid(galleryId)) {
      return NextResponse.json(
        { error: "Invalid gallery ID" },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const projectId = new ObjectId(id);
    const galleryObjectId = new ObjectId(galleryId);

    // Verify project exists and user has access
    const project = await db.collection("projects").findOne({
      _id: projectId,
      $or: [
        { ownerId: userId },
        {
          "members.userId": userId,
          "members.role": { $in: ["owner", "manager"] },
        },
      ],
    });

    if (!project) {
      return NextResponse.json(
        { error: "Project not found or insufficient permissions" },
        { status: 404 }
      );
    }

    // Verify gallery exists
    const gallery = await db
      .collection("galleries")
      .findOne({ _id: galleryObjectId });
    if (!gallery) {
      return NextResponse.json({ error: "Gallery not found" }, { status: 404 });
    }

    // Check if gallery is already linked
    const galleryIdExists =
      project.galleryIds &&
      project.galleryIds.some((id: any) => {
        const idStr = id instanceof ObjectId ? id.toString() : id;
        return idStr === galleryId;
      });

    if (galleryIdExists) {
      return NextResponse.json(
        { error: "Gallery is already linked to this project" },
        { status: 400 }
      );
    }

    // Add gallery to project (store as ObjectId)
    await db.collection("projects").updateOne(
      { _id: projectId },
      {
        $addToSet: { galleryIds: galleryObjectId },
        $set: { updatedAt: new Date() },
      }
    );

    return NextResponse.json({
      message: "Gallery linked to project successfully",
      galleryId: galleryId,
    });
  } catch (error) {
    console.error("Error linking gallery to project:", error);
    return NextResponse.json(
      { error: "Failed to link gallery to project" },
      { status: 500 }
    );
  }
}

// DELETE - Unlink gallery from project
export async function DELETE(
  request: NextRequest,
  { params }: ProjectGalleriesRouteParams
) {
  try {
    // Check authentication
    const authResult = await verifyAuthMiddleware(request);
    if (authResult) {
      console.log(
        "❌ DELETE /api/projects/[id]/galleries: Authentication failed"
      );
      return authResult;
    }

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
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid project ID" },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const galleryId = searchParams.get("galleryId");

    if (!galleryId || !ObjectId.isValid(galleryId)) {
      return NextResponse.json(
        { error: "Invalid gallery ID" },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const projectId = new ObjectId(id);
    const galleryObjectId = new ObjectId(galleryId);

    // Verify project exists and user has access
    const project = await db.collection("projects").findOne({
      _id: projectId,
      $or: [
        { ownerId: userId },
        {
          "members.userId": userId,
          "members.role": { $in: ["owner", "manager"] },
        },
      ],
    });

    if (!project) {
      return NextResponse.json(
        { error: "Project not found or insufficient permissions" },
        { status: 404 }
      );
    }

    // Remove gallery from project
    await db.collection("projects").updateOne(
      { _id: projectId },
      {
        $pull: { galleryIds: galleryObjectId } as any,
        $set: { updatedAt: new Date() },
      }
    );

    return NextResponse.json({
      message: "Gallery unlinked from project successfully",
      galleryId: galleryId,
    });
  } catch (error) {
    console.error("Error unlinking gallery from project:", error);
    return NextResponse.json(
      { error: "Failed to unlink gallery from project" },
      { status: 500 }
    );
  }
}
