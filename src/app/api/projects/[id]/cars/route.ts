import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { auth } from "@/auth";

interface ProjectCarsRouteParams {
  params: Promise<{ id: string }>;
}

// GET - Fetch cars linked to project
export async function GET(
  request: NextRequest,
  { params }: ProjectCarsRouteParams
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

    // Get project and verify user has access
    const project = await db.collection("projects").findOne({
      _id: projectId,
      $or: [
        { ownerId: session.user.id },
        { "members.userId": session.user.id },
      ],
    });

    if (!project) {
      return NextResponse.json(
        { error: "Project not found or access denied" },
        { status: 404 }
      );
    }

    // Fetch car details for linked cars
    const cars = [];
    if (project.carIds && project.carIds.length > 0) {
      const carObjectIds = project.carIds
        .filter((carId: string) => ObjectId.isValid(carId))
        .map((carId: string) => new ObjectId(carId));

      if (carObjectIds.length > 0) {
        const carDocs = await db
          .collection("cars")
          .find({ _id: { $in: carObjectIds } })
          .project({
            _id: 1,
            make: 1,
            model: 1,
            year: 1,
            color: 1,
            vin: 1,
            status: 1,
            primaryImageId: 1,
            imageIds: 1,
            createdAt: 1,
          })
          .toArray();

        cars.push(...carDocs);
      }
    }

    return NextResponse.json({ cars });
  } catch (error) {
    console.error("Error fetching project cars:", error);
    return NextResponse.json(
      { error: "Failed to fetch project cars" },
      { status: 500 }
    );
  }
}

// POST - Link car to project
export async function POST(
  request: NextRequest,
  { params }: ProjectCarsRouteParams
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
      $or: [
        { ownerId: session.user.id },
        {
          "members.userId": session.user.id,
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

    // Verify car exists
    const car = await db.collection("cars").findOne({ _id: carObjectId });
    if (!car) {
      return NextResponse.json({ error: "Car not found" }, { status: 404 });
    }

    // Check if car is already linked
    if (project.carIds && project.carIds.includes(carId)) {
      return NextResponse.json(
        { error: "Car is already linked to this project" },
        { status: 400 }
      );
    }

    // Add car to project
    await db.collection("projects").updateOne(
      { _id: projectId },
      {
        $addToSet: { carIds: carId },
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
export async function DELETE(
  request: NextRequest,
  { params }: ProjectCarsRouteParams
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

    // Verify project exists and user has access
    const project = await db.collection("projects").findOne({
      _id: projectId,
      $or: [
        { ownerId: session.user.id },
        {
          "members.userId": session.user.id,
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

    // Remove car from project
    await db.collection("projects").updateOne(
      { _id: projectId },
      {
        $pull: { carIds: carId } as any,
        $set: { updatedAt: new Date() },
      }
    );

    return NextResponse.json({
      message: "Car unlinked from project successfully",
      carId: carId,
    });
  } catch (error) {
    console.error("Error unlinking car from project:", error);
    return NextResponse.json(
      { error: "Failed to unlink car from project" },
      { status: 500 }
    );
  }
}
