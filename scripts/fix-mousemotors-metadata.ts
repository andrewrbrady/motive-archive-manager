import { MongoClient } from "mongodb";

async function fixMousemotorsMetadata() {
  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) {
    throw new Error("MONGODB_URI not found in environment variables");
  }

  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    const db = client.db("motive");
    const collection = db.collection("images");

    console.log("🔍 Finding mousemotors.png image...");

    // Find the specific image
    const image = await collection.findOne({
      filename: "mousemotors.png",
    });

    if (!image) {
      console.log("❌ mousemotors.png not found");
      return;
    }

    console.log("✅ Found mousemotors.png");
    console.log("   Current carId:", image.carId);
    console.log(
      "   Current metadata:",
      JSON.stringify(image.metadata, null, 2)
    );

    // Check if it needs updating (has car metadata but no carId)
    if (image.carId === null && image.metadata && image.metadata.angle) {
      console.log("🔧 Image needs metadata cleanup - updating...");

      // Create clean metadata for general image
      const cleanMetadata = {
        content_type: "business_logo",
        primary_subject: "company_branding",
        dominant_colors: ["unknown"],
        style: "digital",
        usage_context: "branding",
        has_text: true,
        has_brand_elements: true,
        description: "MouseMotors company logo or branding element",
        category: "general",
      };

      console.log(
        "   New metadata will be:",
        JSON.stringify(cleanMetadata, null, 2)
      );

      // Update the image
      const result = await collection.updateOne(
        { _id: image._id },
        {
          $set: {
            metadata: cleanMetadata,
            updatedAt: new Date().toISOString(),
          },
        }
      );

      if (result.modifiedCount > 0) {
        console.log("✅ Successfully updated mousemotors.png metadata");

        // Verify the update
        const updatedImage = await collection.findOne({ _id: image._id });
        console.log(
          "🔍 Verification - updated metadata:",
          JSON.stringify(updatedImage?.metadata, null, 2)
        );
      } else {
        console.log("❌ Failed to update metadata");
      }
    } else {
      console.log(
        "✅ Image metadata is already correct or doesn't need updating"
      );
    }
  } catch (error) {
    console.error("❌ Error fixing metadata:", error);
    throw error;
  } finally {
    await client.close();
  }
}

// Run the fix
fixMousemotorsMetadata().catch(console.error);
