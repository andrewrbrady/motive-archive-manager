import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { db } = await connectToDatabase();

    // Add some debug logging
    console.log("Fetching cars for client ID:", params.id);

    const cars = await db
      .collection("cars")
      .aggregate([
        {
          $match: {
            $or: [
              { client: params.id }, // String format
              { client: new ObjectId(params.id) }, // ObjectId format
            ],
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
      ])
      .toArray();

    console.log("Found cars:", cars.length);

    // Format the response
    const formattedCars = cars.map((car) => ({
      ...car,
      _id: car._id.toString(),
      imageIds: car.imageIds?.map((id: ObjectId) => id.toString()),
      images: car.images?.map((image: any) => ({
        ...image,
        _id: image._id.toString(),
      })),
    }));

    console.log("Formatted cars:", formattedCars);

    return NextResponse.json(formattedCars);
  } catch (error) {
    console.error("Error fetching client's cars:", error);
    return NextResponse.json(
      { error: "Failed to fetch client's cars" },
      { status: 500 }
    );
  }
}
