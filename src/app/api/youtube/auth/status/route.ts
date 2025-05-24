import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { cookies } from "next/headers";

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();

    // Check for user's session-based tokens
    const accessToken = cookieStore.get("youtube_access_token")?.value;
    const refreshToken = cookieStore.get("youtube_refresh_token")?.value;

    if (!refreshToken && !accessToken) {
      return NextResponse.json({
        isAuthenticated: false,
        channels: [],
        error:
          "No authentication tokens found. Please authenticate with YouTube.",
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
      // Set credentials
      const credentials: any = {};
      if (accessToken) credentials.access_token = accessToken;
      if (refreshToken) credentials.refresh_token = refreshToken;

      oauth2Client.setCredentials(credentials);

      // If we only have a refresh token, get a new access token
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

      // Initialize APIs
      const youtube = google.youtube({ version: "v3", auth: oauth2Client });
      const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });

      // Get user info
      let userInfo = null;
      try {
        const userResponse = await oauth2.userinfo.get();
        userInfo = userResponse.data;
        console.log("🔍 User Info Retrieved:", {
          email: userInfo.email,
          name: userInfo.name,
          id: userInfo.id,
        });
      } catch (error) {
        console.warn("Could not get user info:", error);
      }

      // Debug current OAuth credentials
      const currentCreds = oauth2Client.credentials;
      console.log("🔑 Current OAuth Credentials State:", {
        has_access_token: !!currentCreds.access_token,
        has_refresh_token: !!currentCreds.refresh_token,
        expiry_date: currentCreds.expiry_date
          ? new Date(currentCreds.expiry_date).toISOString()
          : "None",
        scope: currentCreds.scope || "No scope info",
        token_type: currentCreds.token_type || "No token type",
      });

      // Get YouTube channels
      console.log("📡 Calling YouTube Channels API with mine=true...");
      const channelsResponse = await youtube.channels.list({
        part: ["snippet", "statistics", "status", "brandingSettings"],
        mine: true,
      });

      console.log("📡 YouTube API Response:", {
        status: channelsResponse.status,
        statusText: channelsResponse.statusText,
        data_items_length: channelsResponse.data.items?.length || 0,
        data_pageInfo: channelsResponse.data.pageInfo,
        data_kind: channelsResponse.data.kind,
      });

      const channels = channelsResponse.data.items || [];

      console.log(
        `📺 Found ${channels.length} YouTube channels for authenticated user:`
      );
      channels.forEach((channel, index) => {
        console.log(
          `   ${index + 1}. "${channel.snippet?.title}" (${channel.id})`
        );
        console.log(
          `       - Custom URL: ${channel.snippet?.customUrl || "None"}`
        );
        console.log(
          `       - Subscriber Count: ${channel.statistics?.subscriberCount || 0}`
        );
        console.log(
          `       - Video Count: ${channel.statistics?.videoCount || 0}`
        );
      });

      // Always check for MotiveArchiveMedia channel access in addition to personal channels
      try {
        console.log("📡 Checking for MotiveArchiveMedia channel access...");
        const motiveChannelResponse = await youtube.channels.list({
          part: ["snippet", "statistics", "status", "brandingSettings"],
          id: ["UCLG_UKlNif6A19Kaact2otA"], // MotiveArchiveMedia channel ID
        });

        const motiveChannels = motiveChannelResponse.data.items || [];
        console.log(
          "MotiveArchiveMedia channel access result:",
          motiveChannels.length,
          "channels"
        );

        if (motiveChannels.length > 0) {
          console.log("✅ Found MotiveArchiveMedia channel:");
          motiveChannels.forEach((channel, index) => {
            console.log(
              `   Brand Account: "${channel.snippet?.title}" (${channel.id})`
            );
            console.log(
              `       - Custom URL: ${channel.snippet?.customUrl || "None"}`
            );
            console.log(
              `       - Subscriber Count: ${channel.statistics?.subscriberCount || 0}`
            );
            console.log(
              `       - Video Count: ${channel.statistics?.videoCount || 0}`
            );
          });

          // Test if we can manage this channel
          try {
            const uploadsResponse = await youtube.search.list({
              part: ["snippet"],
              channelId: "UCLG_UKlNif6A19Kaact2otA",
              type: ["video"],
              maxResults: 1,
            });
            console.log(
              "✅ Can access MotiveArchiveMedia uploads - adding to available channels"
            );

            // Add MotiveArchiveMedia to the beginning of the array so it's the default choice
            channels.unshift(...motiveChannels);
          } catch (uploadErr) {
            console.log(
              "❌ Cannot access MotiveArchiveMedia uploads - may not have management access:",
              uploadErr
            );
          }
        } else {
          console.log("❌ MotiveArchiveMedia channel not accessible");
        }
      } catch (err) {
        console.log("MotiveArchiveMedia channel check failed:", err);
      }

      // If no channels found, try alternative methods
      if (channels.length === 0) {
        console.log(
          "🔍 No channels found with mine=true, trying alternative methods..."
        );

        try {
          // Method 1: Check specific MotiveArchiveMedia channel by ID
          console.log(
            "📡 Trying to access MotiveArchiveMedia channel directly..."
          );
          const motiveChannelResponse = await youtube.channels.list({
            part: ["snippet", "statistics", "status", "brandingSettings"],
            id: ["UCLG_UKlNif6A19Kaact2otA"], // MotiveArchiveMedia channel ID
          });

          const motiveChannels = motiveChannelResponse.data.items || [];
          console.log(
            "MotiveArchiveMedia channel access result:",
            motiveChannels.length,
            "channels"
          );

          if (motiveChannels.length > 0) {
            console.log("✅ Found MotiveArchiveMedia channel:");
            motiveChannels.forEach((channel, index) => {
              console.log(
                `   ${index + 1}. "${channel.snippet?.title}" (${channel.id})`
              );
              console.log(
                `       - Custom URL: ${channel.snippet?.customUrl || "None"}`
              );
              console.log(
                `       - Subscriber Count: ${channel.statistics?.subscriberCount || 0}`
              );
              console.log(
                `       - Video Count: ${channel.statistics?.videoCount || 0}`
              );
            });

            // Now check if we can actually manage this channel by trying to get its uploads
            try {
              const uploadsResponse = await youtube.search.list({
                part: ["snippet"],
                channelId: "UCLG_UKlNif6A19Kaact2otA",
                type: ["video"],
                maxResults: 1,
              });
              console.log(
                "✅ Can access channel uploads - management likely available"
              );

              // Add to channels array since we found it and can access it
              channels.push(...motiveChannels);
            } catch (uploadErr) {
              console.log(
                "❌ Cannot access channel uploads - may not have management access:",
                uploadErr
              );
            }
          } else {
            console.log(
              "❌ MotiveArchiveMedia channel not accessible or doesn't exist"
            );
          }
        } catch (err) {
          console.log(
            "Alternative method 1 (MotiveArchiveMedia direct) failed:",
            err
          );
        }
      }

      const formattedChannels = channels.map((channel) => ({
        id: channel.id!,
        title: channel.snippet?.title || "Untitled Channel",
        subscriberCount: channel.statistics?.subscriberCount,
        videoCount: channel.statistics?.videoCount,
        customUrl: channel.snippet?.customUrl,
        description: channel.snippet?.description?.substring(0, 200),
      }));

      return NextResponse.json({
        isAuthenticated: true,
        email: userInfo?.email,
        name: userInfo?.name,
        channels: formattedChannels,
      });
    } catch (authError: any) {
      console.error("Authentication error:", authError);

      if (authError.message?.includes("invalid_grant")) {
        return NextResponse.json({
          isAuthenticated: false,
          channels: [],
          error:
            "Authentication has expired. Please re-authenticate with YouTube.",
        });
      }

      return NextResponse.json({
        isAuthenticated: false,
        channels: [],
        error: `Authentication failed: ${authError.message}`,
      });
    }
  } catch (error) {
    console.error("Status check error:", error);
    return NextResponse.json(
      {
        isAuthenticated: false,
        channels: [],
        error: "Failed to check authentication status",
      },
      { status: 500 }
    );
  }
}
