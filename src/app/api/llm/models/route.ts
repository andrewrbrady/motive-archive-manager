import { NextRequest, NextResponse } from "next/server";
import { getAllModels, llmProviders, ProviderId } from "@/lib/llmProviders";

// Add a simple check for API keys to determine which models are actually available
function checkProviderAvailability(providerId: ProviderId): boolean {
  switch (providerId) {
    case "anthropic":
      return !!process.env.ANTHROPIC_API_KEY;
    case "openai":
      return !!process.env.OPENAI_API_KEY;
    default:
      return false;
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const providerId = searchParams.get("provider") as ProviderId | null;
    const withAvailability = searchParams.get("availability") === "true";

    // If a specific provider is requested, return only those models
    if (providerId && llmProviders[providerId]) {
      // Check if provider is available
      const isAvailable = checkProviderAvailability(providerId);

      return NextResponse.json({
        provider: {
          ...llmProviders[providerId],
          isAvailable: withAvailability ? isAvailable : undefined,
        },
      });
    }

    // Otherwise return all models, optionally with availability info
    const availableProviders = Object.keys(llmProviders).reduce(
      (acc, key) => {
        const providerId = key as ProviderId;
        const provider = llmProviders[providerId];

        // Add availability info if requested
        if (withAvailability) {
          acc[providerId] = {
            ...provider,
            isAvailable: checkProviderAvailability(providerId),
          };
        } else {
          acc[providerId] = provider;
        }

        return acc;
      },
      {} as Record<string, any>
    );

    return NextResponse.json({ providers: availableProviders });
  } catch (error) {
    console.error("Error fetching LLM models:", error);
    return NextResponse.json(
      { error: "Failed to fetch LLM models" },
      { status: 500 }
    );
  }
}
