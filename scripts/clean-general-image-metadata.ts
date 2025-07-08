import { MongoClient } from "mongodb";

async function cleanGeneralImageMetadata() {
  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) {
    throw new Error("MONGODB_URI not found in environment variables");
  }

  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    const db = client.db("motive");
    const collection = db.collection("images");

    console.log("🔍 Finding images that need metadata cleanup...");

    // Simplified query based on debug results
    const imagesToUpdate = await collection
      .find({
        carId: null,
        "metadata.angle": { $exists: true },
      })
      .toArray();

    console.log(`📊 Found ${imagesToUpdate.length} images that need cleanup`);

    if (imagesToUpdate.length === 0) {
      console.log("✅ No images need cleanup");
      return;
    }

    for (const image of imagesToUpdate) {
      console.log(`\n🔧 Cleaning metadata for image: ${image.filename}`);
      console.log(`   Image ID: ${image._id}`);
      console.log(`   CarId: ${image.carId}`);
      console.log(
        `   Current metadata keys: ${Object.keys(image.metadata || {})}`
      );

      // Create clean metadata object for general images
      const cleanMetadata = {
        // Set appropriate general fields based on the filename/content
        content_type: getContentType(image.filename),
        primary_subject: getPrimarySubject(image.filename),
        dominant_colors: ["unknown"],
        style: "digital",
        usage_context: getUsageContext(image.filename),
        has_text: hasText(image.filename),
        has_brand_elements: hasBrandElements(image.filename),
        description: getDescription(image.filename),
        category: "general",
      };

      console.log(`   New metadata will be:`, cleanMetadata);

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
        console.log(`   ✅ Updated metadata successfully`);
        console.log(`   New metadata keys: ${Object.keys(cleanMetadata)}`);
      } else {
        console.log(`   ❌ Failed to update metadata`);
      }
    }

    console.log(
      `\n🎉 Cleanup complete! Updated ${imagesToUpdate.length} images`
    );
  } catch (error) {
    console.error("❌ Error cleaning metadata:", error);
    throw error;
  } finally {
    await client.close();
  }
}

// Helper functions to determine appropriate metadata based on filename
function getContentType(filename: string): string {
  if (filename.includes("logo") || filename.includes("brand")) return "logo";
  if (filename.includes("motor") || filename.includes("company"))
    return "business_logo";
  return "general";
}

function getPrimarySubject(filename: string): string {
  if (filename.includes("motor")) return "company_branding";
  if (filename.includes("logo")) return "logo";
  return "graphic_element";
}

function getUsageContext(filename: string): string {
  if (filename.includes("motor") || filename.includes("logo"))
    return "branding";
  return "general_purpose";
}

function hasText(filename: string): boolean {
  return filename.includes("motor") || filename.includes("logo");
}

function hasBrandElements(filename: string): boolean {
  return (
    filename.includes("motor") ||
    filename.includes("logo") ||
    filename.includes("brand")
  );
}

function getDescription(filename: string): string {
  if (filename.includes("mousemotors"))
    return "MouseMotors company logo or branding element";
  if (filename.includes("logo")) return "Logo or branding element";
  return "General upload image";
}

// Run the cleanup
cleanGeneralImageMetadata().catch(console.error);
