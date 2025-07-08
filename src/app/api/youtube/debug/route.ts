import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { cookies } from "next/headers";

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get("youtube_access_token")?.value;
    const refreshToken = cookieStore.get("youtube_refresh_token")?.value;

    if (!refreshToken && !accessToken) {
      return NextResponse.json({ error: "No tokens found" }, { status: 401 });
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.YOUTUBE_CLIENT_ID,
      process.env.YOUTUBE_CLIENT_SECRET,
      process.env.NEXTAUTH_URL
        ? `${process.env.NEXTAUTH_URL}/api/youtube/callback`
        : "http://localhost:3000/api/youtube/callback"
    );

    // Set credentials
    const credentials: any = {};
    if (accessToken) credentials.access_token = accessToken;
    if (refreshToken) credentials.refresh_token = refreshToken;
    oauth2Client.setCredentials(credentials);

    // Refresh if needed
    if (refreshToken && !accessToken) {
      const { credentials: newCredentials } =
        await oauth2Client.refreshAccessToken();
      oauth2Client.setCredentials({
        access_token: newCredentials.access_token,
        refresh_token: refreshToken,
        expiry_date: newCredentials.expiry_date,
        token_type: newCredentials.token_type,
        scope: newCredentials.scope,
      });
    }

    const youtube = google.youtube({ version: "v3", auth: oauth2Client });
    const oauth2Api = google.oauth2({ version: "v2", auth: oauth2Client });

    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("\n=== YOUTUBE DEBUG SESSION ===");

    // 1. Check user info
    let userInfo = null;
    try {
      const userResponse = await oauth2Api.userinfo.get();
      userInfo = userResponse.data;
      console.log("✅ User Info:", {
        email: userInfo.email,
        name: userInfo.name,
        id: userInfo.id,
        verified_email: userInfo.verified_email,
      });
    } catch (error) {
      // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("❌ User Info failed:", error);
    }

    // 2. Check OAuth token info
    try {
      const tokenInfo = await oauth2Api.tokeninfo();
      console.log("✅ Token Info:", {
        scope: tokenInfo.data.scope,
        audience: tokenInfo.data.audience,
        expires_in: tokenInfo.data.expires_in,
      });
    } catch (error) {
      // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("❌ Token Info failed:", error);
    }

    // 3. Try various channel API calls
    const tests = [];

    // Test 1: Basic channels.list with mine=true
    try {
      const response = await youtube.channels.list({
        part: ["snippet", "statistics", "status"],
        mine: true,
      });
      tests.push({
        test: "channels.list mine=true",
        success: true,
        count: response.data.items?.length || 0,
        details: response.data.items?.map((c) => ({
          id: c.id,
          title: c.snippet?.title,
          customUrl: c.snippet?.customUrl,
        })),
      });
    } catch (error: any) {
      tests.push({
        test: "channels.list mine=true",
        success: false,
        error: error.message,
      });
    }

    // Test 2: Try with managedByMe=true
    try {
      const response = await youtube.channels.list({
        part: ["snippet"],
        managedByMe: true,
      });
      tests.push({
        test: "channels.list managedByMe=true",
        success: true,
        count: response.data.items?.length || 0,
        details: response.data.items?.map((c) => ({
          id: c.id,
          title: c.snippet?.title,
        })),
      });
    } catch (error: any) {
      tests.push({
        test: "channels.list managedByMe=true",
        success: false,
        error: error.message,
      });
    }

    // Test 3: Try to get channel by username
    if (userInfo?.email) {
      try {
        const username = userInfo.email.split("@")[0];
        const response = await youtube.channels.list({
          part: ["snippet"],
          forUsername: username,
        });
        tests.push({
          test: `channels.list forUsername=${username}`,
          success: true,
          count: response.data.items?.length || 0,
          details: response.data.items?.map((c) => ({
            id: c.id,
            title: c.snippet?.title,
          })),
        });
      } catch (error: any) {
        tests.push({
          test: "channels.list forUsername",
          success: false,
          error: error.message,
        });
      }
    }

    // Test 4: Try search API
    try {
      const response = await youtube.search.list({
        part: ["snippet"],
        type: ["channel"],
        forMine: true,
        maxResults: 50,
      });
      tests.push({
        test: "search.list forMine=true",
        success: true,
        count: response.data.items?.length || 0,
        details: response.data.items?.map((c) => ({
          id: c.id?.channelId,
          title: c.snippet?.title,
        })),
      });
    } catch (error: any) {
      tests.push({
        test: "search.list forMine=true",
        success: false,
        error: error.message,
      });
    }

    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("📊 Test Results:", tests);
    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("=== END DEBUG SESSION ===\n");

    return NextResponse.json({
      userInfo,
      tests,
      credentials: {
        has_access_token: !!oauth2Client.credentials.access_token,
        has_refresh_token: !!oauth2Client.credentials.refresh_token,
        scope: oauth2Client.credentials.scope,
      },
    });
  } catch (error) {
    console.error("Debug error:", error);
    return NextResponse.json(
      {
        error: "Debug failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
