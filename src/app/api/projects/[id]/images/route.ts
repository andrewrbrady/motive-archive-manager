import { NextRequest, NextResponse } from "next/server";
import { ObjectId, UpdateFilter } from "mongodb";
import { getDatabase, getMongoClient } from "@/lib/mongodb";
import { DB_NAME } from "@/constants";
import { fixCloudflareImageUrl } from "@/lib/image-utils";
import {
  verifyAuthMiddleware,
  verifyFirebaseToken,
  getUserIdFromToken,
} from "@/lib/firebase-auth-middleware";

// ✅ PERFORMANCE FIX: Images change less frequently
export const revalidate = 600; // 10 minutes

// Rate limiting to prevent infinite loops
const requestCounts = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 10000; // 10 seconds
const MAX_REQUESTS_PER_WINDOW = 20; // Max 20 requests per 10 seconds per project

function checkRateLimit(projectId: string): boolean {
  const now = Date.now();
  const key = `project-${projectId}`;
  const current = requestCounts.get(key);

  if (!current || now > current.resetTime) {
    // Reset window
    requestCounts.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (current.count >= MAX_REQUESTS_PER_WINDOW) {
    console.warn(
      `🚨 Rate limit exceeded for project ${projectId}: ${current.count} requests in ${RATE_LIMIT_WINDOW}ms`
    );
    return false;
  }

  current.count++;
  return true;
}

interface ImageData {
  imageUrl: string;
  imageId: string;
  metadata?: any;
}

interface Image {
  _id: ObjectId;
  cloudflareId: string;
  url: string;
  filename: string;
  metadata: any;
  projectId: ObjectId;
  createdAt: string;
  updatedAt: string;
}

interface ProjectDocument {
  _id: ObjectId;
  imageIds: ObjectId[];
  updatedAt?: string;
  images?: Image[];
}

async function getCloudflareAuth() {
  const apiToken = process.env.NEXT_PUBLIC_CLOUDFLARE_API_TOKEN;
  const accountId = process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_ID;

  if (!apiToken || !accountId) {
    throw new Error("Cloudflare API token or account ID is missing");
  }

  return { apiToken, accountId };
}

// GET images for a project
export async function GET(request: Request) {
  const startTime = Date.now();

  const url = new URL(request.url);
  const segments = url.pathname.split("/");
  const id = segments[segments.length - 2]; // -2 because URL is /projects/[id]/images

  try {
    // Rate limiting check first
    if (!checkRateLimit(id)) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded. Too many requests in a short time.",
          rateLimited: true,
          retryAfter: 10,
        },
        { status: 429 }
      );
    }

    // Parse query parameters
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "50");
    const skip =
      parseInt(url.searchParams.get("skip") || "0") || (page - 1) * limit;

    // Add logging for debugging infinite loop issues
    console.log(
      `🔍 [PROJECT IMAGES API] Request - ProjectId: ${id}, Page: ${page}, Limit: ${limit}, Skip: ${skip}`
    );
    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log(`🔍 [PROJECT IMAGES API] Full URL: ${url.href}`);
    console.log(
      `🔍 [PROJECT IMAGES API] All search params:`,
      Object.fromEntries(url.searchParams)
    );

    // Validate pagination parameters to prevent infinite loops
    if (page < 1) {
      return NextResponse.json(
        { error: "Invalid page number. Page must be 1 or greater." },
        { status: 400 }
      );
    }

    if (limit < 1 || limit > 1000) {
      return NextResponse.json(
        { error: "Invalid limit. Limit must be between 1 and 1000." },
        { status: 400 }
      );
    }

    if (skip < 0) {
      return NextResponse.json(
        { error: "Invalid skip value. Skip must be 0 or greater." },
        { status: 400 }
      );
    }

    // Safeguard against potentially infinite loops - if skip is extremely high, likely a bug
    if (skip > 100000) {
      console.warn(
        `⚠️ Extremely high skip value detected: ${skip} for project ${id}. Possible infinite loop.`
      );
      return NextResponse.json(
        {
          error: "Skip value too high. This might indicate a pagination issue.",
          pagination: {
            totalImages: 0,
            totalPages: 0,
            currentPage: 1,
            itemsPerPage: limit,
            startIndex: 1,
            endIndex: 0,
          },
        },
        { status: 400 }
      );
    }

    const category = url.searchParams.get("category");
    const search = url.searchParams.get("search");
    const angle = url.searchParams.get("angle");
    const movement = url.searchParams.get("movement");
    const timeOfDay = url.searchParams.get("timeOfDay");
    const view = url.searchParams.get("view");
    const side = url.searchParams.get("side");
    const imageType = url.searchParams.get("imageType");
    const sort = url.searchParams.get("sort") || "updatedAt";
    const sortDirection = url.searchParams.get("sortDirection") || "desc";

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid project ID format" },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const projectObjectId = new ObjectId(id);

    // PERFORMANCE OPTIMIZATION: Build optimized query with proper indexing
    const query: any = { projectId: projectObjectId };

    // Add metadata filters with support for nested metadata
    if (category) query["metadata.category"] = category;

    // Collect filter conditions to combine with AND
    const filterConditions = [];

    if (angle) {
      filterConditions.push({
        $or: [
          { "metadata.angle": angle },
          { "metadata.originalImage.metadata.angle": angle },
        ],
      });
    }

    if (movement) {
      filterConditions.push({
        $or: [
          { "metadata.movement": movement },
          { "metadata.originalImage.metadata.movement": movement },
        ],
      });
    }

    if (timeOfDay) {
      filterConditions.push({
        $or: [
          { "metadata.tod": timeOfDay },
          { "metadata.originalImage.metadata.tod": timeOfDay },
        ],
      });
    }

    if (view) {
      filterConditions.push({
        $or: [
          { "metadata.view": view },
          { "metadata.originalImage.metadata.view": view },
        ],
      });
    }

    if (side) {
      filterConditions.push({
        $or: [
          { "metadata.side": side },
          { "metadata.originalImage.metadata.side": side },
        ],
      });
    }

    if (imageType) {
      filterConditions.push({
        $or: [
          { "metadata.imageType": imageType },
          { "metadata.originalImage.metadata.imageType": imageType },
        ],
      });
    }

    // Combine all filter conditions with AND
    if (filterConditions.length > 0) {
      query.$and = filterConditions;
    }

    // Add search functionality - search across filename and relevant metadata
    if (search) {
      const searchRegex = new RegExp(search, "i");
      query.$or = [
        { filename: searchRegex },
        { "metadata.description": searchRegex },
        { "metadata.tags": { $in: [searchRegex] } },
      ];
    }

    console.log(
      `🔍 MongoDB Query for project ${id}:`,
      JSON.stringify(query, null, 2)
    );

    // PERFORMANCE: Get total count only when needed for pagination
    const includeCount = url.searchParams.get("includeCount") === "true";
    let totalImages = 0;

    if (includeCount) {
      totalImages = await db.collection("images").countDocuments(query);
    }

    // PERFORMANCE: Projection to only get needed fields initially
    const projection = {
      _id: 1,
      cloudflareId: 1,
      url: 1,
      filename: 1,
      metadata: 1,
      projectId: 1,
      createdAt: 1,
      updatedAt: 1,
    };

    // Build sort object
    const sortObj: any = {};
    sortObj[sort] = sortDirection === "desc" ? -1 : 1;

    // Add secondary sort for consistency
    if (sort !== "createdAt") {
      sortObj.createdAt = -1;
    }

    console.log(
      `📊 Executing query with pagination - Skip: ${skip}, Limit: ${limit}, Sort: ${JSON.stringify(sortObj)}`
    );

    // Execute query with pagination
    const images = await db
      .collection("images")
      .find(query, { projection })
      .sort(sortObj)
      .skip(skip)
      .limit(limit)
      .toArray();

    console.log(
      `📊 Query Results - Found: ${images.length} images in ${Date.now() - startTime}ms`
    );

    // Prevent infinite loops: Log if we're requesting beyond available data
    if (skip > 0 && images.length === 0 && includeCount) {
      console.warn(
        `⚠️ Requesting images beyond available data: Skip=${skip}, Total=${totalImages}, Project=${id}`
      );
    }

    // Process images with URL fixing and metadata normalization
    const processedImages = images.map((image) => ({
      _id: image._id.toString(),
      imageId: image._id.toString(), // For compatibility with existing frontend
      cloudflareId: image.cloudflareId,
      url: fixCloudflareImageUrl(image.url || ""),
      filename: image.filename || "untitled",
      metadata: {
        // Original metadata
        ...image.metadata,
        // Fallback to originalImage metadata if main metadata is missing
        angle:
          image.metadata?.angle ||
          image.metadata?.originalImage?.metadata?.angle ||
          null,
        movement:
          image.metadata?.movement ||
          image.metadata?.originalImage?.metadata?.movement ||
          null,
        tod:
          image.metadata?.tod ||
          image.metadata?.originalImage?.metadata?.tod ||
          null,
        view:
          image.metadata?.view ||
          image.metadata?.originalImage?.metadata?.view ||
          null,
        side:
          image.metadata?.side ||
          image.metadata?.originalImage?.metadata?.side ||
          null,
        imageType:
          image.metadata?.imageType ||
          image.metadata?.originalImage?.metadata?.imageType ||
          null,
        // Ensure isPrimary is properly set
        isPrimary: image.metadata?.isPrimary || false,
      },
      projectId: image.projectId?.toString(),
      createdAt: image.createdAt,
      updatedAt: image.updatedAt,
    }));

    // Calculate pagination info
    const totalPages = includeCount ? Math.ceil(totalImages / limit) : 0;
    const currentPage = Math.floor(skip / limit) + 1;

    const response = {
      images: processedImages,
      pagination: includeCount
        ? {
            totalImages,
            totalPages,
            currentPage,
            itemsPerPage: limit,
            startIndex: skip + 1,
            endIndex: Math.min(skip + limit, totalImages),
            hasNextPage: skip + limit < totalImages,
            hasPreviousPage: skip > 0,
          }
        : undefined,
      filters: {
        category,
        search,
        angle,
        movement,
        timeOfDay,
        view,
        side,
        imageType,
        sort,
        sortDirection,
      },
      processingTime: Date.now() - startTime,
    };

    console.log(
      `✅ Returning ${processedImages.length} images for project ${id} (${Date.now() - startTime}ms)`
    );

    return NextResponse.json(response);
  } catch (error) {
    console.error("❌ Error fetching project images:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch images",
        details: error instanceof Error ? error.message : "Unknown error",
        pagination: {
          totalImages: 0,
          totalPages: 0,
          currentPage: 1,
          itemsPerPage: 50,
          startIndex: 1,
          endIndex: 0,
        },
      },
      { status: 500 }
    );
  }
}

