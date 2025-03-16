import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { Container, formatContainer } from "@/models/container";

// GET all containers
export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("motive_archive");

    // Fetch all containers from the database
    const containers = await db.collection("containers").find({}).toArray();

    // Map containers to ensure proper response format
    const mappedContainers = containers.map((container: any) =>
      formatContainer(container as Container)
    );

    return NextResponse.json(mappedContainers);
  } catch (error) {
    console.error("Error fetching containers:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Create a new container
export async function POST(request: Request) {
  try {
    const data = await request.json();

    // Validate required fields
    if (!data.name || !data.type) {
      return NextResponse.json(
        { error: "Name and type are required fields" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db("motive_archive");

    // Get the next container number by finding the max containerNumber and adding 1
    const maxContainer = await db
      .collection("containers")
      .find({})
      .sort({ containerNumber: -1 })
      .limit(1)
      .toArray();

    const nextContainerNumber =
      maxContainer.length > 0 ? maxContainer[0].containerNumber + 1 : 1;

    // Prepare container data
    const now = new Date();
    const containerData = {
      name: data.name,
      type: data.type,
      containerNumber: nextContainerNumber,
      locationId: data.locationId ? new ObjectId(data.locationId) : undefined,
      description: data.description,
      isActive: data.isActive !== undefined ? data.isActive : true,
      createdAt: now,
      updatedAt: now,
    };

    // Insert the new container
    const result = await db.collection("containers").insertOne(containerData);

    // Return the formatted container with its new ID
    return NextResponse.json({
      ...formatContainer({
        ...containerData,
        _id: result.insertedId,
      } as Container),
    });
  } catch (error) {
    console.error("Error creating container:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
