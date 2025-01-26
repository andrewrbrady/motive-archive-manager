import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

// Force dynamic to prevent caching and disable authentication
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

export async function GET() {
  try {
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

    return NextResponse.json(formattedMakes);
  } catch (error) {
    console.error("Error fetching makes:", error);
    return NextResponse.json(
      { error: "Failed to fetch makes" },
      { status: 500 }
    );
  }
}
