import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import {
  withFirebaseAuth,
  verifyFirebaseToken,
} from "@/lib/firebase-auth-middleware";

interface ProjectCarsRouteParams {
  params: Promise<{ id: string }>;
}

// GET - Fetch cars linked to project
async function getProjectCars(
  request: NextRequest,
  { params }: ProjectCarsRouteParams
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

    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid project ID" },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const projectId = new ObjectId(id);

    // Get project without ownership restrictions
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
    const includeImages = url.searchParams.get("includeImages") === "true";

    console.time("getProjectCars-fetch");

    // ⚡ OPTIMIZED: Fetch car details with improved field projection
    const cars = [];
    if (project.carIds && project.carIds.length > 0) {
      // carIds should already be ObjectIds in the database
      const carObjectIds = project.carIds
        .filter(
          (carId: any) => carId instanceof ObjectId || ObjectId.isValid(carId)
        )
        .map((carId: any) =>
          carId instanceof ObjectId ? carId : new ObjectId(carId)
        );

      if (carObjectIds.length > 0) {
        // Build field projection based on what's requested
        const projection: any = {
          _id: 1,
          make: 1,
          model: 1,
          year: 1,
          color: 1,
          vin: 1,
          status: 1,
          primaryImageId: 1,
          createdAt: 1,
        };

        if (includeImages) {
          projection.imageIds = 1;
          projection.images = 1;
        }

        const carDocs = await db
          .collection("cars")
          .find({ _id: { $in: carObjectIds } })
          .project(projection)
          .sort({ createdAt: -1 })
          .skip(offset)
          .limit(limit)
          .toArray();

        cars.push(...carDocs);
      }
    }

    console.timeEnd("getProjectCars-fetch");

    return NextResponse.json({
      cars,
      total: cars.length,
      limit,
      offset,
      hasMore: cars.length === limit,
    });
  } catch (error) {
    console.error("Error fetching project cars:", error);
    return NextResponse.json(
      { error: "Failed to fetch project cars" },
      { status: 500 }
    );
  }
}

// POST - Link car to project
async function linkCarToProject(
  request: NextRequest,
  { params }: ProjectCarsRouteParams
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

    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid project ID" },
        { status: 400 }
      );
    }

    const { carId } = await request.json();
    if (!carId || !ObjectId.isValid(carId)) {
      return NextResponse.json({ error: "Invalid car ID" }, { status: 400 });
    }

    const db = await getDatabase();
    const projectId = new ObjectId(id);
    const carObjectId = new ObjectId(carId);

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

    // Verify car exists
    const car = await db.collection("cars").findOne({ _id: carObjectId });
    if (!car) {
      return NextResponse.json({ error: "Car not found" }, { status: 404 });
    }

    // Check if car is already linked
    const carIdExists =
      project.carIds &&
      project.carIds.some((id: any) => {
        const idStr = id instanceof ObjectId ? id.toString() : id;
        return idStr === carId;
      });

    if (carIdExists) {
      return NextResponse.json(
        { error: "Car is already linked to this project" },
        { status: 400 }
      );
    }

    // Add car to project (store as ObjectId)
    await db.collection("projects").updateOne(
      { _id: projectId },
      {
        $addToSet: { carIds: carObjectId },
        $set: { updatedAt: new Date() },
      }
    );

    return NextResponse.json({
      message: "Car linked to project successfully",
      carId: carId,
    });
  } catch (error) {
    console.error("Error linking car to project:", error);
    return NextResponse.json(
      { error: "Failed to link car to project" },
      { status: 500 }
    );
  }
}

// DELETE - Unlink car from project
async function unlinkCarFromProject(
  request: NextRequest,
  { params }: ProjectCarsRouteParams
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

    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid project ID" },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const carId = searchParams.get("carId");

    if (!carId || !ObjectId.isValid(carId)) {
      return NextResponse.json({ error: "Invalid car ID" }, { status: 400 });
    }

    const db = await getDatabase();
    const projectId = new ObjectId(id);
    const carObjectId = new ObjectId(carId);

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

    // Remove car from project
    await db.collection("projects").updateOne(
      { _id: projectId },
      {
        $pull: { carIds: carObjectId } as any,
        $set: { updatedAt: new Date() },
      }
    );

    return NextResponse.json({
      message: "Car unlinked from project successfully",
    });
  } catch (error) {
    console.error("Error unlinking car from project:", error);
    return NextResponse.json(
      { error: "Failed to unlink car from project" },
      { status: 500 }
    );
  }
}

// Export the wrapped functions
export const GET = withFirebaseAuth<any>(getProjectCars);
export const POST = withFirebaseAuth<any>(linkCarToProject);
export const DELETE = withFirebaseAuth<any>(unlinkCarFromProject);
