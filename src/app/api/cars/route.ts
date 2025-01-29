// app/api/cars/route.ts
import clientPromise from "@/lib/mongodb";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    interface QueryFilter {
      make?: { $regex: string; $options: string };
      year?: { $gte: string; $ne: string };
      // Add other filter types as needed
    }

    const query: QueryFilter = {};

    // Build query based on search parameters
    const make = searchParams.get("make");
    if (make) {
      query.make = {
        $regex: make,
        $options: "i",
      };
    }

    // Execute query and return results
    const client = await clientPromise;
    const db = client.db();
    const cars = await db.collection("cars").find(query).toArray();

    return new Response(JSON.stringify(cars), {
      headers: { "content-type": "application/json" },
    });
  } catch (error) {
    console.error("Error in GET /api/cars:", error);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
    });
  }
}
