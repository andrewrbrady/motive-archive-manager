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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ captionId: string }> }
) {
  try {
    const { captionId } = await params;
    const data = await request.json();

    // Validate ID format
    if (!ObjectId.isValid(captionId)) {
      return NextResponse.json(
        { error: "Invalid caption ID format" },
        { status: 400 }
      );
    }

    if (!data.caption) {
      return NextResponse.json(
        { error: "Caption text is required" },
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

    const result = await captions.findOneAndUpdate(
      { _id: new ObjectId(captionId) },
      {
        $set: {
          caption: data.caption,
          context: data.context || "",
          platform: data.platform,
          updatedAt: new Date(),
        },
      },
      { returnDocument: "after" }
    );

    if (!result) {
      return NextResponse.json({ error: "Caption not found" }, { status: 404 });
    }

    // Transform the result to match expected format
    const transformedCaption = {
      _id: result._id.toString(),
      platform: result.platform,
      caption_text: result.caption,
      context: result.context,
      carId: result.carId?.toString(),
      created_at: result.createdAt || result.created_at,
      updated_at: result.updatedAt || result.updated_at,
    };

    return NextResponse.json(transformedCaption);
  } catch (error) {
    console.error("Error updating caption:", error);
    return NextResponse.json(
      { error: "Failed to update caption" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ captionId: string }> }
) {
  try {
    const { captionId } = await params;
    const { searchParams } = new URL(request.url);
    const carId = searchParams.get("carId");

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
    const cars = db.collection("cars");

    // Delete the caption
    const result = await captions.deleteOne({ _id: new ObjectId(captionId) });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Caption not found" }, { status: 404 });
    }

    // If carId is provided, update the car document to remove the caption ID
    if (carId && ObjectId.isValid(carId)) {
      try {
        const car = await cars.findOne({ _id: new ObjectId(carId) });
        if (car && car.captionIds) {
          await cars.updateOne(
            { _id: new ObjectId(carId) },
            {
              $set: {
                captionIds: car.captionIds.filter(
                  (id: ObjectId) => id.toString() !== captionId
                ),
              },
            }
          );
        }
      } catch (error) {
        console.warn("Failed to update car caption references:", error);
        // Don't fail the delete operation if car update fails
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting caption:", error);
    return NextResponse.json(
      { error: "Failed to delete caption" },
      { status: 500 }
    );
  }
}
