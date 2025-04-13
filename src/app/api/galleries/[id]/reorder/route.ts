import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function PUT(request: NextRequest): Promise<Response> {
  try {
    const id = request.nextUrl.pathname.split("/")[3]; // Get ID from URL path
    const { orderedImages } = await request.json();
    const { db } = await connectToDatabase();

    const gallery = await db.collection("galleries").findOne({
      _id: new ObjectId(id),
    });

    if (!gallery) {
      return Response.json({ error: "Gallery not found" }, { status: 404 });
    }

    // Update the gallery with the new ordered images
    await db.collection("galleries").updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          orderedImages,
          updatedAt: new Date(),
        },
      }
    );

    return Response.json({ success: true });
  } catch (error) {
    console.error("Error updating gallery image order:", error);
    return Response.json(
      { error: "Failed to update gallery image order" },
      { status: 500 }
    );
  }
}
