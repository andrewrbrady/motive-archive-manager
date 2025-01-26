import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

// Configure route segment config
export const config = {
  runtime: "edge", // Use edge runtime to bypass middleware
};

export async function GET() {
  let client;
  try {
    client = await clientPromise;
    const db = client.db("motive_archive");

    console.log("Fetching makes from MongoDB...");
    const makes = await db
      .collection("makes")
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

    // Set CORS headers
    return new NextResponse(JSON.stringify(formattedMakes), {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Error fetching makes:", error);
    return new NextResponse(
      JSON.stringify({
        error: "Failed to fetch makes",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json",
        },
      }
    );
  }
}
