import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";

export async function GET() {
  try {
    const db = await getDatabase();

    const cars = await db
      .collection("cars")
      .aggregate([
        { $match: {} },
        {
          $addFields: {
            imageIds: {
              $map: {
                input: "$imageIds",
                as: "id",
                in: { $toObjectId: "$$id" },
              },
            },
          },
        },
        {
          $lookup: {
            from: "images",
            localField: "imageIds",
            foreignField: "_id",
            as: "images",
          },
        },
        {
          $project: {
            _id: 1,
            make: 1,
            model: 1,
            year: 1,
            description: 1,
            status: 1,
            images: {
              $map: {
                input: "$images",
                as: "img",
                in: {
                  _id: { $toString: "$$img._id" },
                  url: "$$img.url",
                  filename: "$$img.filename",
                  metadata: "$$img.metadata",
                },
              },
            },
            imageIds: {
              $map: {
                input: "$imageIds",
                as: "id",
                in: { $toString: "$$id" },
              },
            },
          },
        },
        { $sort: { make: 1, model: 1, year: -1 } },
      ])
      .toArray();

    return NextResponse.json(cars);
  } catch (error) {
    console.error("Error fetching cars list:", error);
    return NextResponse.json(
      { error: "Failed to fetch cars list" },
      { status: 500 }
    );
  }
}
