import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { Deliverable } from "@/models/Deliverable";
import { ObjectId } from "mongodb";

interface UploadToYouTubeRequest {
  title?: string;
  description?: string;
  tags?: string[];
  privacy_status?: "private" | "public" | "unlisted";
  channel_id?: string; // Selected YouTube channel ID
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ deliverableId: string }> }
) {
  try {
    await dbConnect();

    const { deliverableId } = await params;
    const {
      title,
      description,
      tags = [],
      privacy_status = "private",
      channel_id,
    }: UploadToYouTubeRequest = await req.json();

    // Validate deliverable ID
    if (!ObjectId.isValid(deliverableId)) {
      return NextResponse.json(
        { error: "Invalid deliverable ID" },
        { status: 400 }
      );
    }

    // Find the deliverable
    const deliverable = await Deliverable.findById(deliverableId);
    if (!deliverable) {
      return NextResponse.json(
        { error: "Deliverable not found" },
        { status: 404 }
      );
    }

    // Check if deliverable has a Dropbox link
    if (!deliverable.dropbox_link) {
      return NextResponse.json(
        { error: "No Dropbox link found for this deliverable" },
        { status: 400 }
      );
    }

    // Verify that the deliverable is a video type
    if (!isVideoDeliverable(deliverable.type)) {
      return NextResponse.json(
        { error: "Deliverable must be a video type to upload to YouTube" },
        { status: 400 }
      );
    }

    // Step 1: Get video download URL from Dropbox
    const dropboxResponse = await fetch(
      `${process.env.NEXTAUTH_URL}/api/dropbox/download`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          dropbox_url: deliverable.dropbox_link,
        }),
      }
    );

    if (!dropboxResponse.ok) {
      const dropboxError = await dropboxResponse.json();
      return NextResponse.json(
        { error: `Failed to process Dropbox download: ${dropboxError.error}` },
        { status: 400 }
      );
    }

    const { download_url, metadata } = await dropboxResponse.json();

    // Step 2: Upload video to YouTube
    const youtubeResponse = await fetch(
      `${process.env.NEXTAUTH_URL}/api/youtube/upload`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Forward cookies from the original request
          Cookie: req.headers.get("cookie") || "",
        },
        body: JSON.stringify({
          video_url: download_url,
          title: title || deliverable.title,
          description:
            description ||
            deliverable.description ||
            `${deliverable.title} - Uploaded from Motive Archive Manager`,
          tags: tags.length > 0 ? tags : deliverable.tags || [],
          privacy_status,
          category_id: "2", // Autos & Vehicles
          channel_id, // Pass selected channel ID
        }),
      }
    );

    if (!youtubeResponse.ok) {
      const youtubeError = await youtubeResponse.json();

      // Forward authentication errors properly
      if (youtubeResponse.status === 401 || youtubeError.requires_auth) {
        return NextResponse.json(
          {
            error: youtubeError.error || "YouTube authentication required",
            requires_auth: true,
          },
          { status: 401 }
        );
      }

      // Forward other YouTube errors
      return NextResponse.json(
        { error: `Failed to upload to YouTube: ${youtubeError.error}` },
        { status: youtubeResponse.status }
      );
    }

    const youtubeResult = await youtubeResponse.json();

    // Step 3: Update deliverable with YouTube URL
    await Deliverable.findByIdAndUpdate(deliverableId, {
      social_media_link: youtubeResult.video_url,
      updated_at: new Date(),
    });

    return NextResponse.json({
      success: true,
      youtube_video_id: youtubeResult.video_id,
      youtube_url: youtubeResult.video_url,
      title: youtubeResult.title,
      upload_status: youtubeResult.upload_status,
      privacy_status: youtubeResult.privacy_status,
      dropbox_metadata: metadata,
    });
  } catch (error) {
    console.error("Error uploading deliverable to YouTube:", error);
    return NextResponse.json(
      { error: "Failed to upload video to YouTube" },
      { status: 500 }
    );
  }
}

function isVideoDeliverable(type: string | undefined): boolean {
  if (!type) return false;
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
