import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { YoutubeVideo } from "@/models/youtube_video";
import { YoutubeChannel } from "@/models/youtube_channel";

// GET /api/youtube/videos - Get all videos
export async function GET(req: NextRequest) {
  try {
    await dbConnect();

    const searchParams = req.nextUrl.searchParams;
    const channelId = searchParams.get("channel_id");
    const featured = searchParams.get("featured");
    const tag = searchParams.get("tag");
    const hasTranscript = searchParams.get("has_transcript");
    const limit = parseInt(searchParams.get("limit") || "50");

    const query: any = {};

    if (channelId) {
      query.channel_id = channelId;
    }

    if (featured === "true") {
      query.is_featured = true;
    }

    if (tag) {
      query.tags = tag;
    }

    if (hasTranscript === "true") {
      query.has_transcript = true;
    } else if (hasTranscript === "false") {
      query.has_transcript = false;
    }

    const videos = await YoutubeVideo.find(query)
      .sort({ published_at: -1 })
      .limit(limit)
      .lean();

    return NextResponse.json(videos);
  } catch (error) {
    console.error("Error fetching YouTube videos:", error);
    return NextResponse.json(
      { error: "Failed to fetch YouTube videos" },
      { status: 500 }
    );
  }
}

// POST /api/youtube/videos - Add a new video
export async function POST(req: NextRequest) {
  try {
    await dbConnect();

    const body = await req.json();
    const { video_id, channel_id, tags = [], transcribe = false } = body;

    if (!video_id) {
      return NextResponse.json(
        { error: "Video ID is required" },
        { status: 400 }
      );
    }

    if (!channel_id) {
      return NextResponse.json(
        { error: "Channel ID is required" },
        { status: 400 }
      );
    }

    // Check if video already exists
    const existingVideo = await YoutubeVideo.findOne({ video_id });
    if (existingVideo) {
      return NextResponse.json(
        { error: "Video already exists" },
        { status: 409 }
      );
    }

    // Check if channel exists
    const channel = await YoutubeChannel.findOne({ channel_id });
    if (!channel) {
      return NextResponse.json({ error: "Channel not found" }, { status: 404 });
    }

    // In a real implementation, you would fetch video details from YouTube API
    // For now, we'll create a placeholder video
    const newVideo = new YoutubeVideo({
      video_id,
      title: `Video ${video_id}`, // This would come from YouTube API
      description: "Video description", // This would come from YouTube API
      channel_id,
      channel_name: channel.name,
      published_at: new Date(), // This would come from YouTube API
      thumbnail_url: "https://via.placeholder.com/480x360", // This would come from YouTube API
      duration: "10:30", // This would come from YouTube API
      view_count: 1000, // This would come from YouTube API
      like_count: 100, // This would come from YouTube API
      comment_count: 50, // This would come from YouTube API
      is_featured: false,
      has_transcript: false,
      tags,
    });

    const savedVideo = await newVideo.save();

    // If transcribe is true, you would trigger a transcription job here
    if (transcribe) {
      // In a real implementation, you would trigger a transcription job
      console.log(`Transcription requested for video ${video_id}`);

      // You could make an API call to a transcription service here
      // For example:
      /*
      try {
        const response = await fetch("/api/transcription/request", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ video_id }),
        });
        
        if (!response.ok) {
          console.error("Failed to request transcription");
        }
      } catch (error) {
        console.error("Error requesting transcription:", error);
      }
      */
    }

    return NextResponse.json(savedVideo, { status: 201 });
  } catch (error) {
    console.error("Error adding YouTube video:", error);
    return NextResponse.json(
      { error: "Failed to add YouTube video" },
      { status: 500 }
    );
  }
}

// PUT /api/youtube/videos/transcribe - Request transcription for a video
export async function PUT(req: NextRequest) {
  try {
    await dbConnect();

    const body = await req.json();
    const { video_id, action } = body;

    if (!video_id) {
      return NextResponse.json(
        { error: "Video ID is required" },
        { status: 400 }
      );
    }

    // Find the video
    const video = await YoutubeVideo.findOne({ video_id });
    if (!video) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    // Handle different actions
    if (action === "transcribe") {
      // In a real implementation, you would trigger a transcription job
      console.log(`Transcription requested for video ${video_id}`);

      // You could make an API call to a transcription service here
      // For example:
      /*
      try {
        const response = await fetch("/api/transcription/request", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ video_id }),
        });
        
        if (!response.ok) {
          throw new Error("Failed to request transcription");
        }
        
        // Update the video to indicate that transcription is in progress
        video.transcription_status = "processing";
        await video.save();
        
      } catch (error) {
        console.error("Error requesting transcription:", error);
        return NextResponse.json(
          { error: "Failed to request transcription" },
          { status: 500 }
        );
      }
      */

      return NextResponse.json({
        success: true,
        message: "Transcription requested",
      });
    } else if (action === "feature") {
      // Toggle featured status
      video.is_featured = !video.is_featured;
      await video.save();

      return NextResponse.json({
        success: true,
        is_featured: video.is_featured,
      });
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Error updating YouTube video:", error);
    return NextResponse.json(
      { error: "Failed to update YouTube video" },
      { status: 500 }
    );
  }
}

// DELETE /api/youtube/videos - Delete a video
export async function DELETE(req: NextRequest) {
  try {
    await dbConnect();

    const searchParams = req.nextUrl.searchParams;
    const videoId = searchParams.get("video_id");

    if (!videoId) {
      return NextResponse.json(
        { error: "Video ID is required" },
        { status: 400 }
      );
    }

    const result = await YoutubeVideo.deleteOne({ video_id: videoId });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    // Also delete any associated transcript
    try {
      await fetch(`/api/youtube/transcripts?video_id=${videoId}`, {
        method: "DELETE",
      });
    } catch (error) {
      console.error("Error deleting associated transcript:", error);
      // Continue even if transcript deletion fails
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting YouTube video:", error);
    return NextResponse.json(
      { error: "Failed to delete YouTube video" },
      { status: 500 }
    );
  }
}
