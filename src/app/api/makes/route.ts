import { NextResponse } from "next/server";
import { Collection, ObjectId } from "mongodb";
import { connectToDatabase } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

interface Make {
  _id: ObjectId;
  name: string;
  country_of_origin: string;
  founded: string;
  type: string;
  parent_company: string;
  created_at: string;
  updated_at: string;
  active: boolean;
}

export async function GET() {
  let dbConnection;
  try {
    // Get database connection from our connection pool
    dbConnection = await connectToDatabase();
    const db = dbConnection.db;

    // Get typed collection
    const makesCollection: Collection<Make> = db.collection("makes");

    console.log("Fetching makes from MongoDB...");
    const makes = await makesCollection
      .find({ active: true })
      .sort({ name: 1 })
      .toArray();

    console.log(`Successfully fetched ${makes.length} makes`);

    const formattedMakes = makes.map((make) => ({
      _id: make._id.toString(),
      name: make.name,
      country_of_origin: make.country_of_origin,
      founded: make.founded,
      type: make.type,
      parent_company: make.parent_company,
      created_at: make.created_at,
      updated_at: make.updated_at,
      active: make.active,
    }));

    return NextResponse.json(formattedMakes);
  } catch (error) {
    console.error("Error fetching makes:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch makes",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
