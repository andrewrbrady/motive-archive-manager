import { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "@/lib/mongodb";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Get database connection from our connection pool
    const dbConnection = await connectToDatabase();
    const db = dbConnection.db;
    const carsCollection = db.collection("cars");

    const pageQuery = Array.isArray(req.query.page)
      ? req.query.page[0]
      : req.query.page;
    const limitQuery = Array.isArray(req.query.limit)
      ? req.query.limit[0]
      : req.query.limit;

    const page = parseInt(pageQuery || "1");
    const limit = parseInt(limitQuery || "10");
    const skip = (page - 1) * limit;

    const cars = await carsCollection
      .find({})
      .skip(skip)
      .limit(limit)
      .toArray();

    const total = await carsCollection.countDocuments();

    res.status(200).json({
      cars,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Failed to fetch cars:", error);
    res.status(500).json({ error: "Failed to fetch cars" });
  }
}
