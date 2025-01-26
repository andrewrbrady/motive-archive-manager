import { NextResponse } from "next/server";

// Use the new runtime export format
export const runtime = "edge";

export async function GET() {
  try {
    const response = await fetch(
      `${process.env.MONGODB_DATA_API_URL}/action/find`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Request-Headers": "*",
          "api-key": process.env.MONGODB_DATA_API_KEY || "",
        },
        body: JSON.stringify({
          dataSource: "Cluster0",
          database: "motive_archive",
          collection: "makes",
          filter: { active: true },
          sort: { name: 1 },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(
        `MongoDB Data API error: ${response.status} ${response.statusText}`
      );
    }

    const result = await response.json();
    const makes = result.documents;

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
