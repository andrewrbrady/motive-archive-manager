import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { Container, formatContainer } from "@/models/container";

// GET containers by location ID
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const client = await clientPromise;
    const db = client.db("motive_archive");

    // Find containers with matching locationId
    const containers = await db
      .collection("containers")
      .find({
        locationId: new ObjectId(params.id),
      })
      .toArray();

    // Map containers to ensure proper response format
    const mappedContainers = containers.map((container: any) =>
      formatContainer(container as Container)
    );

    return NextResponse.json(mappedContainers);
  } catch (error) {
    console.error("Error fetching containers by location:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
