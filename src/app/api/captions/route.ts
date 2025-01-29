import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

interface Car {
  _id: ObjectId;
  year: number;
  make: string;
  model: string;
  color?: string;
  captionIds: ObjectId[];
}

interface Caption {
  _id?: ObjectId;
  carId: ObjectId;
  platform: string;
  context: string;
  caption: string;
  createdAt: Date;
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    if (!data.platform || !data.carId || !data.caption) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db("motive_archive");
    const captions = db.collection<Caption>("captions");
    const cars = db.collection<Car>("cars");

    // Create the caption document
    const captionDoc: Caption = {
      carId: new ObjectId(data.carId),
      platform: data.platform,
      context: data.context || "",
      caption: data.caption,
      createdAt: new Date(),
    };

    // Insert the caption
    const result = await captions.insertOne(captionDoc);

    // Update the car document to include the caption ID
    await cars.updateOne(
      { _id: new ObjectId(data.carId) },
      {
        $addToSet: {
          captionIds: result.insertedId,
        },
      }
    );

    // Return the caption with string ID for frontend
    const savedCaption = {
      ...captionDoc,
      _id: result.insertedId.toString(),
      createdAt: captionDoc.createdAt.toISOString(),
    };

    return NextResponse.json({
      success: true,
      id: result.insertedId.toString(),
      caption: savedCaption,
    });
  } catch (error) {
    console.error("Error saving caption:", error);
    return NextResponse.json(
      { error: "Failed to save caption" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const data = await request.json();
    const { searchParams } = new URL(request.url);
    const captionId = searchParams.get("id");

    if (!captionId || !data.caption) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db("motive_archive");
    const captions = db.collection<Caption>("captions");

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

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error updating caption:", error);
    return NextResponse.json(
      { error: "Failed to update caption" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const captionId = searchParams.get("id");
    const carId = searchParams.get("carId");

    if (!captionId || !carId) {
      return NextResponse.json(
        { error: "Caption ID and Car ID are required" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db("motive_archive");
    const captions = db.collection<Caption>("captions");
    const cars = db.collection<Car>("cars");

    // Delete the caption
    const result = await captions.deleteOne({ _id: new ObjectId(captionId) });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Caption not found" }, { status: 404 });
    }

    // Get the car document first
    const car = await cars.findOne({ _id: new ObjectId(carId) });
    if (!car) {
      return NextResponse.json({ error: "Car not found" }, { status: 404 });
    }

    // Update the car document to remove the caption ID
    await cars.updateOne(
      { _id: new ObjectId(carId) },
      {
        $set: {
          captionIds: car.captionIds.filter(
            (id) => id.toString() !== captionId
          ),
        },
      }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting caption:", error);
    return NextResponse.json(
      { error: "Failed to delete caption" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const carId = searchParams.get("carId");

    if (!carId) {
      return NextResponse.json(
        { error: "Car ID is required" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db("motive_archive");
    const captions = db.collection<Caption>("captions");

    const results = await captions
      .find({ carId: new ObjectId(carId) })
      .sort({ createdAt: -1 })
      .toArray();

    // Convert ObjectIds to strings and format dates for frontend
    const formattedResults = results.map((caption) => ({
      ...caption,
      _id: caption._id!.toString(),
      carId: caption.carId.toString(),
      createdAt: caption.createdAt.toISOString(),
    }));

    return NextResponse.json(formattedResults);
  } catch (error) {
    console.error("Error fetching captions:", error);
    return NextResponse.json(
      { error: "Failed to fetch captions" },
      { status: 500 }
    );
  }
}
