import { MongoClient } from "mongodb";

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB || "motive";

if (!MONGODB_URI) {
  throw new Error("Please add your Mongo URI to .env");
}

async function debugQuery() {
  console.log("🔍 Debugging query for mousemotors.png...");

  const client = await MongoClient.connect(MONGODB_URI!);
  const db = client.db(DB_NAME);

  try {
    // First, find the specific image
    const image = await db.collection("images").findOne({
      filename: "mousemotors.png",
    });

    if (!image) {
      console.log("❌ No image found with filename mousemotors.png");
      return;
    }

    console.log("✅ Image found:");
    console.log("  filename:", image.filename);
    console.log("  carId:", image.carId);
    console.log("  carId type:", typeof image.carId);
    console.log("  carId === null:", image.carId === null);
    console.log("  carId === undefined:", image.carId === undefined);
    console.log("  metadata keys:", Object.keys(image.metadata || {}));

    // Now test the query conditions
    console.log("\n🧪 Testing query conditions:");

    // Test carId conditions
    const carIdNull = await db.collection("images").countDocuments({
      filename: "mousemotors.png",
      carId: null,
    });
    console.log("  carId: null ->", carIdNull);

    const carIdUndefined = await db.collection("images").countDocuments({
      filename: "mousemotors.png",
      carId: undefined,
    });
    console.log("  carId: undefined ->", carIdUndefined);

    const carIdNotExists = await db.collection("images").countDocuments({
      filename: "mousemotors.png",
      carId: { $exists: false },
    });
    console.log("  carId: { $exists: false } ->", carIdNotExists);

    // Test metadata conditions
    const hasAngle = await db.collection("images").countDocuments({
      filename: "mousemotors.png",
      "metadata.angle": { $exists: true },
    });
    console.log("  metadata.angle exists ->", hasAngle);

    // Test combined query
    const combinedQuery = await db.collection("images").countDocuments({
      filename: "mousemotors.png",
      $and: [
        {
          $or: [
            { carId: { $exists: false } },
            { carId: null },
            { carId: undefined },
          ],
        },
        {
          $or: [
            { "metadata.angle": { $exists: true } },
            { "metadata.view": { $exists: true } },
            { "metadata.movement": { $exists: true } },
            { "metadata.tod": { $exists: true } },
          ],
        },
      ],
    });
    console.log("  Combined query result ->", combinedQuery);

    // Simplified query
    const simpleQuery = await db.collection("images").countDocuments({
      filename: "mousemotors.png",
      carId: null,
      "metadata.angle": { $exists: true },
    });
    console.log(
      "  Simple query (carId: null AND metadata.angle exists) ->",
      simpleQuery
    );
  } finally {
    await client.close();
  }
}

debugQuery().catch(console.error);
