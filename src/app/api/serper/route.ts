import { NextRequest, NextResponse } from "next/server";

interface SerperResult {
  title: string;
  snippet: string;
  link: string;
}

interface SerperResponse {
  organic: SerperResult[];
}

export async function POST(request: NextRequest) {
  try {
    const { make, model, year, color } = await request.json();

    if (!process.env.SERPER_API_KEY) {
      throw new Error("SERPER_API_KEY is not configured");
    }

    // Construct search query
    const query = `${year} ${make} ${model} official color ${color}`;

    const response = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: {
        "X-API-KEY": process.env.SERPER_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        q: query,
        num: 5,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to fetch from Serper API");
    }

    const data = (await response.json()) as SerperResponse;

    // Process results to find color matches
    const colorResults = data.organic
      .map((result: SerperResult) => {
        const title = result.title.toLowerCase();
        const snippet = result.snippet.toLowerCase();
        const colorPattern = new RegExp(`\\b${color.toLowerCase()}\\b`);

        if (colorPattern.test(title) || colorPattern.test(snippet)) {
          return {
            title: result.title,
            snippet: result.snippet,
            link: result.link,
          };
        }
        return null;
      })
      .filter(Boolean);

    return NextResponse.json({
      success: true,
      results: colorResults,
    });
  } catch (error) {
    console.error("Error in Serper API:", error);
    return NextResponse.json(
      { error: "Failed to search for color information" },
      { status: 500 }
    );
  }
}
