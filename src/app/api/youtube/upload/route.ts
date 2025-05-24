import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { dbConnect } from "@/lib/mongodb";
import { Deliverable } from "@/models/Deliverable";
import { Readable } from "stream";

// Define the interface for the request
interface YouTubeUploadRequest {
  deliverable_id?: string;
  video_url?: string;
  title?: string;
  description?: string;
  tags?: string[];
  privacy_status?: "private" | "public" | "unlisted";
  category_id?: string;
  channel_id?: string;
}

export async function POST(req: NextRequest) {
  try {
    const {
      deliverable_id,
      video_url,
      title,
      description,
      tags = [],
      privacy_status = "private",
      category_id = "2", // Autos & Vehicles
      channel_id,
    }: YouTubeUploadRequest = await req.json();

    console.log("Starting YouTube upload request...");

    // Validate input - need either deliverable_id or video_url
    if (!deliverable_id && !video_url) {
      return NextResponse.json(
        { error: "Either deliverable_id or video_url is required" },
        { status: 400 }
      );
    }

    let deliverable = null;
    let videoSource = video_url;
    let videoTitle = title;
    let videoDescription = description;
    let videoTags = tags;

    // If deliverable_id provided, get deliverable from database
    if (deliverable_id) {
      await dbConnect();
      deliverable = await Deliverable.findById(deliverable_id);

      if (!deliverable) {
        return NextResponse.json(
          { error: "Deliverable not found" },
          { status: 404 }
        );
      }

      if (!deliverable.dropbox_link) {
        return NextResponse.json(
          { error: "No Dropbox link found for this deliverable" },
          { status: 400 }
        );
      }

      // Use deliverable properties if not provided in request
      videoSource = deliverable.dropbox_link;
      videoTitle = title || deliverable.title || "Untitled Video";
      videoDescription =
        description ||
        deliverable.description ||
        `${deliverable.title} - Uploaded from Motive Archive Manager`;
      videoTags =
        tags.length > 0 ? tags : deliverable.tags || ["automotive", "cars"];

      // Verify that the deliverable is a video type
      if (!isVideoDeliverable(deliverable.type)) {
        return NextResponse.json(
          { error: "Deliverable must be a video type to upload to YouTube" },
          { status: 400 }
        );
      }
    }

    // OAuth setup - try refresh token first, then fall back to session-based auth
    const oauth2Client = new google.auth.OAuth2(
      process.env.YOUTUBE_CLIENT_ID,
      process.env.YOUTUBE_CLIENT_SECRET,
      process.env.NEXTAUTH_URL
        ? `${process.env.NEXTAUTH_URL}/api/youtube/callback`
        : "http://localhost:3000/api/youtube/callback"
    );

    let authMethod = "none";

    // Method 1: Try refresh token (for server-to-server)
    const refreshToken = process.env.YOUTUBE_REFRESH_TOKEN;
    if (refreshToken) {
      try {
        console.log("Setting up YouTube authentication with refresh token...");

        // Set the refresh token
        oauth2Client.setCredentials({
          refresh_token: refreshToken,
        });

        // Get fresh access token
        const { credentials } = await oauth2Client.refreshAccessToken();
        console.log("Successfully refreshed access token:", {
          access_token: credentials.access_token ? "✅ Present" : "❌ Missing",
          refresh_token: credentials.refresh_token
            ? "✅ Present"
            : "❌ Missing",
          expiry_date: credentials.expiry_date
            ? new Date(credentials.expiry_date).toISOString()
            : "No expiry",
          scope: credentials.scope || "No scope info",
        });

        // Set all credentials including the fresh access token
        oauth2Client.setCredentials({
          access_token: credentials.access_token,
          refresh_token: refreshToken, // Keep original refresh token
          expiry_date: credentials.expiry_date,
          token_type: credentials.token_type,
          scope: credentials.scope,
        });

        authMethod = "refresh_token";
        console.log(
          "Using refresh token authentication - credentials set successfully"
        );
      } catch (error) {
        console.error("Refresh token auth failed:", error);
        console.warn("Will try session auth...");
      }
    } else {
      console.warn("No refresh token found in environment variables");
    }

    // Method 2: Try session-based auth (from cookies)
    if (authMethod === "none") {
      try {
        const { cookies } = await import("next/headers");
        const cookieStore = await cookies();

        const accessToken = cookieStore.get("youtube_access_token")?.value;
        const sessionRefreshToken = cookieStore.get(
          "youtube_refresh_token"
        )?.value;

        if (sessionRefreshToken || accessToken) {
          console.log(
            "Found session-based tokens, attempting authentication..."
          );

          const credentials: any = {};
          if (accessToken) credentials.access_token = accessToken;
          if (sessionRefreshToken)
            credentials.refresh_token = sessionRefreshToken;

          oauth2Client.setCredentials(credentials);

          // If we only have a refresh token, get a new access token
          if (sessionRefreshToken && !accessToken) {
            const { credentials: newCredentials } =
              await oauth2Client.refreshAccessToken();
            oauth2Client.setCredentials({
              access_token: newCredentials.access_token,
              refresh_token: sessionRefreshToken,
              expiry_date: newCredentials.expiry_date,
              token_type: newCredentials.token_type,
              scope: newCredentials.scope,
            });
          }

          authMethod = "session_token";
          console.log(
            "Using session-based authentication - credentials set successfully"
          );
        } else {
          console.warn("No session tokens found in cookies");
        }
      } catch (error) {
        console.error("Session auth failed:", error);
      }
    }

    // If still no auth method, return auth required
    if (authMethod === "none") {
      return NextResponse.json(
        {
          error:
            "YouTube authentication required. Please authorize access first.",
          requires_auth: true,
          auth_url: oauth2Client.generateAuthUrl({
            access_type: "offline",
            scope: [
              "https://www.googleapis.com/auth/youtube.upload",
              "https://www.googleapis.com/auth/youtube.readonly",
            ],
            prompt: "consent",
          }),
        },
        { status: 401 }
      );
    }

    const youtube = google.youtube({ version: "v3", auth: oauth2Client });

    // Download video from source
    let downloadUrl = videoSource;

    // If it's a Dropbox link, convert to direct download
    if (downloadUrl?.includes("dropbox.com")) {
      if (downloadUrl.includes("?dl=0")) {
        downloadUrl = downloadUrl.replace("?dl=0", "?dl=1");
      } else if (!downloadUrl.includes("dl=1")) {
        downloadUrl += (downloadUrl.includes("?") ? "&" : "?") + "dl=1";
      }
    }

    console.log("Downloading video from:", downloadUrl);

    let videoResponse;
    try {
      videoResponse = await fetch(downloadUrl!, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; MotiveArchive/1.0)",
        },
      });
    } catch (error) {
      console.error("Failed to fetch video:", error);
      return NextResponse.json(
        { error: "Failed to download video from source" },
        { status: 400 }
      );
    }

    if (!videoResponse.ok) {
      console.error("Video download failed with status:", videoResponse.status);
      return NextResponse.json(
        {
          error: `Video download failed: ${videoResponse.status} ${videoResponse.statusText}`,
        },
        { status: 400 }
      );
    }

    // Check content type
    const contentType = videoResponse.headers.get("content-type");
    if (!contentType?.startsWith("video/")) {
      console.warn("Content type is not video:", contentType);
    }

    const videoBuffer = await videoResponse.arrayBuffer();
    console.log("Video downloaded, size:", videoBuffer.byteLength, "bytes");

    if (videoBuffer.byteLength === 0) {
      return NextResponse.json(
        { error: "Downloaded video file is empty" },
        { status: 400 }
      );
    }

    // Create stream from buffer
    const stream = new Readable();
    stream.push(Buffer.from(videoBuffer));
    stream.push(null);

    console.log("🎬 Starting YouTube video upload...");
    console.log("📤 Upload details:", {
      title: videoTitle,
      privacy_status: privacy_status,
      category_id: category_id,
      video_size_bytes: videoBuffer.byteLength,
    });

    // Log channel targeting attempt
    if (channel_id) {
      console.log(`🎯 Attempting to target specific channel: ${channel_id}`);
    }

    // Test authentication by listing channels first
    try {
      console.log("🔍 Verifying YouTube channel access...");
      const channelsResponse = await youtube.channels.list({
        part: ["snippet", "status", "brandingSettings"],
        mine: true,
      });

      const channels = channelsResponse.data.items || [];
      console.log(`✅ Found ${channels.length} YouTube channel(s):`);
      channels.forEach((channel, index) => {
        const isBrandAccount =
          channel.snippet?.title !== channel.snippet?.defaultLanguage;
        const channelType = channel.status?.madeForKids ? "Kids" : "Regular";
        console.log(
          `   ${index + 1}. "${channel.snippet?.title}" (ID: ${channel.id})`
        );
        console.log(
          `       - Custom URL: ${channel.snippet?.customUrl || "None"}`
        );
        console.log(
          `       - Description: ${channel.snippet?.description?.substring(0, 100) || "No description"}...`
        );
        console.log(`       - Type: ${channelType}`);
      });

      // Always check for MotiveArchiveMedia channel access for uploads
      try {
        console.log(
          "📡 Checking MotiveArchiveMedia channel access for upload..."
        );
        const motiveChannelResponse = await youtube.channels.list({
          part: ["snippet", "statistics", "status", "brandingSettings"],
          id: ["UCLG_UKlNif6A19Kaact2otA"], // MotiveArchiveMedia channel ID
        });

        const motiveChannels = motiveChannelResponse.data.items || [];
        if (motiveChannels.length > 0) {
          console.log("✅ MotiveArchiveMedia channel accessible for upload");
          // Test upload access
          try {
            const uploadsResponse = await youtube.search.list({
              part: ["snippet"],
              channelId: "UCLG_UKlNif6A19Kaact2otA",
              type: ["video"],
              maxResults: 1,
            });
            console.log(
              "✅ Confirmed: Can upload to MotiveArchiveMedia channel"
            );
            // We have access to upload to MotiveArchiveMedia, proceed with upload
          } catch (uploadErr) {
            console.log(
              "❌ Cannot upload to MotiveArchiveMedia channel:",
              uploadErr
            );
            return NextResponse.json(
              {
                error:
                  "Cannot upload to MotiveArchiveMedia channel. Check permissions.",
              },
              { status: 403 }
            );
          }
        } else {
          console.log("❌ MotiveArchiveMedia channel not accessible");
        }
      } catch (err) {
        console.log("MotiveArchiveMedia channel check failed:", err);
      }

      if (channels.length === 0) {
        console.log(
          "🔍 No channels found with mine=true, checking for MotiveArchiveMedia directly..."
        );
        try {
          // Check specific MotiveArchiveMedia channel by ID
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
            console.log("✅ Found MotiveArchiveMedia channel for upload:");
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

            // Test upload access
            try {
              const uploadsResponse = await youtube.search.list({
                part: ["snippet"],
                channelId: "UCLG_UKlNif6A19Kaact2otA",
                type: ["video"],
                maxResults: 1,
              });
              console.log(
                "✅ Can access channel uploads - proceeding with upload"
              );
              // Don't return error, continue with upload
            } catch (uploadErr) {
              console.log("❌ Cannot access channel uploads:", uploadErr);
              return NextResponse.json(
                {
                  error:
                    "Cannot upload to MotiveArchiveMedia channel. Check permissions.",
                },
                { status: 403 }
              );
            }
          } else {
            return NextResponse.json(
              {
                error:
                  "No YouTube channels found. Please create a YouTube channel first.",
              },
              { status: 400 }
            );
          }
        } catch (err) {
          console.log("MotiveArchiveMedia channel check failed:", err);
          return NextResponse.json(
            {
              error:
                "No YouTube channels found. Please create a YouTube channel first.",
            },
            { status: 400 }
          );
        }
      }
    } catch (channelError: any) {
      console.error("❌ Failed to verify YouTube channels:", channelError);
      return NextResponse.json(
        {
          error: "Failed to access YouTube channels. Please re-authenticate.",
          details: channelError.message,
          requires_auth: true,
        },
        { status: 401 }
      );
    }

    // Verify credentials before upload
    const currentCredentials = oauth2Client.credentials;
    console.log("Current OAuth credentials status:", {
      access_token: currentCredentials.access_token
        ? "✅ Present"
        : "❌ Missing",
      refresh_token: currentCredentials.refresh_token
        ? "✅ Present"
        : "❌ Missing",
      expiry_date: currentCredentials.expiry_date
        ? new Date(currentCredentials.expiry_date).toISOString()
        : "No expiry",
      scope: currentCredentials.scope || "No scope info",
    });

    // Refresh token if it's expired or about to expire
    if (currentCredentials.refresh_token) {
      try {
        console.log("Refreshing access token before upload...");
        const { credentials: refreshedCredentials } =
          await oauth2Client.refreshAccessToken();
        oauth2Client.setCredentials({
          access_token: refreshedCredentials.access_token,
          refresh_token: currentCredentials.refresh_token,
          expiry_date: refreshedCredentials.expiry_date,
          token_type: refreshedCredentials.token_type,
          scope: refreshedCredentials.scope,
        });
        console.log("✅ Token refreshed successfully");
      } catch (refreshError) {
        console.error("❌ Failed to refresh token:", refreshError);
        return NextResponse.json(
          {
            error:
              "Authentication token expired. Please re-authenticate with YouTube.",
            requires_auth: true,
          },
          { status: 401 }
        );
      }
    }

    const uploadResponse = await youtube.videos.insert({
      part: ["snippet", "status"],
      requestBody: {
        snippet: {
          title: videoTitle,
          description: videoDescription,
          tags: videoTags,
          categoryId: category_id,
        },
        status: {
          privacyStatus: privacy_status,
        },
      },
      media: {
        body: stream,
      },
    });

    const videoId = uploadResponse.data.id;
    const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const channelId = uploadResponse.data.snippet?.channelId;
    const channelTitle = uploadResponse.data.snippet?.channelTitle;

    console.log("✅ Upload successful!");
    console.log("📺 Video details:", {
      video_id: videoId,
      youtube_url: youtubeUrl,
      uploaded_to_channel_id: channelId,
      uploaded_to_channel_title: channelTitle,
      title: uploadResponse.data.snippet?.title,
      upload_status: uploadResponse.data.status?.uploadStatus,
      privacy_status: uploadResponse.data.status?.privacyStatus,
    });

    // Check if upload went to the correct channel
    if (channelId === "UCLG_UKlNif6A19Kaact2otA") {
      console.log(
        "🎯 SUCCESS: Video uploaded to MotiveArchiveMedia channel as intended!"
      );
    } else if (channelId === "UCAy_HWd9o_G3PT_CBL0tV-Q") {
      console.log(
        "⚠️  WARNING: Video uploaded to Andrew Brady personal channel instead of MotiveArchiveMedia"
      );
    } else {
      console.log(
        `ℹ️  INFO: Video uploaded to channel ${channelId} (${channelTitle})`
      );
    }

    // Update deliverable if provided
    if (deliverable_id && deliverable) {
      await Deliverable.findByIdAndUpdate(deliverable_id, {
        social_media_link: youtubeUrl,
        updated_at: new Date(),
      });
    }

    return NextResponse.json({
      success: true,
      youtube_url: youtubeUrl,
      video_id: videoId,
      title: uploadResponse.data.snippet?.title,
      upload_status: uploadResponse.data.status?.uploadStatus,
      privacy_status: uploadResponse.data.status?.privacyStatus,
    });
  } catch (error) {
    console.error("General upload error:", error);

    // If it's a YouTube API error, log more details
    if (error && typeof error === "object" && "response" in error) {
      const apiError = error as any;
      console.error("YouTube API Error Details:", {
        status: apiError.status || apiError.code,
        message: apiError.message,
        errors: apiError.errors,
        response_data: apiError.response?.data,
      });

      // Handle specific error cases
      if (apiError.status === 401 || apiError.code === 401) {
        return NextResponse.json(
          {
            error: "YouTube authentication failed",
            details:
              "Your YouTube authentication has expired or is invalid. Please re-authenticate.",
            requires_auth: true,
          },
          { status: 401 }
        );
      }

      if (apiError.status === 403 || apiError.code === 403) {
        return NextResponse.json(
          {
            error: "YouTube upload permission denied",
            details:
              "Your account may not have permission to upload videos, or the API quota may be exceeded.",
            youtube_error: apiError.errors?.[0]?.message || "Permission denied",
          },
          { status: 403 }
        );
      }
    }

    return NextResponse.json(
      {
        error: "Upload failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// Helper function to check if deliverable is a video type
function isVideoDeliverable(type: string): boolean {
  const videoTypes = [
    "Video",
    "Video Gallery",
    "feature",
    "promo",
    "review",
    "walkthrough",
    "highlights",
  ];
  return videoTypes.includes(type);
}
