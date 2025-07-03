import { MongoClient } from "mongodb";

async function listImages() {
  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) {
    throw new Error("MONGODB_URI not found in environment variables");
  }

  const client = await MongoClient.connect(MONGODB_URI);
  const db = client.db("motive");

  try {
    const collection = db.collection("images");

    console.log("🔍 Listing all images in the database...");

    const images = await collection
      .find(
        {},
        {
          projection: {
            filename: 1,
            carId: 1,
            metadata: 1,
          },
        }
      )
      .limit(10)
      .toArray();

    console.log(`📊 Found ${images.length} images (showing first 10):`);

    for (const image of images) {
      console.log(`\n📷 Image: ${image.filename}`);
      console.log(`   ID: ${image._id}`);
      console.log(`   CarId: ${image.carId}`);
      console.log(`   Metadata keys: ${Object.keys(image.metadata || {})}`);
    }

    // Look specifically for images with "motor" in filename
    console.log('\n🔍 Looking for images with "motor" in filename...');
    const motorImages = await collection
      .find(
        {
          filename: { $regex: /motor/i },
        },
        {
          projection: {
            filename: 1,
            carId: 1,
            metadata: 1,
          },
        }
      )
      .toArray();

    console.log(
      `📊 Found ${motorImages.length} images with "motor" in filename:`
    );
    for (const image of motorImages) {
      console.log(`\n📷 Motor Image: ${image.filename}`);
      console.log(`   ID: ${image._id}`);
      console.log(`   CarId: ${image.carId}`);
      console.log(`   Metadata keys: ${Object.keys(image.metadata || {})}`);
    }
  } catch (error) {
    console.error("❌ Error listing images:", error);
    throw error;
  } finally {
    await client.close();
  }
}

// Run the list
listImages().catch(console.error);
