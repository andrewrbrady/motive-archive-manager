import { NextResponse } from "next/server";
import { hybridSearch } from "@/lib/hybridSearch";
import { ModelType } from "@/components/ModelSelector";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const segments = url.pathname.split("/");
    const carId = segments[segments.length - 3]; // -3 because URL is /cars/[id]/research/search

    const { searchParams } = url;
    const query = searchParams.get("q");
    const model = (searchParams.get("model") as ModelType) || "gpt-4o-mini";

    if (!query) {
      return NextResponse.json(
        { error: "Search query is required" },
        { status: 400 }
      );
    }

    if (!carId) {
      return NextResponse.json(
        { error: "Car ID is required" },
        { status: 400 }
      );
    }

    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log(`Processing search request for car ${carId}`);
    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log(`Query: "${query}"`);
    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log(`Using model: ${model}`);

    const { results, answer } = await hybridSearch(query, carId, model);

    return NextResponse.json({
      results,
      answer,
      total: results.length,
      query,
      model,
    });
  } catch (error) {
    console.error("Error in research search:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to search research content",
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
