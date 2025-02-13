import { NextResponse } from "next/server";
import { hybridSearch } from "@/lib/hybridSearch";
import { ModelType } from "@/components/ModelSelector";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");
    const model = (searchParams.get("model") as ModelType) || "gpt-4o-mini";
    const carId = params.id;

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

    console.log(`Processing search request for car ${carId}`);
    console.log(`Query: "${query}"`);
    console.log(`Using model: ${model}`);

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
      { error: "Failed to search research content" },
      { status: 500 }
    );
  }
}
