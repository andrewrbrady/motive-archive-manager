import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { ProjectTemplate } from "@/models/ProjectTemplate";
import {
  ProjectTemplate as IProjectTemplate,
  ProjectType,
} from "@/types/project";
import { auth } from "@/auth";
import { ObjectId } from "mongodb";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const db = await getDatabase();
    const { searchParams } = new URL(request.url);

    const type = searchParams.get("type") as ProjectType | null;
    const isPublic = searchParams.get("public");
    const search = searchParams.get("search") || "";

    // Build query
    const query: any = {
      $or: [{ isPublic: true }, { createdBy: session.user.id }],
    };

    // Add type filter
    if (type) {
      query.type = type;
    }

    // Add public filter
    if (isPublic !== null) {
      query.isPublic = isPublic === "true";
    }

    // Add search
    if (search) {
      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { name: { $regex: search, $options: "i" } },
          { description: { $regex: search, $options: "i" } },
        ],
      });
    }

    const templates = await db
      .collection("project_templates")
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json({
      templates: templates as unknown as IProjectTemplate[],
    });
  } catch (error) {
    console.error("Error fetching project templates:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to fetch project templates", details: errorMessage },
      { status: 500 }
    );
  }
}

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
    const data = await request.json();

    if (process.env.NODE_ENV !== "production") {
      console.log("Creating project template:", {
        name: data.name,
        type: data.type,
        isPublic: data.isPublic,
        milestonesCount: data.defaultTimeline?.milestones?.length || 0,
      });
    }

    // Validate required fields
    if (
      !data.name ||
      !data.description ||
      !data.type ||
      !data.defaultTimeline
    ) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: name, description, type, and defaultTimeline are required",
        },
        { status: 400 }
      );
    }

    // Ensure milestones have proper structure
    const milestones = (data.defaultTimeline.milestones || []).map(
      (milestone: any, index: number) => ({
        title: milestone.title || `Milestone ${index + 1}`,
        description: milestone.description || "",
        daysFromStart: milestone.daysFromStart || (index + 1) * 7, // Default to weekly milestones
        dependencies: milestone.dependencies || [],
      })
    );

    const templateData = {
      name: data.name,
      description: data.description,
      type: data.type,
      defaultTimeline: {
        milestones: milestones,
        estimatedDuration: data.defaultTimeline.estimatedDuration || 30,
      },
      defaultBudget: data.defaultBudget
        ? {
            total: data.defaultBudget.total,
            currency: data.defaultBudget.currency || "USD",
            categories: data.defaultBudget.categories || [],
          }
        : undefined,
      requiredRoles: data.requiredRoles || ["owner"],
      defaultTasks: data.defaultTasks || [],
      isPublic: data.isPublic || false,
      createdBy: session.user.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db
      .collection("project_templates")
      .insertOne(templateData);
    const template = await db
      .collection("project_templates")
      .findOne({ _id: result.insertedId });

    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    console.error("Error creating project template:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to create project template", details: errorMessage },
      { status: 500 }
    );
  }
}
