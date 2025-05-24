import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import fs from "fs";
import path from "path";
import { getBaseUrl } from "@/lib/oauth-utils";

export async function GET(req: NextRequest) {
  const baseUrl = getBaseUrl(req);

  try {
    const searchParams = req.nextUrl.searchParams;
    const code = searchParams.get("code");
    const error = searchParams.get("error");

    // Handle OAuth errors
    if (error) {
      console.error("OAuth authorization error:", error);
      const redirectUrl = new URL("/admin/youtube-auth", baseUrl);
      redirectUrl.searchParams.set("error", error);
      return NextResponse.redirect(redirectUrl);
    }

    if (!code) {
      console.error("No authorization code received");
      const redirectUrl = new URL("/admin/youtube-auth", baseUrl);
      redirectUrl.searchParams.set("error", "no_code");
      return NextResponse.redirect(redirectUrl);
    }

    // Set up OAuth client
    const oauth2Client = new google.auth.OAuth2(
      process.env.YOUTUBE_CLIENT_ID,
      process.env.YOUTUBE_CLIENT_SECRET,
      `${baseUrl}/api/youtube/callback`
    );

    try {
      // Exchange authorization code for tokens
      const { tokens } = await oauth2Client.getToken(code);

      console.log("YouTube OAuth tokens received:", {
        access_token: tokens.access_token ? "✅ Received" : "❌ Missing",
        refresh_token: tokens.refresh_token ? "✅ Received" : "❌ Missing",
        expires_in: tokens.expiry_date
          ? new Date(tokens.expiry_date).toISOString()
          : "No expiry",
      });

      // Verify the tokens work by testing channel access
      oauth2Client.setCredentials(tokens);
      const youtube = google.youtube({ version: "v3", auth: oauth2Client });

      try {
        const channelsResponse = await youtube.channels.list({
          part: ["snippet"],
          mine: true,
        });

        const channels = channelsResponse.data.items || [];
        console.log(
          `✅ Verified access to ${channels.length} YouTube channel(s)`
        );

        if (channels.length === 0) {
          console.warn("⚠️ No YouTube channels found for this account");
        } else {
          channels.forEach((channel, index) => {
            console.log(
              `   ${index + 1}. ${channel.snippet?.title} (${channel.id})`
            );
          });
        }
      } catch (verifyError) {
        console.error("❌ Failed to verify channel access:", verifyError);
      }

      // Update environment file with new refresh token
      if (tokens.refresh_token) {
        if (process.env.NODE_ENV === "development") {
          await updateEnvironmentToken(tokens.refresh_token);
          console.log("✅ Refresh token saved to .env.local");
        } else {
          console.log("🔑 PRODUCTION REFRESH TOKEN (copy to Vercel env vars):");
          console.log(`YOUTUBE_REFRESH_TOKEN="${tokens.refresh_token}"`);
          console.log("📝 Add this to your Vercel environment variables");
        }
      } else {
        console.warn(
          "⚠️ No refresh token received - may need to revoke and re-auth"
        );
      }

      // Set secure cookies with tokens for immediate use
      const referrer = req.headers.get("referer");
      let redirectUrl: URL;

      if (referrer && referrer.includes("/cars/")) {
        // If coming from a car page, redirect back there
        redirectUrl = new URL(referrer);
        redirectUrl.searchParams.set("youtube_auth_success", "true");
      } else {
        // Fallback to admin page
        redirectUrl = new URL("/admin/youtube-auth", baseUrl);
        redirectUrl.searchParams.set("youtube_auth_success", "true");
      }

      const response = NextResponse.redirect(redirectUrl);

      if (tokens.access_token) {
        response.cookies.set("youtube_access_token", tokens.access_token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 3600, // 1 hour
        });
      }

      if (tokens.refresh_token) {
        response.cookies.set("youtube_refresh_token", tokens.refresh_token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 60 * 60 * 24 * 30, // 30 days
        });
      }

      return response;
    } catch (tokenError) {
      console.error("Error exchanging code for tokens:", tokenError);
      const redirectUrl = new URL("/admin/youtube-auth", baseUrl);
      redirectUrl.searchParams.set("error", "token_exchange_failed");
      return NextResponse.redirect(redirectUrl);
    }
  } catch (error) {
    console.error("YouTube callback error:", error);
    const redirectUrl = new URL("/admin/youtube-auth", baseUrl);
    redirectUrl.searchParams.set("error", "callback_failed");
    return NextResponse.redirect(redirectUrl);
  }
}

async function updateEnvironmentToken(refreshToken: string) {
  try {
    const envPath = path.join(process.cwd(), ".env.local");
    let envContent = "";

    // Read existing .env.local file
    try {
      envContent = fs.readFileSync(envPath, "utf8");
    } catch (error) {
      console.log("Creating new .env.local file");
    }

    // Update or add YOUTUBE_REFRESH_TOKEN
    const lines = envContent.split("\n");
    let tokenUpdated = false;

    const updatedLines = lines.map((line) => {
      if (line.startsWith("YOUTUBE_REFRESH_TOKEN=")) {
        tokenUpdated = true;
        return `YOUTUBE_REFRESH_TOKEN="${refreshToken}"`;
      }
      return line;
    });

    // Add token if it wasn't found
    if (!tokenUpdated) {
      updatedLines.push(`YOUTUBE_REFRESH_TOKEN="${refreshToken}"`);
    }

    // Write back to file
    fs.writeFileSync(envPath, updatedLines.join("\n"));

    console.log("✅ Environment file updated with new refresh token");
  } catch (error) {
    console.error("❌ Failed to update environment file:", error);
    // Don't throw - this is not critical for the OAuth flow
  }
}

// Also handle POST requests in case they're sent
export async function POST(req: NextRequest) {
  return GET(req);
}
