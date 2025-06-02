import { getDatabase } from "./src/lib/mongodb.ts";

async function checkCarAndImageData() {
  try {
    console.log("🔍 Connecting to database...");
    const db = await getDatabase();

    console.log("\n📊 Checking car data for primaryImageId:");
    const sampleCars = await db.collection("cars").find({}).limit(5).toArray();

    for (const car of sampleCars) {
      console.log(
        `\nCar: ${car.year || "N/A"} ${car.make || "N/A"} ${car.model || "N/A"}`
      );
      console.log(`  ID: ${car._id}`);
      console.log(`  primaryImageId: ${car.primaryImageId || "NOT SET"}`);
      console.log(`  primaryImageId type: ${typeof car.primaryImageId}`);
      console.log(
        `  imageIds count: ${car.imageIds ? car.imageIds.length : 0}`
      );

      if (car.primaryImageId) {
        // Check if this image exists in images collection
        const image = await db
          .collection("images")
          .findOne({ _id: car.primaryImageId });
        console.log(`  Image exists in DB: ${image ? "YES" : "NO"}`);
        if (image) {
          console.log(`  Image URL: ${image.url}`);
          console.log(`  Image cloudflareId: ${image.cloudflareId}`);
        }
      }
    }

    console.log("\n🖼️ Sample image data:");
    const sampleImages = await db
      .collection("images")
      .find({})
      .limit(3)
      .toArray();
    for (const image of sampleImages) {
      console.log(`\nImage ID: ${image._id}`);
      console.log(`  cloudflareId: ${image.cloudflareId}`);
      console.log(`  url: ${image.url}`);
      console.log(`  carId: ${image.carId}`);
    }
  } catch (error) {
    console.error("❌ Error:", error);
  }
  process.exit(0);
}

checkCarAndImageData();
