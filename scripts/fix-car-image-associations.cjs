const { MongoClient, ObjectId } = require("mongodb");
require("dotenv").config({ path: ".env.local" });

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB;

if (!MONGODB_URI || !MONGODB_DB) {
  console.error(
    "Missing required environment variables: MONGODB_URI, MONGODB_DB"
  );
  process.exit(1);
}

async function fixCarImageAssociations() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log("Connected to MongoDB");

    const db = client.db(MONGODB_DB);
    const carsCollection = db.collection("cars");
    const imagesCollection = db.collection("images");

    // Parse command line arguments
    const args = process.argv.slice(2);
    const isDryRun = args.includes("--dry-run");
    const isReverse = args.includes("--reverse");
    const limitStr = args.find((arg) => arg.startsWith("--limit="));
    const limit = limitStr ? parseInt(limitStr.split("=")[1]) : null;

    console.log(`Mode: ${isDryRun ? "DRY RUN" : "LIVE RUN"}`);
    console.log(
      `Order: ${isReverse ? "REVERSE (newest first)" : "FORWARD (oldest first)"}`
    );
    if (limit) {
      console.log(`Limit: Processing first ${limit} cars`);
    }
    console.log("---");

    // Get all cars with their imageIds
    const carsQuery = {};
    const sortOrder = isReverse ? { _id: -1 } : { _id: 1 };
    const cars = await carsCollection
      .find(carsQuery)
      .sort(sortOrder)
      .limit(limit || 0)
      .toArray();

    console.log(`Found ${cars.length} cars to process`);

    let totalImagesProcessed = 0;
    let totalImagesFixed = 0;
    let totalErrors = 0;

    for (const car of cars) {
      console.log(
        `\nProcessing car: ${car._id} (${car.year} ${car.make} ${car.model})`
      );

      if (!car.imageIds || !Array.isArray(car.imageIds)) {
        console.log("  No imageIds array found, skipping");
        continue;
      }

      console.log(`  Found ${car.imageIds.length} image references`);

      for (const imageId of car.imageIds) {
        totalImagesProcessed++;

        try {
          // Convert imageId to ObjectId if it's a string
          const imageObjectId =
            typeof imageId === "string" ? new ObjectId(imageId) : imageId;

          // Find the image
          const image = await imagesCollection.findOne({ _id: imageObjectId });

          if (!image) {
            console.log(
              `    ⚠️  Image ${imageId} not found in images collection`
            );
            continue;
          }

          let needsUpdate = false;
          let updateData = {};

          // Check if carId is missing
          if (!image.carId) {
            console.log(
              `    🔧 Image ${image._id} missing carId, will add: ${car._id}`
            );
            updateData.carId = car._id;
            needsUpdate = true;
          }
          // Check if carId exists but is a string instead of ObjectId
          else if (typeof image.carId === "string") {
            console.log(
              `    🔧 Image ${image._id} has carId as string, will convert to ObjectId`
            );
            updateData.carId = new ObjectId(image.carId);
            needsUpdate = true;
          }
          // Check if carId is ObjectId but doesn't match the car
          else if (
            image.carId instanceof ObjectId &&
            !image.carId.equals(car._id)
          ) {
            console.log(
              `    ⚠️  Image ${image._id} has different carId: ${image.carId} vs ${car._id}`
            );
            updateData.carId = car._id;
            needsUpdate = true;
          } else {
            console.log(`    ✅ Image ${image._id} carId is correct`);
          }

          if (needsUpdate) {
            totalImagesFixed++;

            if (!isDryRun) {
              await imagesCollection.updateOne(
                { _id: imageObjectId },
                {
                  $set: {
                    ...updateData,
                    updatedAt: new Date().toISOString(),
                  },
                }
              );
              console.log(`    ✅ Updated image ${image._id}`);
            } else {
              console.log(`    🔍 Would update image ${image._id} (dry run)`);
            }
          }
        } catch (error) {
          totalErrors++;
          console.error(
            `    ❌ Error processing image ${imageId}:`,
            error.message
          );
        }
      }
    }

    console.log("\n=== SUMMARY ===");
    console.log(`Cars processed: ${cars.length}`);
    console.log(`Images processed: ${totalImagesProcessed}`);
    console.log(`Images that needed fixing: ${totalImagesFixed}`);
    console.log(`Errors encountered: ${totalErrors}`);

    if (isDryRun) {
      console.log("\n🔍 This was a dry run. No changes were made.");
      console.log("Run without --dry-run to apply changes.");
    } else {
      console.log("\n✅ All changes have been applied.");
    }
  } catch (error) {
    console.error("Script error:", error);
    process.exit(1);
  } finally {
    await client.close();
    console.log("Disconnected from MongoDB");
  }
}

// Usage examples
if (process.argv.includes("--help")) {
  console.log(`
Usage: node scripts/fix-car-image-associations.cjs [options]

Options:
  --dry-run          Run without making changes (recommended first)
  --reverse          Process cars in reverse order (newest first)
  --limit=N          Process only first N cars (for testing)
  --help             Show this help message

Examples:
  # Dry run on first 5 cars (oldest first)
  node scripts/fix-car-image-associations.cjs --dry-run --limit=5
  
  # Dry run on first 5 cars (newest first)
  node scripts/fix-car-image-associations.cjs --dry-run --limit=5 --reverse
  
  # Dry run on all cars in reverse order
  node scripts/fix-car-image-associations.cjs --dry-run --reverse
  
  # Apply fixes to first 10 cars (newest first)
  node scripts/fix-car-image-associations.cjs --limit=10 --reverse
  
  # Apply fixes to all cars
  node scripts/fix-car-image-associations.cjs
`);
  process.exit(0);
}

fixCarImageAssociations();