// POST - Upload new images for a project
export async function POST(request: NextRequest) {
  const url = new URL(request.url);
  const segments = url.pathname.split("/");
  const id = segments[segments.length - 2];

  // Check authentication
  const authResult = await verifyAuthMiddleware(request);
  if (authResult) {
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
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid project ID format" },
        { status: 400 }
      );
    }

    const formData = await request.formData();
    const files = formData.getAll("files") as File[];
    const metadataString = formData.get("metadata") as string;

    // Parse additional metadata if provided
    let additionalMetadata = {};
    if (metadataString) {
      try {
        additionalMetadata = JSON.parse(metadataString);
      } catch (error) {
        console.error("Failed to parse metadata:", error);
      }
    }

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    const { apiToken, accountId } = await getCloudflareAuth();
    const db = await getDatabase();
    const projectObjectId = new ObjectId(id);

    // Check if project exists and user has access
    const project = await db
      .collection("projects")
      .findOne({ _id: projectObjectId });
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Check if user has permission to upload images
    const isMember = project.members?.some(
      (member: any) => member.userId === userId
    );
    const isOwner = project.ownerId === userId;
    const canUpload =
      isOwner ||
      (isMember &&
        ["owner", "manager", "photographer", "editor"].includes(
          project.members.find((m: any) => m.userId === userId)?.role
        ));

    if (!canUpload) {
      return NextResponse.json(
        { error: "Insufficient permissions to upload images" },
        { status: 403 }
      );
    }

    const uploadedImages = [];

    for (const file of files) {
      try {
        // Upload to Cloudflare
        const cloudflareFormData = new FormData();
        cloudflareFormData.append("file", file);

        const uploadResponse = await fetch(
          `https://api.cloudflare.com/client/v4/accounts/${accountId}/images/v1`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiToken}`,
            },
            body: cloudflareFormData,
          }
        );

        const uploadResult = await uploadResponse.json();

        if (!uploadResponse.ok) {
          console.error("Cloudflare upload failed:", uploadResult);
          continue;
        }

        // Create image document
        const imageDoc = {
          cloudflareId: uploadResult.result.id,
          url: uploadResult.result.variants[0].replace(/\/public$/, ""),
          filename: file.name,
          metadata: {
            size: file.size,
            type: file.type,
            uploadedAt: new Date().toISOString(),
            imageContext: (additionalMetadata as any)?.imageContext,
            ...((additionalMetadata as any)?.imageContext && {
              analysisContext: (additionalMetadata as any).imageContext,
            }),
          },
          projectId: projectObjectId,
          ...((additionalMetadata as any)?.locationId && {
            locationId: new ObjectId((additionalMetadata as any).locationId),
          }),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        const result = await db.collection("images").insertOne(imageDoc);

        // Add to project's imageIds (store as ObjectId, not string)
        await db.collection("projects").updateOne(
          { _id: projectObjectId },
          {
            $addToSet: { imageIds: result.insertedId },
            $set: { updatedAt: new Date().toISOString() },
          }
        );

        uploadedImages.push({
          _id: result.insertedId.toString(),
          ...imageDoc,
          url: fixCloudflareImageUrl(imageDoc.url),
        });
      } catch (fileError) {
        console.error(`Error uploading ${file.name}:`, fileError);
      }
    }

    return NextResponse.json({
      success: true,
      uploadedImages,
      count: uploadedImages.length,
    });
  } catch (error) {
    console.error("Error uploading project images:", error);
    return NextResponse.json(
      { error: "Failed to upload images" },
      { status: 500 }
    );
  }
}

// DELETE - Remove images from a project
export async function DELETE(request: Request) {
  const url = new URL(request.url);
  const segments = url.pathname.split("/");
  const id = segments[segments.length - 2];

  try {
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid project ID format" },
        { status: 400 }
      );
    }

    const { imageIds } = await request.json();

    if (!Array.isArray(imageIds) || imageIds.length === 0) {
      return NextResponse.json(
        { error: "Invalid or empty imageIds array" },
        { status: 400 }
      );
    }

    const { apiToken, accountId } = await getCloudflareAuth();
    const db = await getDatabase();
    const projectObjectId = new ObjectId(id);

    // Get images to delete
    const imageObjectIds = imageIds.map((id: string) => new ObjectId(id));
    const imagesToDelete = await db
      .collection("images")
      .find({
        _id: { $in: imageObjectIds },
        projectId: projectObjectId,
      })
      .toArray();

    // Delete from Cloudflare
    for (const image of imagesToDelete) {
      try {
        await fetch(
          `https://api.cloudflare.com/client/v4/accounts/${accountId}/images/v1/${image.cloudflareId}`,
          {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${apiToken}`,
            },
          }
        );
      } catch (error) {
        console.error(
          `Failed to delete image ${image.cloudflareId} from Cloudflare:`,
          error
        );
      }
    }

    // Delete from database
    await db.collection("images").deleteMany({
      _id: { $in: imageObjectIds },
      projectId: projectObjectId,
    });

    // Remove from project's imageIds (ObjectIds only)
    await db.collection("projects").updateOne({ _id: projectObjectId }, {
      $pullAll: { imageIds: imageObjectIds },
      $set: { updatedAt: new Date().toISOString() },
    } as any);

    return NextResponse.json({
      success: true,
      deletedCount: imagesToDelete.length,
    });
  } catch (error) {
    console.error("Error deleting project images:", error);
    return NextResponse.json(
      { error: "Failed to delete images" },
      { status: 500 }
    );
  }
}

export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
