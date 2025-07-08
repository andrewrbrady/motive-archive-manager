import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import fs from "fs";
import path from "path";

export async function POST(req: NextRequest) {
  try {
    const refreshToken = process.env.YOUTUBE_REFRESH_TOKEN;

    if (!refreshToken) {
      return NextResponse.json({
        success: true,
        message: "No authentication to revoke",
      });
    }

    // Set up OAuth client
    const oauth2Client = new google.auth.OAuth2(
      process.env.YOUTUBE_CLIENT_ID,
      process.env.YOUTUBE_CLIENT_SECRET,
      process.env.NEXTAUTH_URL
        ? `${process.env.NEXTAUTH_URL}/api/youtube/callback`
        : "http://localhost:3000/api/youtube/callback"
    );

    try {
      // Revoke the refresh token
      await oauth2Client.revokeToken(refreshToken);
      // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("✅ YouTube refresh token revoked successfully");
    } catch (revokeError) {
      console.warn(
        "⚠️ Failed to revoke token (may already be invalid):",
        revokeError
      );
      // Continue anyway to clean up local storage
    }

    // Remove token from environment file
    await removeEnvironmentToken();

    // Clear cookies
    const response = NextResponse.json({
      success: true,
      message: "YouTube authentication revoked successfully",
    });

    response.cookies.delete("youtube_access_token");
    response.cookies.delete("youtube_refresh_token");

    return response;
  } catch (error) {
    console.error("Error revoking YouTube authentication:", error);
    return NextResponse.json(
      {
        error: "Failed to revoke authentication",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

async function removeEnvironmentToken() {
  try {
    const envPath = path.join(process.cwd(), ".env.local");

    // Read existing .env.local file
    let envContent = "";
    try {
      envContent = fs.readFileSync(envPath, "utf8");
    } catch (error) {
      // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("No .env.local file found - nothing to remove");
      return;
    }

    // Remove YOUTUBE_REFRESH_TOKEN line
    const lines = envContent.split("\n");
    const filteredLines = lines.filter(
      (line) => !line.startsWith("YOUTUBE_REFRESH_TOKEN=")
    );

    // Write back to file
    fs.writeFileSync(envPath, filteredLines.join("\n"));

    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("✅ Refresh token removed from environment file");
  } catch (error) {
    console.error("❌ Failed to update environment file:", error);
    // Don't throw - this is not critical
  }
}
