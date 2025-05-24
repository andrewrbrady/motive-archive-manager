import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";

export async function POST(req: NextRequest) {
  try {
    const { dropbox_url } = await req.json();

    if (!dropbox_url) {
      return NextResponse.json(
        { error: "Dropbox URL is required" },
        { status: 400 }
      );
    }

    console.log("Processing Dropbox URL:", dropbox_url);

    // Extract the file ID from the Dropbox URL
    const dropboxFileId = extractDropboxFileId(dropbox_url);
    if (!dropboxFileId) {
      return NextResponse.json(
        { error: "Invalid Dropbox URL format" },
        { status: 400 }
      );
    }

    // Get Dropbox access token from environment
    const accessToken = process.env.DROPBOX_ACCESS_TOKEN;
    if (!accessToken) {
      return NextResponse.json(
        { error: "Dropbox access token not configured" },
        { status: 500 }
      );
    }

    console.log("Getting direct download URL...");

    // Convert shared link to direct download link
    const directDownloadUrl = await getDropboxDirectDownloadUrl(
      dropbox_url,
      accessToken
    );

    if (!directDownloadUrl) {
      return NextResponse.json(
        { error: "Failed to get direct download URL" },
        { status: 400 }
      );
    }

    console.log(
      "Direct download URL obtained:",
      directDownloadUrl.substring(0, 100) + "..."
    );

    // Get file metadata
    const fileMetadata = await getDropboxFileMetadata(dropbox_url, accessToken);

    // Test if the direct download URL actually works
    try {
      const testResponse = await fetch(directDownloadUrl, {
        method: "HEAD",
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; MotiveArchive/1.0)",
        },
      });

      if (!testResponse.ok) {
        console.error(
          "Direct download URL test failed:",
          testResponse.status,
          testResponse.statusText
        );
        return NextResponse.json(
          {
            error: `Direct download URL is not accessible: ${testResponse.status}`,
          },
          { status: 400 }
        );
      }

      console.log("Direct download URL test successful");
    } catch (testError) {
      console.error("Error testing direct download URL:", testError);
      return NextResponse.json(
        { error: "Failed to verify direct download URL" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      download_url: directDownloadUrl,
      metadata: fileMetadata,
      debug: {
        original_url: dropbox_url,
        file_id: dropboxFileId,
        content_type: fileMetadata?.content_type || "unknown",
        size: fileMetadata?.size || 0,
      },
    });
  } catch (error) {
    console.error("Error processing Dropbox download:", error);
    return NextResponse.json(
      {
        error: "Failed to process Dropbox download",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

function extractDropboxFileId(url: string): string | null {
  try {
    // Handle different Dropbox URL formats
    // Format 1: https://www.dropbox.com/s/abc123/filename.mp4?dl=0
    // Format 2: https://www.dropbox.com/scl/fi/abc123/filename.mp4?rlkey=xyz&dl=0

    if (url.includes("/s/")) {
      const match = url.match(/\/s\/([^\/]+)/);
      return match ? match[1] : null;
    }

    if (url.includes("/scl/fi/")) {
      const match = url.match(/\/scl\/fi\/([^\/]+)/);
      return match ? match[1] : null;
    }

    return null;
  } catch (error) {
    console.error("Error extracting Dropbox file ID:", error);
    return null;
  }
}

async function getDropboxDirectDownloadUrl(
  shareUrl: string,
  accessToken: string
): Promise<string | null> {
  try {
    console.log("Converting Dropbox URL to direct download...");

    // Method 1: Simple URL conversion (works for most cases)
    if (shareUrl.includes("dropbox.com")) {
      let directUrl = shareUrl;

      // Convert dl=0 to dl=1
      if (directUrl.includes("dl=0")) {
        directUrl = directUrl.replace("dl=0", "dl=1");
      } else if (!directUrl.includes("dl=1")) {
        directUrl += (directUrl.includes("?") ? "&" : "?") + "dl=1";
      }

      // Test this URL first
      try {
        const testResponse = await fetch(directUrl, {
          method: "HEAD",
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; MotiveArchive/1.0)",
          },
        });

        if (testResponse.ok) {
          console.log("Simple URL conversion successful");
          return directUrl;
        } else {
          console.log("Simple URL conversion failed, trying API method");
        }
      } catch (error) {
        console.log("Simple URL test failed, trying API method");
      }
    }

    // Method 2: Use Dropbox API
    console.log("Using Dropbox API to get direct download URL...");

    const response = await fetch(
      "https://api.dropboxapi.com/2/sharing/get_shared_link_metadata",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: shareUrl,
          direct_only: true,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Dropbox API error:", response.status, errorText);

      // If API fails, fall back to URL conversion
      if (shareUrl.includes("dropbox.com")) {
        let directUrl = shareUrl;
        if (directUrl.includes("dl=0")) {
          directUrl = directUrl.replace("dl=0", "dl=1");
        } else if (!directUrl.includes("dl=1")) {
          directUrl += (directUrl.includes("?") ? "&" : "?") + "dl=1";
        }
        console.log("Falling back to URL conversion method");
        return directUrl;
      }

      return null;
    }

    const metadata = await response.json();
    console.log("Dropbox API response received");

    // Try to get direct download URL from metadata
    if (metadata.url) {
      return metadata.url;
    }

    // Fall back to URL conversion
    if (shareUrl.includes("dropbox.com")) {
      let directUrl = shareUrl;
      if (directUrl.includes("dl=0")) {
        directUrl = directUrl.replace("dl=0", "dl=1");
      } else if (!directUrl.includes("dl=1")) {
        directUrl += (directUrl.includes("?") ? "&" : "?") + "dl=1";
      }
      return directUrl;
    }

    return null;
  } catch (error) {
    console.error("Error getting Dropbox direct download URL:", error);

    // Final fallback to URL conversion
    if (shareUrl.includes("dropbox.com")) {
      let directUrl = shareUrl;
      if (directUrl.includes("dl=0")) {
        directUrl = directUrl.replace("dl=0", "dl=1");
      } else if (!directUrl.includes("dl=1")) {
        directUrl += (directUrl.includes("?") ? "&" : "?") + "dl=1";
      }
      console.log("Error occurred, using fallback URL conversion");
      return directUrl;
    }

    return null;
  }
}

async function getDropboxFileMetadata(
  shareUrl: string,
  accessToken: string
): Promise<any> {
  try {
    console.log("Getting file metadata from Dropbox API...");

    const response = await fetch(
      "https://api.dropboxapi.com/2/sharing/get_shared_link_metadata",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: shareUrl,
        }),
      }
    );

    if (!response.ok) {
      console.error("Dropbox metadata API error:", await response.text());
      return {
        name: "unknown",
        size: 0,
        path_display: shareUrl,
        client_modified: new Date().toISOString(),
        content_type: "unknown",
      };
    }

    const metadata = await response.json();
    console.log("Metadata retrieved:", {
      name: metadata.name,
      size: metadata.size,
      type: metadata[".tag"],
    });

    return {
      name: metadata.name,
      size: metadata.size,
      path_display: metadata.path_display,
      client_modified: metadata.client_modified,
      content_type: metadata.content_type || "video/mp4", // Default for videos
      tag: metadata[".tag"],
    };
  } catch (error) {
    console.error("Error getting Dropbox file metadata:", error);
    return {
      name: "unknown",
      size: 0,
      path_display: shareUrl,
      client_modified: new Date().toISOString(),
      content_type: "unknown",
    };
  }
}
