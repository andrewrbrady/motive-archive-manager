import { MongoClient } from "mongodb";
import { NextResponse } from "next/server";

// app/api/cars/route.ts
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const pipeline = [
    {
      $match: {
        $and: [
          // Handle empty/null/NaN values appropriately
          searchParams.get("brand")
            ? {
                brand: {
                  $regex: searchParams.get("brand"),
                  $options: "i",
                },
              }
            : {},
          searchParams.get("minYear")
            ? {
                year: {
                  $gte: searchParams.get("minYear"),
                  $ne: "",
                },
              }
            : {},
          // Add more filter conditions
        ],
      },
    },
    {
      // Join with clients collection
      $lookup: {
        from: "clients",
        localField: "client",
        foreignField: "_id",
        as: "dealerInfo",
      },
    },
    {
      $unwind: {
        path: "$dealerInfo",
        preserveNullAndEmptyArrays: true,
      },
    },
  ];

  // Execute pipeline and return results
}
