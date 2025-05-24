import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

interface Caption {
  _id: ObjectId;
  carId: ObjectId;
  platform: string;
  context: string;
  caption: string;
  createdAt: Date;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const carId = params.id;

    if (!carId) {
      return NextResponse.json(
        { error: "Car ID is required" },
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

    // Fetch all captions for this car
    const carCaptions = await captions
      .find({ carId: new ObjectId(carId) })
      .sort({ createdAt: -1 }) // Most recent first
      .toArray();

    // Convert ObjectIds to strings for frontend
    const formattedCaptions = carCaptions.map((caption) => ({
      _id: caption._id.toString(),
      carId: caption.carId.toString(),
      platform: caption.platform,
      context: caption.context,
      caption: caption.caption,
      createdAt: caption.createdAt.toISOString(),
    }));

    return NextResponse.json({
      success: true,
      captions: formattedCaptions,
    });
  } catch (error) {
    console.error("Error fetching car captions:", error);
    return NextResponse.json(
      { error: "Failed to fetch captions" },
      { status: 500 }
    );
  }
}
