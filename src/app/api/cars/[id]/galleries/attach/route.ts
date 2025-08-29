import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDatabase } from "@/lib/mongodb";
import { verifyAuthMiddleware, verifyFirebaseToken } from "@/lib/firebase-auth-middleware";

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuthMiddleware(request);
    if (authResult) return authResult;

    const authHeader = request.headers.get("authorization") || "";
    const token = authHeader.split("Bearer ")[1];
    const tokenData = await verifyFirebaseToken(token!);
    if (!tokenData) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    // Extract car ID from URL: /api/cars/[id]/galleries/attach -> id is at -3
    const url = new URL(request.url);
    const segments = url.pathname.split("/");
    const id = segments[segments.length - 3];
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid car ID" }, { status: 400 });
    }

    const body = await request.json();
    const galleryId: string | undefined = body?.galleryId;
    if (!galleryId || !ObjectId.isValid(galleryId)) {
      return NextResponse.json({ error: "Invalid gallery ID" }, { status: 400 });
    }

    const db = await getDatabase();
    const carId = new ObjectId(id);
    const galleryObjectId = new ObjectId(galleryId);

    // Verify car exists
    const car = await db.collection("cars").findOne({ _id: carId });
    if (!car) {
      return NextResponse.json({ error: "Car not found" }, { status: 404 });
    }

    // Verify gallery exists
    const gallery = await db.collection("galleries").findOne({ _id: galleryObjectId });
    if (!gallery) {
      return NextResponse.json({ error: "Gallery not found" }, { status: 404 });
    }

    // Atomic add to set
    await db.collection("cars").updateOne(
      { _id: carId },
      { $addToSet: { galleryIds: galleryObjectId }, $set: { updatedAt: new Date() } }
    );

    return NextResponse.json({ message: "Gallery attached", galleryId });
  } catch (error) {
    console.error("Error attaching gallery to car:", error);
    return NextResponse.json({ error: "Failed to attach gallery" }, { status: 500 });
  }
}
