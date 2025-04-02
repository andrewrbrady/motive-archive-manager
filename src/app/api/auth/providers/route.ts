import { NextRequest, NextResponse } from "next/server";
import authConfig from "@/auth.config";

export const dynamic = "force-dynamic";

// Custom implementation of the providers endpoint
export async function GET(req: NextRequest) {
  try {
    console.log("Custom NextAuth providers handler called:", req.url);

    // Extract provider configurations from authConfig
    const providers = authConfig.providers || [];

    // Format providers in the expected format
    const providersObject = providers.reduce(
      (acc: Record<string, any>, provider: any) => {
        // The provider ID is usually available in the provider object
        const providerId = provider.id;
        if (providerId) {
          acc[providerId] = {
            id: providerId,
            name: provider.name,
            type: provider.type,
            signinUrl: `/api/auth/signin/${providerId}`,
            callbackUrl: `/api/auth/callback/${providerId}`,
          };
        }
        return acc;
      },
      {}
    );

    return NextResponse.json(providersObject);
  } catch (error: any) {
    console.error("Error in custom providers handler:", error);

    // Return a simplified response on error
    return NextResponse.json({
      google: {
        id: "google",
        name: "Google",
        type: "oauth",
        signinUrl: "/api/auth/signin/google",
        callbackUrl: "/api/auth/callback/google",
      },
      credentials: {
        id: "credentials",
        name: "Credentials",
        type: "credentials",
        signinUrl: "/api/auth/signin/credentials",
        callbackUrl: "/api/auth/callback/credentials",
      },
    });
  }
}
