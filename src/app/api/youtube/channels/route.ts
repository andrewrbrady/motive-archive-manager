import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { YoutubeChannel } from "@/models/youtube_channel";

// GET /api/youtube/channels - Get all channels
export async function GET(req: NextRequest) {
  try {
    await dbConnect();

    const channels = await YoutubeChannel.find({}).sort({ name: 1 }).lean();

    return NextResponse.json(channels);
  } catch (error) {
    console.error("Error fetching YouTube channels:", error);
    return NextResponse.json(
      { error: "Failed to fetch YouTube channels" },
      { status: 500 }
    );
  }
}

// POST /api/youtube/channels - Add a new channel
export async function POST(req: NextRequest) {
  try {
    await dbConnect();

    const body = await req.json();
    const { channel_id, tags = [] } = body;

    if (!channel_id) {
      return NextResponse.json(
        { error: "Channel ID is required" },
        { status: 400 }
      );
    }

    // Check if channel already exists
    const existingChannel = await YoutubeChannel.findOne({ channel_id });
    if (existingChannel) {
      return NextResponse.json(
        { error: "Channel already exists" },
        { status: 409 }
      );
    }

    // In a real implementation, you would fetch channel details from YouTube API
    // For now, we'll create a placeholder channel
    const newChannel = new YoutubeChannel({
      channel_id,
      name: `Channel ${channel_id}`, // This would come from YouTube API
      description: "Channel description", // This would come from YouTube API
      thumbnail_url: "https://via.placeholder.com/150", // This would come from YouTube API
      is_curated: true,
      tags,
    });

    await newChannel.save();

    return NextResponse.json(newChannel, { status: 201 });
  } catch (error) {
    console.error("Error adding YouTube channel:", error);
    return NextResponse.json(
      { error: "Failed to add YouTube channel" },
      { status: 500 }
    );
  }
}

// DELETE /api/youtube/channels/:id - Delete a channel
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();

    const { id } = params;

    const result = await YoutubeChannel.deleteOne({ channel_id: id });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Channel not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting YouTube channel:", error);
    return NextResponse.json(
      { error: "Failed to delete YouTube channel" },
      { status: 500 }
    );
  }
}
