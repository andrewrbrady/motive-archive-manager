import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { YoutubeTranscript } from "@/models/youtube_transcript";
import { YoutubeVideo } from "@/models/youtube_video";
import mongoose from "mongoose";

// GET /api/youtube/transcripts - Get transcripts
export async function GET(req: NextRequest) {
  try {
    await dbConnect();

    const searchParams = req.nextUrl.searchParams;
    const videoId = searchParams.get("video_id");
    const id = searchParams.get("id");

    // If an ID is provided, return that specific transcript
    if (id) {
      const transcript = await YoutubeTranscript.findById(id).lean();

      if (!transcript) {
        return NextResponse.json(
          { error: "Transcript not found" },
          { status: 404 }
        );
      }

      return NextResponse.json(transcript);
    }

    // If a video ID is provided, return the transcript for that video
    if (videoId) {
      const transcript = await YoutubeTranscript.findOne({
        video_id: videoId,
      }).lean();

      if (!transcript) {
        return NextResponse.json(
          { error: "Transcript not found for this video" },
          { status: 404 }
        );
      }

      return NextResponse.json(transcript);
    }

    // Otherwise, return all transcripts (with pagination)
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    const transcripts = await YoutubeTranscript.find({})
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await YoutubeTranscript.countDocuments({});

    return NextResponse.json({
      transcripts,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching YouTube transcripts:", error);
    return NextResponse.json(
      { error: "Failed to fetch YouTube transcripts" },
      { status: 500 }
    );
  }
}

// POST /api/youtube/transcripts - Create a new transcript
export async function POST(req: NextRequest) {
  try {
    await dbConnect();

    const body = await req.json();
    const {
      video_id,
      full_text,
      segments,
      language = "en",
      summary,
      metadata,
      speakers,
    } = body;

    if (!video_id) {
      return NextResponse.json(
        { error: "Video ID is required" },
        { status: 400 }
      );
    }

    if (!full_text || !segments || !Array.isArray(segments)) {
      return NextResponse.json(
        { error: "Full text and segments are required" },
        { status: 400 }
      );
    }

    // Check if video exists
    const video = await YoutubeVideo.findOne({ video_id });
    if (!video) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    // Check if transcript already exists
    const existingTranscript = await YoutubeTranscript.findOne({ video_id });
    if (existingTranscript) {
      return NextResponse.json(
        { error: "Transcript already exists for this video" },
        { status: 409 }
      );
    }

    // Create the transcript
    const newTranscript = new YoutubeTranscript({
      video_id,
      language,
      is_auto_generated: true, // Default to true, can be updated if needed
      full_text,
      segments,
      summary,
      metadata,
      speakers,
    });

    const savedTranscript = await newTranscript.save();

    // Update the video with the transcript reference
    await YoutubeVideo.findOneAndUpdate(
      { video_id },
      {
        transcript_id: savedTranscript._id,
        has_transcript: true,
        transcript_summary: summary || undefined,
      }
    );

    return NextResponse.json(savedTranscript, { status: 201 });
  } catch (error) {
    console.error("Error creating YouTube transcript:", error);
    return NextResponse.json(
      { error: "Failed to create YouTube transcript" },
      { status: 500 }
    );
  }
}

// PUT /api/youtube/transcripts - Update a transcript
export async function PUT(req: NextRequest) {
  try {
    await dbConnect();

    const body = await req.json();
    const {
      id,
      video_id,
      full_text,
      segments,
      language,
      summary,
      metadata,
      speakers,
    } = body;

    if (!id && !video_id) {
      return NextResponse.json(
        { error: "Transcript ID or Video ID is required" },
        { status: 400 }
      );
    }

    // Find the transcript
    let transcript;
    if (id) {
      transcript = await YoutubeTranscript.findById(id);
    } else {
      transcript = await YoutubeTranscript.findOne({ video_id });
    }

    if (!transcript) {
      return NextResponse.json(
        { error: "Transcript not found" },
        { status: 404 }
      );
    }

    // Update the transcript
    if (language) transcript.language = language;
    if (full_text) transcript.full_text = full_text;
    if (segments) transcript.segments = segments;
    if (summary) transcript.summary = summary;
    if (metadata) transcript.metadata = metadata;
    if (speakers) transcript.speakers = speakers;

    const updatedTranscript = await transcript.save();

    // Update the video's transcript summary if provided
    if (summary) {
      await YoutubeVideo.findOneAndUpdate(
        { video_id: transcript.video_id },
        { transcript_summary: summary }
      );
    }

    return NextResponse.json(updatedTranscript);
  } catch (error) {
    console.error("Error updating YouTube transcript:", error);
    return NextResponse.json(
      { error: "Failed to update YouTube transcript" },
      { status: 500 }
    );
  }
}

// DELETE /api/youtube/transcripts - Delete a transcript
export async function DELETE(req: NextRequest) {
  try {
    await dbConnect();

    const searchParams = req.nextUrl.searchParams;
    const id = searchParams.get("id");
    const videoId = searchParams.get("video_id");

    if (!id && !videoId) {
      return NextResponse.json(
        { error: "Transcript ID or Video ID is required" },
        { status: 400 }
      );
    }

    let result;
    let videoToUpdate;

    if (id) {
      // Find the transcript first to get the video_id
      const transcript = await YoutubeTranscript.findById(id);
      if (transcript) {
        videoToUpdate = transcript.video_id;
      }

      result = await YoutubeTranscript.findByIdAndDelete(id);
    } else {
      // Find the transcript first to get its ID
      const transcript = await YoutubeTranscript.findOne({ video_id: videoId });
      if (transcript) {
        videoToUpdate = videoId;
      }

      result = await YoutubeTranscript.findOneAndDelete({ video_id: videoId });
    }

    if (!result) {
      return NextResponse.json(
        { error: "Transcript not found" },
        { status: 404 }
      );
    }

    // Update the video to remove the transcript reference
    if (videoToUpdate) {
      await YoutubeVideo.findOneAndUpdate(
        { video_id: videoToUpdate },
        {
          transcript_id: null,
          has_transcript: false,
          transcript_summary: null,
        }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting YouTube transcript:", error);
    return NextResponse.json(
      { error: "Failed to delete YouTube transcript" },
      { status: 500 }
    );
  }
}
