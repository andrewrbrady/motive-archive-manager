import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { YoutubeCollection } from "@/models/youtube_collection";
import { YoutubeVideo } from "@/models/youtube_video";

// GET /api/youtube/collections - Get all collections
export async function GET(req: NextRequest) {
  try {
    await dbConnect();

    const searchParams = req.nextUrl.searchParams;
    const featured = searchParams.get("featured");
    const tag = searchParams.get("tag");
    const id = searchParams.get("id");

    // If an ID is provided, return that specific collection with videos
    if (id) {
      const collection = await YoutubeCollection.findById(id).lean();

      if (!collection) {
        return NextResponse.json(
          { error: "Collection not found" },
          { status: 404 }
        );
      }

      // Get all videos in the collection
      // Use type assertion to access video_ids
      const videoIds = (collection as any).video_ids || [];
      const videos = await YoutubeVideo.find({
        video_id: { $in: videoIds },
      }).lean();

      return NextResponse.json({
        ...collection,
        videos,
      });
    }

    // Otherwise, return all collections based on filters
    const query: any = {};

    if (featured === "true") {
      query.is_featured = true;
    }

    if (tag) {
      query.tags = tag;
    }

    const collections = await YoutubeCollection.find(query)
      .sort({ created_at: -1 })
      .lean();

    return NextResponse.json(collections);
  } catch (error) {
    console.error("Error fetching YouTube collections:", error);
    return NextResponse.json(
      { error: "Failed to fetch YouTube collections" },
      { status: 500 }
    );
  }
}

// POST /api/youtube/collections - Create a new collection
export async function POST(req: NextRequest) {
  try {
    await dbConnect();

    const body = await req.json();
    const { name, description, video_ids = [], tags = [] } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Collection name is required" },
        { status: 400 }
      );
    }

    if (!video_ids.length) {
      return NextResponse.json(
        { error: "At least one video is required" },
        { status: 400 }
      );
    }

    // Verify all videos exist
    const videoCount = await YoutubeVideo.countDocuments({
      video_id: { $in: video_ids },
    });

    if (videoCount !== video_ids.length) {
      return NextResponse.json(
        { error: "One or more videos do not exist" },
        { status: 400 }
      );
    }

    // Get the first video for the thumbnail
    const firstVideo = await YoutubeVideo.findOne({ video_id: video_ids[0] });

    const newCollection = new YoutubeCollection({
      name,
      description,
      video_ids,
      thumbnail_url: firstVideo?.thumbnail_url || null,
      is_featured: false,
      tags,
    });

    await newCollection.save();

    return NextResponse.json(newCollection, { status: 201 });
  } catch (error) {
    console.error("Error creating YouTube collection:", error);
    return NextResponse.json(
      { error: "Failed to create YouTube collection" },
      { status: 500 }
    );
  }
}

// DELETE /api/youtube/collections - Delete a collection
export async function DELETE(req: NextRequest) {
  try {
    await dbConnect();

    const searchParams = req.nextUrl.searchParams;
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Collection ID is required" },
        { status: 400 }
      );
    }

    const result = await YoutubeCollection.findByIdAndDelete(id);

    if (!result) {
      return NextResponse.json(
        { error: "Collection not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting YouTube collection:", error);
    return NextResponse.json(
      { error: "Failed to delete YouTube collection" },
      { status: 500 }
    );
  }
}
