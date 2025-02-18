import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { ObjectId, UpdateFilter } from "mongodb";

interface Car {
  _id: ObjectId;
  researchFiles: ObjectId[];
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const carId = formData.get("carId");
    const content = formData.get("content");
    const filename = formData.get("filename");
    const fileType = formData.get("fileType");

    if (!carId || !content || !filename) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const db = await getDatabase();

    // Create research file document
    const result = await db.collection("research_files").insertOne({
      carId: new ObjectId(carId.toString()),
      content,
      filename,
      fileType,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Update car document with proper typing
    const updateFilter: UpdateFilter<Car> = {
      $push: { researchFiles: result.insertedId },
    };

    await db
      .collection<Car>("cars")
      .updateOne({ _id: new ObjectId(carId.toString()) }, updateFilter);

    return NextResponse.json({
      success: true,
      fileId: result.insertedId,
    });
  } catch (error) {
    console.error("Error uploading research file:", error);
    return NextResponse.json(
      { error: "Failed to upload research file" },
      { status: 500 }
    );
  }
}
