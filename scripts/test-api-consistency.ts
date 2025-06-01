import { MongoClient, ObjectId } from "mongodb";
import * as dotenv from "dotenv";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB || "motive_archive";
const TEST_CAR_ID = "67d13094dc27b630a36fb449";

if (!MONGODB_URI) {
  throw new Error("Please add your Mongo URI to .env");
}

async function testApiConsistency() {
  console.log("🧪 Testing API vs Database filtering consistency");

  const client = new MongoClient(MONGODB_URI as string);
  await client.connect();
  const db = client.db(DB_NAME);

  // Test the API query logic directly in database
  const carObjectId = new ObjectId(TEST_CAR_ID);

  // Test query that matches the API logic for angle=side AND view=exterior
  const query = {
    carId: carObjectId,
    $and: [
      {
        $or: [
          { "metadata.angle": "side" },
          { "metadata.originalImage.metadata.angle": "side" },
        ],
      },
      {
        $or: [
          { "metadata.view": "exterior" },
          { "metadata.originalImage.metadata.view": "exterior" },
        ],
      },
    ],
  };

  console.log("🔍 Database Query:", JSON.stringify(query, null, 2));

  const results = await db.collection("images").find(query).toArray();
  console.log("📊 Database Results:", results.length, "images found");

  // Show first few results
  console.log("📋 Sample Results:");
  results.slice(0, 5).forEach((img, i) => {
    console.log(
      `  ${i + 1}. ${img._id.toString().substring(0, 8)}... - angle: ${img.metadata?.angle || "N/A"}, view: ${img.metadata?.view || "N/A"}`
    );
    if (img.metadata?.originalImage?.metadata) {
      console.log(
        `     Nested - angle: ${img.metadata.originalImage.metadata.angle || "N/A"}, view: ${img.metadata.originalImage.metadata.view || "N/A"}`
      );
    }
  });

  // Now test the actual API endpoint
  console.log("\n🌐 Testing actual API endpoint...");

  try {
    const apiUrl = `http://localhost:3000/api/cars/${TEST_CAR_ID}/images?angle=side&view=exterior`;
    console.log("API URL:", apiUrl);

    const response = await fetch(apiUrl);
    if (response.ok) {
      const apiData = await response.json();
      console.log(
        "📊 API Results:",
        apiData.images?.length || 0,
        "images found"
      );
      console.log("🔢 API Pagination:", apiData.pagination);

      // Compare results
      if (apiData.images?.length === results.length) {
        console.log("✅ API and Database results match!");
      } else {
        console.log("❌ API and Database results differ!");
        console.log(`   Database: ${results.length} images`);
        console.log(`   API: ${apiData.images?.length || 0} images`);
      }
    } else {
      console.log(
        "❌ API request failed:",
        response.status,
        response.statusText
      );
    }
  } catch (error) {
    console.log(
      "❌ API test failed (server might not be running):",
      (error as Error).message
    );
  }

  await client.close();
}

async function main() {
  try {
    await testApiConsistency();
  } catch (error) {
    console.error("❌ Test failed:", error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { testApiConsistency };
