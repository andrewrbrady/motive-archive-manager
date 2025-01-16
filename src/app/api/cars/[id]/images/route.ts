// Location: app/api/cars/[id]/images/route.ts
import { NextRequest, NextResponse } from "next/server";
import { MongoClient, ObjectId } from "mongodb";

const uri = "mongodb://127.0.0.1:27017";
const client = new MongoClient(uri);

export async function POST(
  request: NextRequest,
  context: { params: { id: Promise<string> } }
) {
  try {
    const id = await context.params.id;
    const formData = await request.formData();
    const files = formData.getAll("images");

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: "No images provided" },
        { status: 400 }
      );
    }

    await client.connect();
    const database = client.db("motive_archive");
    const collection = database.collection("cars");

    const uploadedUrls = files.map(
      (_, index) => `https://your-storage-url.com/cars/${id}/image-${index}.jpg`
    );

    const result = await collection.updateOne(
      { _id: new ObjectId(id) },
      { $push: { images: { $each: uploadedUrls } } }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Car not found" }, { status: 404 });
    }

    return NextResponse.json({ imageUrls: uploadedUrls });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  } finally {
    await client.close();
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: { id: Promise<string> } }
) {
  try {
    const id = await context.params.id;
    const { imageUrl } = await request.json();

    if (!imageUrl) {
      return NextResponse.json(
        { error: "No image URL provided" },
        { status: 400 }
      );
    }

    await client.connect();
    const database = client.db("motive_archive");
    const collection = database.collection("cars");

    const result = await collection.updateOne(
      { _id: new ObjectId(id) },
      { $pull: { images: imageUrl } }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Car not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  } finally {
    await client.close();
  }
}
