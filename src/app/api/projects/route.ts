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
import { auth } from "@/auth";
import { ObjectId } from "mongodb";
import { ProjectTemplate } from "@/models/ProjectTemplate";
import { convertProjectForFrontend } from "@/utils/objectId";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

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
        ownerId: session.user.id,
        templateId: data.templateId,
        timeline: {
          startDate: new Date(data.timeline.startDate),
          endDate: endDate,
          milestones: milestones,
          estimatedDuration: template.defaultTimeline.estimatedDuration || 30,
        },
        members: [
          {
            userId: session.user.id,
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
      ownerId: session.user.id,
      timeline: {
        startDate: new Date(data.timeline.startDate),
        endDate: data.timeline.endDate
          ? new Date(data.timeline.endDate)
          : undefined,
        milestones: milestones,
        estimatedDuration: data.timeline.estimatedDuration,
      },
      members: [
        {
          userId: session.user.id,
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

    if (process.env.NODE_ENV !== "production") {
      console.log("Created project:", {
        id: project?._id,
        title: project?.title,
        type: project?.type,
        status: project?.status,
      });
    }

    return NextResponse.json(
      {
        project: convertProjectForFrontend(project),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating project:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to create project", details: errorMessage },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log("Projects API: GET request received");

    const session = await auth();
    console.log("Projects API: Session check", {
      hasSession: !!session,
      userId: session?.user?.id,
    });

    if (!session?.user?.id) {
      console.log("Projects API: No authentication, returning 401");
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

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

    console.log("Projects API: Query parameters", {
      search,
      sort,
      page,
      limit,
      status,
      type,
      clientId,
      ownerId,
    });

    // Build query
    const query: any = {
      $or: [
        { ownerId: session.user.id },
        { "members.userId": session.user.id },
      ],
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
        currentUserId: session.user.id,
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

    const response: ProjectListResponse = {
      projects: projects.map((project) =>
        convertProjectForFrontend(project)
      ) as IProject[],
      total,
      page,
      limit,
    };

    console.log("Projects API: Returning response", {
      projectsCount: response.projects.length,
      total: response.total,
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error("Projects API: Error fetching projects:", error);
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
