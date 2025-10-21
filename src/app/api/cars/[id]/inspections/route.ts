import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { CreateInspectionRequest } from "@/types/inspection";

// GET /api/cars/[id]/inspections - Get all inspections for a car
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: carId } = await params;

    if (!ObjectId.isValid(carId)) {
      return NextResponse.json({ error: "Invalid car ID" }, { status: 400 });
    }

    // Check if car exists
    const db = await getDatabase();
    const car = await db
      .collection("cars")
      .findOne({ _id: new ObjectId(carId) });

    if (!car) {
      return NextResponse.json({ error: "Car not found" }, { status: 404 });
    }

    // Get all inspections for this car
    const inspections = await db
      .collection("inspections")
      .find({ carId: new ObjectId(carId) })
      .sort({ createdAt: -1 })
      .toArray();

    // Convert ObjectIds to strings
    const sanitizedInspections = inspections.map((inspection) => ({
      ...inspection,
      _id: inspection._id.toString(),
      carId: inspection.carId.toString(),
    }));

    return NextResponse.json({ inspections: sanitizedInspections });
  } catch (error) {
    console.error("Error fetching inspections:", error);
    return NextResponse.json(
      { error: "Failed to fetch inspections" },
      { status: 500 }
    );
  }
}

// POST /api/cars/[id]/inspections - Create a new inspection for a car
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: carId } = await params;

    if (!ObjectId.isValid(carId)) {
      return NextResponse.json({ error: "Invalid car ID" }, { status: 400 });
    }

    const body: CreateInspectionRequest = await request.json();

    // Validate required fields
    if (!body.title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    if (!body.status || !["pass", "needs_attention"].includes(body.status)) {
      return NextResponse.json(
        { error: "Valid status is required" },
        { status: 400 }
      );
    }

    // Check if car exists
    const db = await getDatabase();
    const car = await db
      .collection("cars")
      .findOne({ _id: new ObjectId(carId) });

    if (!car) {
      return NextResponse.json({ error: "Car not found" }, { status: 404 });
    }

    // Generate IDs for checklist items if they don't have them
    const checklistItems =
      body.checklistItems?.map((item) => ({
        ...item,
        id: item.id || new ObjectId().toString(),
        completed: item.completed || false,
      })) || [];

    // Create inspection document
    const inspectionData = {
      carId: new ObjectId(carId),
      title: body.title,
      description: body.description || "",
      status: body.status,
      inspectionImageIds: body.inspectionImageIds || [],
      dropboxVideoFolderUrl: body.dropboxVideoFolderUrl || "",
      dropboxImageFolderUrl: body.dropboxImageFolderUrl || "",
      checklistItems,
      inspectedBy: body.inspectedBy || "",
      inspectedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection("inspections").insertOne(inspectionData);

    // Fetch the created inspection
    const createdInspection = await db
      .collection("inspections")
      .findOne({ _id: result.insertedId });

    if (!createdInspection) {
      throw new Error("Failed to retrieve created inspection");
    }

    // Sanitize the response
    const sanitizedInspection = {
      ...createdInspection,
      _id: createdInspection._id.toString(),
      carId: createdInspection.carId.toString(),
    };

    return NextResponse.json(
      { inspection: sanitizedInspection },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating inspection:", error);
    return NextResponse.json(
      { error: "Failed to create inspection" },
      { status: 500 }
    );
  }
}
