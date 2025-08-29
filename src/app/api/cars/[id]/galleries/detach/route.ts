import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDatabase } from "@/lib/mongodb";
import { verifyAuthMiddleware, verifyFirebaseToken } from "@/lib/firebase-auth-middleware";

export async function DELETE(request: NextRequest) {
  try {
    const authResult = await verifyAuthMiddleware(request);
    if (authResult) return authResult;

    const authHeader = request.headers.get("authorization") || "";
    const token = authHeader.split("Bearer ")[1];
    const tokenData = await verifyFirebaseToken(token!);
    if (!tokenData) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    // Extract car ID from URL: /api/cars/[id]/galleries/detach -> id is at -3
    const urlFromReq = new URL(request.url);
    const pathSegments = urlFromReq.pathname.split("/");
    const id = pathSegments[pathSegments.length - 3];
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid car ID" }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const galleryId = searchParams.get("galleryId");
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

    // Atomic pull
    await db.collection("cars").updateOne(
      { _id: carId },
      { $pull: { galleryIds: galleryObjectId } as any, $set: { updatedAt: new Date() } }
    );

    return NextResponse.json({ message: "Gallery detached", galleryId });
  } catch (error) {
    console.error("Error detaching gallery from car:", error);
    return NextResponse.json({ error: "Failed to detach gallery" }, { status: 500 });
  }
}
