import { NextRequest, NextResponse } from "next/server";
import { getBaseUrl, getYouTubeCallbackUrl } from "@/lib/oauth-utils";

export async function GET(req: NextRequest) {
  try {
    const baseUrl = getBaseUrl(req);
    const callbackUrl = getYouTubeCallbackUrl(req);

    return NextResponse.json({
      environment: process.env.NODE_ENV,
      baseUrl,
      callbackUrl,
      nextAuthUrl: process.env.NEXTAUTH_URL,
      hostHeader: req.headers.get("host"),
      youtubeClientId: process.env.YOUTUBE_CLIENT_ID ? "✅ Set" : "❌ Missing",
      youtubeClientSecret: process.env.YOUTUBE_CLIENT_SECRET
        ? "✅ Set"
        : "❌ Missing",
      youtubeRefreshToken: process.env.YOUTUBE_REFRESH_TOKEN
        ? "✅ Set"
        : "❌ Missing",
      instructions: {
        googleConsoleRedirectUri: callbackUrl,
        vercelEnvVar: `NEXTAUTH_URL=${baseUrl}`,
        note: "Add the googleConsoleRedirectUri to your Google OAuth Console",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
