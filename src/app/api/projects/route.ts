import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { Project } from "@/models/Project";
import {
  CreateProjectRequest,
  ProjectFilters,
  ProjectSearchParams,
  ProjectListResponse,
  Project as IProject,
} from "@/types/project";
import {
  verifyAuthMiddleware,
  getUserIdFromToken,
  verifyFirebaseToken,
} from "@/lib/firebase-auth-middleware";
import { ObjectId } from "mongodb";
import { ProjectTemplate } from "@/models/ProjectTemplate";
import { convertProjectForFrontend } from "@/utils/objectId";

async function createProject(request: NextRequest) {
  // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("🔒 POST /api/projects: Starting request");

  // Check authentication
  const authResult = await verifyAuthMiddleware(request);
  if (authResult) {
    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("❌ POST /api/projects: Authentication failed");
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

    // ⚡ OPTIMIZED: Single database connection with error handling
    let db;
    try {
      db = await getDatabase();
    } catch (dbError) {
      console.error("Database connection error:", dbError);
      return NextResponse.json(
        { error: "Database connection failed" },
        { status: 503 }
      );
    }

    const data: CreateProjectRequest = await request.json();

    if (process.env.NODE_ENV !== "production") {
      console.log("Creating project with data:", {
        title: data.title,
        type: data.type,
        hasClientId: !!data.clientId,
        carIdsCount: data.carIds?.length || 0,
        hasTemplate: !!data.templateId,
      });
    }

    // Validate required fields
    if (
      !data.title ||
      !data.description ||
      !data.type ||
      !data.timeline?.startDate
    ) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: title, description, type, and timeline.startDate are required",
        },
        { status: 400 }
      );
    }

    // If using a template, fetch it and create project from template
    if (data.templateId) {
      try {
        const template = await db.collection("project_templates").findOne({
          _id: new ObjectId(data.templateId),
        });

        if (!template) {
          return NextResponse.json(
            { error: "Template not found" },
            { status: 404 }
          );
        }

        // Use template's createProject method would be ideal, but for now create manually
        const milestones = template.defaultTimeline.milestones.map(
          (milestone: any) => ({
            id:
              new Date().getTime().toString() +
              Math.random().toString(36).substr(2, 9),
            title: milestone.title,
            description: milestone.description,
            dueDate: new Date(
              new Date(data.timeline.startDate).getTime() +
                milestone.daysFromStart * 24 * 60 * 60 * 1000
            ),
            completed: false,
            dependencies: milestone.dependencies || [],
            assignedTo: [],
          })
        );

        const endDate =
          data.timeline.endDate ||
          new Date(
            new Date(data.timeline.startDate).getTime() +
              (template.defaultTimeline.estimatedDuration || 30) *
                24 *
                60 *
                60 *
                1000
          );

        const projectData = {
          title: data.title,
          description: data.description,
          type: data.type,
          status: "draft",
          clientId: data.clientId,
          carIds: data.carIds || [],
          galleryIds: [],
          deliverableIds: [],
          eventIds: [],
          ownerId: userId,
          templateId: data.templateId,
          timeline: {
            startDate: new Date(data.timeline.startDate),
            endDate: endDate,
            milestones: milestones,
            estimatedDuration: template.defaultTimeline.estimatedDuration || 30,
          },
          members: [
            {
              userId: userId,
              role: "owner",
              permissions: [
                "read",
                "write",
                "delete",
                "manage_team",
                "manage_budget",
                "manage_timeline",
              ],
              joinedAt: new Date(),
            },
            ...(data.members || []).map((member) => ({
              ...member,
              permissions: getDefaultPermissions(member.role),
              joinedAt: new Date(),
            })),
          ],
          assets: [],
          progress: {
            percentage: 0,
            completedTasks: 0,
            totalTasks: milestones.length,
            lastUpdated: new Date(),
          },
          tags: data.tags || [],
          budget: data.budget
            ? {
                total: data.budget.total,
                spent: 0,
                remaining: data.budget.total,
                currency: data.budget.currency,
                expenses: [],
              }
            : template.defaultBudget
              ? {
                  total: template.defaultBudget.total || 0,
                  spent: 0,
                  remaining: template.defaultBudget.total || 0,
                  currency: template.defaultBudget.currency || "USD",
                  expenses: [],
                }
              : undefined,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const result = await db.collection("projects").insertOne(projectData);
        const project = await db
          .collection("projects")
          .findOne({ _id: result.insertedId });

        console.log(
          "✅ POST /api/projects: Successfully created project from template"
        );
        return NextResponse.json(
          {
            project: convertProjectForFrontend(project),
          },
          { status: 201 }
        );
      } catch (templateError) {
        console.error("Template processing error:", templateError);
        return NextResponse.json(
          { error: "Template processing failed" },
          { status: 500 }
        );
      }
    }

    // Create project without template
    const milestones = data.timeline.estimatedDuration
      ? [
          {
            id:
              new Date().getTime().toString() +
              Math.random().toString(36).substr(2, 9),
            title: "Project Completion",
            description: "Complete all project deliverables",
            dueDate:
              data.timeline.endDate ||
              new Date(
                new Date(data.timeline.startDate).getTime() +
                  data.timeline.estimatedDuration * 24 * 60 * 60 * 1000
              ),
            completed: false,
            dependencies: [],
            assignedTo: [],
          },
        ]
      : [];

    const projectData = {
      title: data.title,
      description: data.description,
      type: data.type,
      status: "draft",
      clientId: data.clientId,
      carIds: data.carIds || [],
      galleryIds: [],
      deliverableIds: [],
      eventIds: [],
      ownerId: userId,
      timeline: {
        startDate: new Date(data.timeline.startDate),
        endDate:
          data.timeline.endDate ||
          new Date(
            new Date(data.timeline.startDate).getTime() +
              (data.timeline.estimatedDuration || 30) * 24 * 60 * 60 * 1000
          ),
        milestones: milestones,
        estimatedDuration: data.timeline.estimatedDuration || 30,
      },
      members: [
        {
          userId: userId,
          role: "owner",
          permissions: [
            "read",
            "write",
            "delete",
            "manage_team",
            "manage_budget",
            "manage_timeline",
          ],
          joinedAt: new Date(),
        },
        ...(data.members || []).map((member) => ({
          ...member,
          permissions: getDefaultPermissions(member.role),
          joinedAt: new Date(),
        })),
      ],
      assets: [],
      progress: {
        percentage: 0,
        completedTasks: 0,
        totalTasks: milestones.length,
        lastUpdated: new Date(),
      },
      tags: data.tags || [],
      budget: data.budget
        ? {
            total: data.budget.total,
            spent: 0,
            remaining: data.budget.total,
            currency: data.budget.currency,
            expenses: [],
          }
        : undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    try {
      const result = await db.collection("projects").insertOne(projectData);
      const project = await db
        .collection("projects")
        .findOne({ _id: result.insertedId });

      return NextResponse.json(
        {
          project: convertProjectForFrontend(project),
        },
        { status: 201 }
      );
    } catch (insertError) {
      console.error("Project insertion error:", insertError);
      return NextResponse.json(
        { error: "Failed to create project" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error creating project:", error);
    return NextResponse.json(
      { error: "Failed to create project" },
      { status: 500 }
    );
  }
}

async function getProjects(request: NextRequest) {
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

    // ⚡ OPTIMIZED: Single database connection with error handling
    let db;
    try {
      db = await getDatabase();
    } catch (dbError) {
      console.error("Database connection error:", dbError);
      return NextResponse.json(
        { error: "Database connection failed" },
        { status: 503 }
      );
    }

    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const search = searchParams.get("search") || "";
    const sort = searchParams.get("sort") || "createdAt_desc";
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = Math.min(
      parseInt(
        searchParams.get("pageSize") || searchParams.get("limit") || "20"
      ),
      50 // Maximum page size for performance (projects are more complex than events)
    );
    const status = searchParams.get("status");
    const type = searchParams.get("type");
    const clientId = searchParams.get("clientId");
    const ownerId = searchParams.get("ownerId");
    const includeImages = searchParams.get("includeImages") === "true";

    // Build base match query
    const matchQuery: any = {
      $or: [{ ownerId: userId }, { "members.userId": userId }],
    };

    // Enhanced search implementation following cars/deliverables pattern
    if (search && search.trim()) {
      const searchTerms = search.trim().split(/\s+/).filter(Boolean);

      if (searchTerms.length > 0) {
        const searchConditions: any[] = [];

        searchTerms.forEach((term) => {
          // Escape special regex characters to prevent errors
          const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          const searchRegex = new RegExp(escapedTerm, "i");

          // Apply search to primary fields
          searchConditions.push(
            { title: searchRegex },
            { description: searchRegex },
            { tags: { $in: [searchRegex] } }
          );
        });

        // For multi-word searches, also try to match the full search term
        if (searchTerms.length > 1) {
          const fullSearchRegex = new RegExp(
            search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
            "i"
          );
          searchConditions.push(
            { title: fullSearchRegex },
            { description: fullSearchRegex },
            { tags: { $in: [fullSearchRegex] } }
          );
        }

        // Combine with existing $and conditions or create new ones
        if (matchQuery.$and) {
          matchQuery.$and.push({ $or: searchConditions });
        } else {
          matchQuery.$and = [{ $or: searchConditions }];
        }
      }
    }

    // Add filters
    if (status) {
      const statusArray = status.split(",");
      matchQuery.status = { $in: statusArray };
    }

    if (type) {
      const typeArray = type.split(",");
      matchQuery.type = { $in: typeArray };
    }

    if (clientId) {
      matchQuery.clientId = clientId;
    }

    if (ownerId) {
      matchQuery.ownerId = ownerId;
    }

    // Parse sort parameter
    const [sortField, sortOrder] = sort.split("_");
    const sortOptions = {
      [sortField === "createdAt" ? "_id" : sortField]:
        sortOrder === "desc" ? -1 : 1,
    } as const;

    // Calculate pagination
    const skip = (page - 1) * pageSize;

    try {
      // ⚡ OPTIMIZED: Simplified aggregation pipeline to reduce connection strain
      const pipeline: any[] = [{ $match: matchQuery }];

      // ⚡ OPTIMIZED: Only add image lookup if specifically requested
      if (includeImages) {
        // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("🔍 Adding image lookup to projects pipeline");
        pipeline.push(
          {
            $lookup: {
              from: "images",
              let: {
                primaryId: {
                  $cond: [
                    { $ifNull: ["$primaryImageId", false] },
                    { $toObjectId: "$primaryImageId" },
                    null,
                  ],
                },
              },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [{ $eq: ["$_id", "$$primaryId"] }],
                    },
                  },
                },
                { $limit: 1 },
              ],
              as: "primaryImageData",
            },
          },
          {
            $addFields: {
              primaryImageUrl: {
                $cond: {
                  if: { $gt: [{ $size: "$primaryImageData" }, 0] },
                  then: { $arrayElemAt: ["$primaryImageData.url", 0] },
                  else: null,
                },
              },
            },
          },
          {
            $unset: "primaryImageData",
          }
        );
      }

      // Add sorting and pagination
      pipeline.push(
        { $sort: sortOptions },
        { $skip: skip },
        { $limit: pageSize }
      );

      // ⚡ OPTIMIZED: Use Promise.allSettled to handle failures gracefully
      const [projectsResult, totalResult] = await Promise.allSettled([
        db.collection("projects").aggregate(pipeline).toArray(),
        db
          .collection("projects")
          .aggregate([{ $match: matchQuery }, { $count: "total" }])
          .toArray(),
      ]);

      let projects: any[] = [];
      let total = 0;

      if (projectsResult.status === "fulfilled") {
        projects = projectsResult.value;
      } else {
        console.error("Projects query failed:", projectsResult.reason);
        return NextResponse.json(
          {
            error: "Query execution failed",
            details: "Database query timeout",
          },
          { status: 500 }
        );
      }

      if (totalResult.status === "fulfilled") {
        total = totalResult.value[0]?.total || 0;
      } else {
        console.error("Count query failed:", totalResult.reason);
        // Continue without count for pagination
        total = 0;
      }

      const totalPages = Math.ceil(total / pageSize);

      // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("🔍 Raw projects from aggregation:", projects.length);

      // ⚡ OPTIMIZED: Simplified image processing
      const processedProjects = projects.map((project) => {
        if (includeImages && project.primaryImageUrl) {
          console.log(
            "🔍 Processing project image URL:",
            project.primaryImageUrl
          );

          // Simple fix: ensure Cloudflare URLs have /public variant
          let finalUrl = project.primaryImageUrl;
          if (
            finalUrl.includes("imagedelivery.net") &&
            !finalUrl.includes("/public")
          ) {
            finalUrl = `${finalUrl}/public`;
          }

          // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("🔍 Final URL:", finalUrl);

          return {
            ...project,
            primaryImageUrl: finalUrl,
          };
        }
        return project;
      });

      // Enhanced response following cars/deliverables pattern
      const response = NextResponse.json({
        projects: processedProjects.map((project) =>
          convertProjectForFrontend(project)
        ) as IProject[],
        pagination: {
          currentPage: page,
          totalPages,
          totalCount: total,
          pageSize,
          // Legacy support
          total,
          page,
          limit: pageSize,
        },
      });

      // Add cache headers for better performance following cars/deliverables pattern
      response.headers.set(
        "Cache-Control",
        "public, s-maxage=60, stale-while-revalidate=300"
      );
      response.headers.set("ETag", `"projects-${total}-${page}-${pageSize}"`);

      return response;
    } catch (dbError) {
      console.error("Database operation error:", dbError);
      console.error(
        "Error stack:",
        dbError instanceof Error ? dbError.stack : "No stack trace"
      );

      // ⚡ OPTIMIZED: Better error classification for connection issues
      const errorMessage =
        dbError instanceof Error ? dbError.message : "Unknown error";
      const isConnectionError =
        errorMessage.toLowerCase().includes("connection") ||
        errorMessage.toLowerCase().includes("timeout") ||
        errorMessage.toLowerCase().includes("pool");

      return NextResponse.json(
        {
          error: isConnectionError
            ? "Database connection timeout"
            : "Database operation failed",
          details: errorMessage,
          retryAfter: isConnectionError ? 5 : null,
        },
        { status: isConnectionError ? 503 : 500 }
      );
    }
  } catch (error) {
    console.error("Error fetching projects:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to fetch projects", details: errorMessage },
      { status: 500 }
    );
  }
}

// Helper function to get default permissions based on role
function getDefaultPermissions(role: string): string[] {
  const defaultPermissions: Record<string, string[]> = {
    owner: [
      "read",
      "write",
      "delete",
      "manage_team",
      "manage_budget",
      "manage_timeline",
    ],
    manager: ["read", "write", "manage_team", "manage_timeline"],
    photographer: ["read", "write"],
    editor: ["read", "write"],
    writer: ["read", "write"],
    viewer: ["read"],
  };

  return defaultPermissions[role] || ["read"];
}

// Export the functions directly
export const GET = getProjects;
export const POST = createProject;
