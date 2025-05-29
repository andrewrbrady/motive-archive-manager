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
import { getFormattedImageUrl } from "@/lib/cloudflare";

async function createProject(request: NextRequest) {
  console.log("🔒 POST /api/projects: Starting request");

  // Check authentication
  const authResult = await verifyAuthMiddleware(request);
  if (authResult) {
    console.log("❌ POST /api/projects: Authentication failed");
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

    const db = await getDatabase();
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
  } catch (error) {
    console.error("Error creating project:", error);
    return NextResponse.json(
      { error: "Failed to create project" },
      { status: 500 }
    );
  }
}

async function getProjects(request: NextRequest) {
  console.log("🔒 GET /api/projects: Starting request");

  // Check authentication
  const authResult = await verifyAuthMiddleware(request);
  if (authResult) {
    console.log("❌ GET /api/projects: Authentication failed");
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

    console.log("Projects API: Session check", {
      hasSession: true,
      userId: userId,
    });

    const db = await getDatabase();
    console.log("Projects API: Database connection established");

    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const search = searchParams.get("search") || "";
    const sort = searchParams.get("sort") || "createdAt_desc";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const status = searchParams.get("status");
    const type = searchParams.get("type");
    const clientId = searchParams.get("clientId");
    const ownerId = searchParams.get("ownerId");
    const includeImages = searchParams.get("includeImages") === "true";

    console.log("Projects API: Query parameters", {
      search,
      sort,
      page,
      limit,
      status,
      type,
      clientId,
      ownerId,
      includeImages,
    });

    // Build query
    const query: any = {
      $or: [{ ownerId: userId }, { "members.userId": userId }],
    };

    // Add search
    if (search) {
      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { title: { $regex: search, $options: "i" } },
          { description: { $regex: search, $options: "i" } },
          { tags: { $in: [new RegExp(search, "i")] } },
        ],
      });
    }

    // Add filters
    if (status) {
      const statusArray = status.split(",");
      query.status = { $in: statusArray };
    }

    if (type) {
      const typeArray = type.split(",");
      query.type = { $in: typeArray };
    }

    if (clientId) {
      query.clientId = clientId;
    }

    if (ownerId) {
      query.ownerId = ownerId;
    }

    console.log("Projects API: Final query", JSON.stringify(query, null, 2));

    // Debug: Check all projects in database vs user-accessible projects
    const allProjects = await db.collection("projects").find({}).toArray();
    console.log("Projects API: All projects in database:", {
      totalProjects: allProjects.length,
      projects: allProjects.map((p) => ({
        id: p._id,
        title: p.title,
        ownerId: p.ownerId,
        members:
          p.members?.map((m: any) => ({ userId: m.userId, role: m.role })) ||
          [],
        currentUserId: userId,
      })),
    });

    // Parse sort parameter
    const [sortField, sortOrder] = sort.split("_");
    const sortOptions = {
      [sortField === "createdAt" ? "_id" : sortField]:
        sortOrder === "desc" ? -1 : 1,
    } as const;

    console.log("Projects API: Sort options", sortOptions);

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Execute query
    console.log("Projects API: Executing database query...");
    const [projects, total] = await Promise.all([
      db
        .collection("projects")
        .find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .toArray(),
      db.collection("projects").countDocuments(query),
    ]);

    console.log("Projects API: Query results", {
      projectsFound: projects.length,
      totalCount: total,
      firstProjectTitle: projects[0]?.title || "No projects",
    });

    // Debug: Log primary image IDs from projects
    console.log(
      "Projects API: Primary image IDs in projects:",
      projects.map((p) => ({
        id: p._id,
        title: p.title,
        primaryImageId: p.primaryImageId,
        primaryImageIdString: p.primaryImageId?.toString(),
        hasPrimaryImageId: !!p.primaryImageId,
      }))
    );

    // ✅ Fetch primary image URLs if requested
    let projectsWithImages = projects;
    if (includeImages) {
      console.log("Projects API: Fetching primary image URLs...");

      // Get all unique image IDs
      const imageIds = projects
        .map((p) => p.primaryImageId)
        .filter(Boolean)
        .map((id) => new ObjectId(id));

      console.log(
        "Projects API: Image IDs to fetch:",
        imageIds.map((id) => id.toString())
      );

      if (imageIds.length > 0) {
        // Batch fetch all images
        const images = await db
          .collection("images")
          .find({
            _id: { $in: imageIds },
          })
          .toArray();

        console.log(
          "Projects API: Found images:",
          images.map((img) => ({
            id: img._id.toString(),
            url: img.url,
            filename: img.filename,
          }))
        );

        // Create a map of imageId -> imageUrl
        const imageUrlMap = new Map();
        images.forEach((img) => {
          // Format the image URL with the proper variant for display in project cards
          const formattedUrl = getFormattedImageUrl(img.url, "public");
          imageUrlMap.set(img._id.toString(), formattedUrl);
        });

        console.log(
          "Projects API: Image URL map:",
          Array.from(imageUrlMap.entries())
        );

        // Add image URLs to projects
        projectsWithImages = projects.map((project) => ({
          ...project,
          primaryImageUrl: project.primaryImageId
            ? imageUrlMap.get(project.primaryImageId.toString())
            : null,
        }));

        console.log(
          "Projects API: Projects with images:",
          projectsWithImages.map((p) => ({
            id: p._id,
            title: p.title,
            primaryImageId: p.primaryImageId,
            primaryImageIdString: p.primaryImageId?.toString(),
            primaryImageUrl: p.primaryImageUrl,
            lookupKey: p.primaryImageId?.toString(),
            foundInMap: p.primaryImageId
              ? imageUrlMap.has(p.primaryImageId.toString())
              : false,
          }))
        );

        console.log("Projects API: Added image URLs", {
          imagesFound: images.length,
          projectsWithImages: projectsWithImages.filter(
            (p) => p.primaryImageUrl
          ).length,
        });
      } else {
        console.log("Projects API: No image IDs to fetch");
      }
    }

    const response: ProjectListResponse = {
      projects: projectsWithImages.map((project) =>
        convertProjectForFrontend(project)
      ) as IProject[],
      total,
      page,
      limit,
    };

    console.log("✅ GET /api/projects: Successfully fetched projects", {
      projectsCount: response.projects.length,
      total: response.total,
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error("💥 GET /api/projects: Error fetching projects:", error);
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
