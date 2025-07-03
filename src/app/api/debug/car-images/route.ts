import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("🔍 Debug: Connecting to database...");
    const db = await getDatabase();

    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("📊 Debug: Checking car data for primaryImageId...");
    const sampleCars = await db.collection("cars").find({}).limit(5).toArray();

    const carData = [];
    for (const car of sampleCars) {
      const carInfo = {
        carId: car._id.toString(),
        carName: `${car.year || "N/A"} ${car.make || "N/A"} ${car.model || "N/A"}`,
        primaryImageId: car.primaryImageId?.toString() || "NOT SET",
        primaryImageIdType: typeof car.primaryImageId,
        imageIdsCount: car.imageIds ? car.imageIds.length : 0,
        imageExists: false,
        imageUrl: null,
        imageCloudflareId: null,
      };

      if (car.primaryImageId) {
        // Check if this image exists in images collection
        const image = await db
          .collection("images")
          .findOne({ _id: car.primaryImageId });
        carInfo.imageExists = !!image;
        if (image) {
          carInfo.imageUrl = image.url;
          carInfo.imageCloudflareId = image.cloudflareId;
        }
      }

      carData.push(carInfo);
    }

    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("🖼️ Debug: Checking sample image data...");
    const sampleImages = await db
      .collection("images")
      .find({})
      .limit(3)
      .toArray();
    const imageData = sampleImages.map((image) => ({
      imageId: image._id.toString(),
      cloudflareId: image.cloudflareId,
      url: image.url,
      carId: image.carId?.toString(),
    }));

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      carData,
      imageData,
    });
  } catch (error) {
    console.error("❌ Debug error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
