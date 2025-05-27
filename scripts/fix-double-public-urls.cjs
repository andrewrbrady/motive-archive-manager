const { MongoClient } = require("mongodb");

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB || "motive_archive";

if (!MONGODB_URI) {
  console.error("❌ MONGODB_URI environment variable is required");
  process.exit(1);
}

async function fixDoublePublicUrls() {
  const client = new MongoClient(MONGODB_URI);

  try {
    console.log("🔗 Connecting to MongoDB...");
    await client.connect();

    const db = client.db(DB_NAME);
    const imagesCollection = db.collection("images");

    // Find all images with /public/public in their URLs
    console.log("🔍 Finding images with /public/public URLs...");
    const imagesWithDoublePublic = await imagesCollection
      .find({
        url: { $regex: "/public/public" },
      })
      .toArray();

    console.log(
      `📊 Found ${imagesWithDoublePublic.length} images with /public/public URLs`
    );

    if (imagesWithDoublePublic.length === 0) {
      console.log("✅ No images need fixing!");
      return;
    }

    console.log("\n🔧 Fixing URLs...");
    let fixedCount = 0;
    let errorCount = 0;

    for (const image of imagesWithDoublePublic) {
      try {
        // Fix the URL by replacing /public/public with /public
        const fixedUrl = image.url.replace("/public/public", "/public");

        console.log(`📝 Fixing: ${image._id}`);
        console.log(`   From: ${image.url}`);
        console.log(`   To:   ${fixedUrl}`);

        // Update the image document
        await imagesCollection.updateOne(
          { _id: image._id },
          {
            $set: {
              url: fixedUrl,
              updatedAt: new Date().toISOString(),
            },
          }
        );

        fixedCount++;
        console.log(`   ✅ Fixed`);
      } catch (error) {
        console.error(`   ❌ Error fixing ${image._id}:`, error.message);
        errorCount++;
      }
    }

    console.log("\n📊 Summary:");
    console.log(`   ✅ Fixed: ${fixedCount} images`);
    console.log(`   ❌ Errors: ${errorCount} images`);

    // Verify the fix
    console.log("\n🔍 Verifying fix...");
    const remainingDoublePublic = await imagesCollection.countDocuments({
      url: { $regex: "/public/public" },
    });

    console.log(
      `📊 Remaining images with /public/public: ${remainingDoublePublic}`
    );

    if (remainingDoublePublic === 0) {
      console.log("🎉 All URLs have been successfully fixed!");
    } else {
      console.log(
        "⚠️  Some URLs still need fixing. Please check the errors above."
      );
    }
  } catch (error) {
    console.error("❌ Script failed:", error);
  } finally {
    await client.close();
    console.log("🔗 Database connection closed");
  }
}

// Run the script
console.log("🚀 Starting URL sanitization script...");
fixDoublePublicUrls().catch(console.error);
