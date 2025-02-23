import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function GET(request: Request) {
  try {
    const { db } = await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const sort = searchParams.get("sort");

    let sortOptions = {};
    if (sort) {
      const [field, direction] = sort.split("_");
      sortOptions = {
        [field === "shots" ? "shots.length" : field]:
          direction === "asc" ? 1 : -1,
      };
    } else {
      // Default sort by updatedAt desc
      sortOptions = { updatedAt: -1 };
    }

    const templates = await db
      .collection("shotTemplates")
      .find()
      .sort(sortOptions)
      .toArray();

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
      shots: data.shots || [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json({
      id: result.insertedId.toString(),
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  } catch (error) {
    console.error("Error creating shot template:", error);
    return NextResponse.json(
      { error: "Failed to create shot template" },
      { status: 500 }
    );
  }
}
