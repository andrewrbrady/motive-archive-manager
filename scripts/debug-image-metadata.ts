import { MongoClient } from "mongodb";

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB || "motive";

if (!MONGODB_URI) {
  throw new Error("Please add your Mongo URI to .env");
}

async function checkImageMetadata() {
  console.log("🔍 Checking image metadata...");

  const client = await MongoClient.connect(MONGODB_URI!);
  const db = client.db(DB_NAME);

  try {
    const image = await db.collection("images").findOne({
      filename: "mousemotors.png",
    });

    if (!image) {
      console.log("❌ No image found with filename mousemotors.png");
      return;
    }

    console.log("✅ Image found");
    console.log("carId:", image.carId);
    console.log("metadata keys:", Object.keys(image.metadata || {}));
    console.log("\n📊 Full metadata:");
    console.log(JSON.stringify(image.metadata, null, 2));
  } finally {
    await client.close();
  }
}

checkImageMetadata().catch(console.error);
