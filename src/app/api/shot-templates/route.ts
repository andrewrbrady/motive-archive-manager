import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function GET() {
  try {
    const { db } = await connectToDatabase();
    const templates = await db.collection("shotTemplates").find({}).toArray();

    return NextResponse.json(
      templates.map((template) => ({
        ...template,
        id: template._id.toString(),
      }))
    );
  } catch (error) {
    console.error("Error fetching shot templates:", error);
    return NextResponse.json(
      { error: "Failed to fetch shot templates" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { db } = await connectToDatabase();
    const data = await request.json();

    const result = await db.collection("shotTemplates").insertOne({
      name: data.name,
      description: data.description,
      shots: data.shots,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json({
      id: result.insertedId.toString(),
      ...data,
    });
  } catch (error) {
    console.error("Error creating shot template:", error);
    return NextResponse.json(
      { error: "Failed to create shot template" },
      { status: 500 }
    );
  }
}
