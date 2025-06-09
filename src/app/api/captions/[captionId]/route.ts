import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ captionId: string }> }
) {
  try {
    const { captionId } = await params;

    // Validate ID format
    if (!ObjectId.isValid(captionId)) {
      return NextResponse.json(
        { error: "Invalid caption ID format" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    if (!client) {
      return NextResponse.json(
        { error: "Failed to connect to database" },
        { status: 500 }
      );
    }

    const db = client.db("motive_archive");
    const captions = db.collection("captions");

    const caption = await captions.findOne({ _id: new ObjectId(captionId) });

    if (!caption) {
      return NextResponse.json({ error: "Caption not found" }, { status: 404 });
    }

    // Transform the result to match expected format
    const transformedCaption = {
      _id: caption._id.toString(),
      platform: caption.platform,
      caption_text: caption.caption || caption.caption_text, // Handle both field names
      context: caption.context,
      hashtags: caption.hashtags || [],
      carId: caption.carId?.toString(),
      created_at: caption.createdAt || caption.created_at,
      updated_at: caption.updatedAt || caption.updated_at,
    };

    return NextResponse.json(transformedCaption);
  } catch (error) {
    console.error("Error fetching caption:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
