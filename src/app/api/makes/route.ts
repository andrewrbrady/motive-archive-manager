import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    // Get request headers
    const headersList = headers();
    const host = headersList.get("host") || "";
    const referer = headersList.get("referer") || "";

    // Allow requests from Vercel deployment URLs and localhost
    const isVercelDeployment = host.endsWith(".vercel.app");
    const isLocalhost = host.includes("localhost");
    const isAllowedReferer = referer.includes(host) || referer === "";

    if (!isVercelDeployment && !isLocalhost && !isAllowedReferer) {
      console.error("Unauthorized request:", { host, referer });
      return NextResponse.json(
        { error: "Unauthorized" },
        {
          status: 401,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
          },
        }
      );
    }

    const client = await clientPromise;
    const db = client.db("motive_archive");

    const makes = await db
      .collection("makes")
      .find({ active: true })
      .sort({ name: 1 })
      .toArray();

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

    return NextResponse.json(formattedMakes, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  } catch (error) {
    console.error("Error fetching makes:", error);
    return NextResponse.json(
      { error: "Failed to fetch makes" },
      {
        status: 500,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      }
    );
  }
}

export async function OPTIONS() {
  return NextResponse.json(
    {},
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    }
  );
}
