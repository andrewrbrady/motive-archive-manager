import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { getYouTubeCallbackUrl } from "@/lib/oauth-utils";

export async function GET(req: NextRequest) {
  try {
    const callbackUrl = getYouTubeCallbackUrl(req);

    // Set up OAuth client with dynamic callback URL
    const oauth2Client = new google.auth.OAuth2(
      process.env.YOUTUBE_CLIENT_ID,
      process.env.YOUTUBE_CLIENT_SECRET,
      callbackUrl
    );

    // Generate auth URL
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: [
        "https://www.googleapis.com/auth/youtube.upload",
        "https://www.googleapis.com/auth/youtube.readonly",
        "https://www.googleapis.com/auth/youtube", // Full YouTube access
        "https://www.googleapis.com/auth/youtube.force-ssl", // Secure access
        "https://www.googleapis.com/auth/youtubepartner", // Partner access (sometimes needed for brand accounts)
        "https://www.googleapis.com/auth/userinfo.email",
        "https://www.googleapis.com/auth/userinfo.profile",
      ],
      prompt: "select_account consent", // Force account selection and consent screen
      include_granted_scopes: true,
      // Add additional parameters to ensure fresh authentication
      state: `timestamp_${Date.now()}`,
    });

    return NextResponse.json({
      auth_url: authUrl,
    });
  } catch (error) {
    console.error("Error generating auth URL:", error);
    return NextResponse.json(
      {
        error: "Failed to generate authentication URL",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
