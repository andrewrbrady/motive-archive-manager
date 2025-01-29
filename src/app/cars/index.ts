import { MongoClient } from "mongodb";
import { NextApiRequest, NextApiResponse } from "next";

const uri = "mongodb://localhost:27017";
const dbName = "motive_archive";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const client = new MongoClient(uri);
    await client.connect();

    const db = client.db(dbName);
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

    await client.close();

    res.status(200).json({
      cars,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (_error) {
    console.error("Failed to fetch cars");
    res.status(500).json({ error: "Failed to fetch cars" });
  }
}
