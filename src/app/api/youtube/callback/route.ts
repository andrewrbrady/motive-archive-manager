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
    const isPopup = searchParams.get("popup") === "true";

    // Handle OAuth errors
    if (error) {
      console.error("OAuth authorization error:", error);

      if (isPopup) {
        // For popups, return a page that communicates the error to parent
        return new NextResponse(
          `<!DOCTYPE html>
          <html>
          <head><title>Authentication Failed</title></head>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({ 
                  type: 'youtube-auth-error', 
                  error: '${error}' 
                }, '*');
                window.close();
              } else {
                window.location.href = '/admin/youtube-auth?error=${error}';
              }
            </script>
            <p>Authentication failed. This window should close automatically.</p>
          </body>
          </html>`,
          {
            status: 200,
            headers: { "Content-Type": "text/html" },
          }
        );
      }

      const redirectUrl = new URL("/admin/youtube-auth", baseUrl);
      redirectUrl.searchParams.set("error", error);
      return NextResponse.redirect(redirectUrl);
    }

    if (!code) {
      console.error("No authorization code received");

      if (isPopup) {
        return new NextResponse(
          `<!DOCTYPE html>
          <html>
          <head><title>Authentication Failed</title></head>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({ 
                  type: 'youtube-auth-error', 
                  error: 'no_code' 
                }, '*');
                window.close();
              } else {
                window.location.href = '/admin/youtube-auth?error=no_code';
              }
            </script>
            <p>Authentication failed. This window should close automatically.</p>
          </body>
          </html>`,
          {
            status: 200,
            headers: { "Content-Type": "text/html" },
          }
        );
      }

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

      // Create response with cookies
      let response: NextResponse;

      if (isPopup) {
        // For popups, return a success page that communicates to parent
        response = new NextResponse(
          `<!DOCTYPE html>
          <html>
          <head><title>Authentication Successful</title></head>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({ 
                  type: 'youtube-auth-success'
                }, '*');
                window.close();
              } else {
                window.location.href = '/admin/youtube-auth?youtube_auth_success=true';
              }
            </script>
            <div style="text-align: center; padding: 40px; font-family: Arial, sans-serif;">
              <h2>✅ Authentication Successful!</h2>
              <p>This window should close automatically.</p>
              <p>If it doesn't, you can close it manually.</p>
            </div>
          </body>
          </html>`,
          {
            status: 200,
            headers: { "Content-Type": "text/html" },
          }
        );
      } else {
        // Handle redirect flow with better state restoration
        let redirectUrl: URL;

        // Try to get the stored return URL first
        const storedReturnUrl = req.headers
          .get("cookie")
          ?.match(/youtube_auth_return_url=([^;]*)/)?.[1];
        const storedModalOpen = req.headers
          .get("cookie")
          ?.match(/youtube_auth_modal_open=([^;]*)/)?.[1];

        if (storedReturnUrl) {
          try {
            redirectUrl = new URL(decodeURIComponent(storedReturnUrl));
            redirectUrl.searchParams.set("youtube_auth_success", "true");
            if (storedModalOpen === "true") {
              redirectUrl.searchParams.set("youtube_modal_open", "true");
            }
          } catch (e) {
            // If stored URL is invalid, fall back to default
            redirectUrl = new URL("/admin/youtube-auth", baseUrl);
            redirectUrl.searchParams.set("youtube_auth_success", "true");
          }
        } else {
          // Fallback logic
          const referrer = req.headers.get("referer");
          if (referrer && referrer.includes("/cars/")) {
            redirectUrl = new URL(referrer);
            redirectUrl.searchParams.set("youtube_auth_success", "true");
          } else {
            redirectUrl = new URL("/admin/youtube-auth", baseUrl);
            redirectUrl.searchParams.set("youtube_auth_success", "true");
          }
        }

        response = NextResponse.redirect(redirectUrl);

        // Clear the stored session data
        response.cookies.set("youtube_auth_return_url", "", { maxAge: 0 });
        response.cookies.set("youtube_auth_modal_open", "", { maxAge: 0 });
      }

      // Set secure cookies with tokens
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

      if (isPopup) {
        return new NextResponse(
          `<!DOCTYPE html>
          <html>
          <head><title>Authentication Failed</title></head>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({ 
                  type: 'youtube-auth-error', 
                  error: 'token_exchange_failed' 
                }, '*');
                window.close();
              } else {
                window.location.href = '/admin/youtube-auth?error=token_exchange_failed';
              }
            </script>
            <p>Authentication failed. This window should close automatically.</p>
          </body>
          </html>`,
          {
            status: 200,
            headers: { "Content-Type": "text/html" },
          }
        );
      }

      const redirectUrl = new URL("/admin/youtube-auth", baseUrl);
      redirectUrl.searchParams.set("error", "token_exchange_failed");
      return NextResponse.redirect(redirectUrl);
    }
  } catch (error) {
    console.error("YouTube callback error:", error);

    // Check if this is a popup request
    const isPopupFallback = req.nextUrl.searchParams.get("popup") === "true";

    if (isPopupFallback) {
      return new NextResponse(
        `<!DOCTYPE html>
        <html>
        <head><title>Authentication Failed</title></head>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ 
                type: 'youtube-auth-error', 
                error: 'callback_failed' 
              }, '*');
              window.close();
            } else {
              window.location.href = '/admin/youtube-auth?error=callback_failed';
            }
          </script>
          <p>Authentication failed. This window should close automatically.</p>
        </body>
        </html>`,
        {
          status: 200,
          headers: { "Content-Type": "text/html" },
        }
      );
    }

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
