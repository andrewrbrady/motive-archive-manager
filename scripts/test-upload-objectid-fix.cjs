const { MongoClient, ObjectId } = require("mongodb");

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017";
const DB_NAME = process.env.MONGODB_DB || "motive_archive";

async function testUploadObjectIdFix() {
  let client;

  try {
    console.log("🧪 Testing upload ObjectId fix...");
    console.log("🔗 Connecting to MongoDB...");

    client = new MongoClient(MONGODB_URI);
    await client.connect();
    const db = client.db(DB_NAME);

    console.log("✅ Connected to MongoDB");

    // Collections
    const carsCollection = db.collection("cars");
    const projectsCollection = db.collection("projects");
    const galleriesCollection = db.collection("galleries");

    console.log("\n🔍 === CHECKING CURRENT STATE ===");

    // Check a few recent cars
    const recentCars = await carsCollection
      .find({ imageIds: { $exists: true, $ne: [] } })
      .sort({ updatedAt: -1 })
      .limit(5)
      .toArray();

    console.log(`📊 Checking ${recentCars.length} recent cars with images:`);

    for (const car of recentCars) {
      if (car.imageIds && car.imageIds.length > 0) {
        let hasStrings = false;
        let hasObjectIds = false;

        for (const id of car.imageIds) {
          if (typeof id === "string") hasStrings = true;
          if (id instanceof ObjectId) hasObjectIds = true;
        }

        const status = hasStrings
          ? hasObjectIds
            ? "MIXED"
            : "STRINGS"
          : "OBJECTIDS";
        console.log(
          `🚗 Car ${car._id} (${car.year || "?"} ${car.make || "?"} ${car.model || "?"}): ${status} - ${car.imageIds.length} images`
        );

        if (hasStrings) {
          console.log(
            `   ⚠️  Still has string imageIds! Latest: ${car.imageIds
              .slice(-3)
              .map((id) =>
                typeof id === "string" ? `"${id}"` : `ObjectId(${id})`
              )
              .join(", ")}`
          );
        }
      }
    }

    // Check a few recent projects
    const recentProjects = await projectsCollection
      .find({ imageIds: { $exists: true, $ne: [] } })
      .sort({ updatedAt: -1 })
      .limit(5)
      .toArray();

    console.log(
      `\n📊 Checking ${recentProjects.length} recent projects with images:`
    );

    for (const project of recentProjects) {
      if (project.imageIds && project.imageIds.length > 0) {
        let hasStrings = false;
        let hasObjectIds = false;

        for (const id of project.imageIds) {
          if (typeof id === "string") hasStrings = true;
          if (id instanceof ObjectId) hasObjectIds = true;
        }

        const status = hasStrings
          ? hasObjectIds
            ? "MIXED"
            : "STRINGS"
          : "OBJECTIDS";
        console.log(
          `📁 Project ${project._id} (${project.name || "Unnamed"}): ${status} - ${project.imageIds.length} images`
        );

        if (hasStrings) {
          console.log(
            `   ⚠️  Still has string imageIds! Latest: ${project.imageIds
              .slice(-3)
              .map((id) =>
                typeof id === "string" ? `"${id}"` : `ObjectId(${id})`
              )
              .join(", ")}`
          );
        }
      }
    }

    // Check a few recent galleries
    const recentGalleries = await galleriesCollection
      .find({ imageIds: { $exists: true, $ne: [] } })
      .sort({ updatedAt: -1 })
      .limit(5)
      .toArray();

    console.log(
      `\n📊 Checking ${recentGalleries.length} recent galleries with images:`
    );

    for (const gallery of recentGalleries) {
      if (gallery.imageIds && gallery.imageIds.length > 0) {
        let hasStrings = false;
        let hasObjectIds = false;

        for (const id of gallery.imageIds) {
          if (typeof id === "string") hasStrings = true;
          if (id instanceof ObjectId) hasObjectIds = true;
        }

        const status = hasStrings
          ? hasObjectIds
            ? "MIXED"
            : "STRINGS"
          : "OBJECTIDS";
        console.log(
          `🖼️  Gallery ${gallery._id} (${gallery.name || "Unnamed"}): ${status} - ${gallery.imageIds.length} images`
        );

        if (hasStrings) {
          console.log(
            `   ⚠️  Still has string imageIds! Latest: ${gallery.imageIds
              .slice(-3)
              .map((id) =>
                typeof id === "string" ? `"${id}"` : `ObjectId(${id})`
              )
              .join(", ")}`
          );
        }
      }
    }

    console.log("\n📋 === SUMMARY ===");
    console.log(`
🎯 WHAT TO LOOK FOR:
- ✅ "OBJECTIDS" status means the upload fix is working
- ⚠️  "STRINGS" or "MIXED" means uploads are still storing strings

🚀 NEXT STEPS:
1. If you see any "STRINGS" or "MIXED" status, the upload APIs still need fixing
2. Upload a test image to a car or project page
3. Run this script again to see if the new upload uses ObjectIds
4. If still seeing strings, check the specific API endpoint being used

🔧 UPLOAD API ENDPOINTS FIXED:
- ✅ src/app/api/cars/[id]/images/route.ts (POST)
- ✅ src/app/api/projects/[id]/images/route.ts (POST)
- ✅ src/app/api/cloudflare/images/route.ts (POST)
- ✅ src/app/api/cloudflare/images/analyze/route.ts (POST)
`);

    console.log("✅ Upload ObjectId test completed!");
  } catch (error) {
    console.error("❌ Error during upload test:", error);
  } finally {
    if (client) {
      await client.close();
      console.log("🔌 MongoDB connection closed");
    }
  }
}

// Run the script
if (require.main === module) {
  testUploadObjectIdFix();
}

module.exports = { testUploadObjectIdFix };
