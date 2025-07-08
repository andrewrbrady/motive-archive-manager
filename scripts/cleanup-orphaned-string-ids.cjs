const { MongoClient, ObjectId } = require("mongodb");

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017";
const DB_NAME = process.env.MONGODB_DB || "motive_archive";

async function cleanupOrphanedStringIds() {
  let client;

  try {
    console.log("🧹 Starting cleanup of orphaned string imageIds...");
    console.log("🔗 Connecting to MongoDB...");

    client = new MongoClient(MONGODB_URI);
    await client.connect();

    const db = client.db(DB_NAME);
    const carsCollection = db.collection("cars");
    const imagesCollection = db.collection("images");

    // Step 1: Find cars with string imageIds
    console.log("\n📊 Scanning for cars with string imageIds...");

    const carsWithStringIds = await carsCollection
      .find({
        imageIds: { $elemMatch: { $type: "string" } },
      })
      .toArray();

    console.log(`Found ${carsWithStringIds.length} cars with string imageIds`);

    if (carsWithStringIds.length === 0) {
      console.log("✅ No orphaned string IDs found. Database is clean!");
      return;
    }

    let totalStringIds = 0;
    let totalConverted = 0;
    let totalRemoved = 0;

    for (const car of carsWithStringIds) {
      console.log(
        `\n🚗 Processing car: ${car._id} (${car.year} ${car.make} ${car.model})`
      );

      if (!car.imageIds || !Array.isArray(car.imageIds)) {
        console.log("   ⏭️  No imageIds array, skipping");
        continue;
      }

      const cleanedImageIds = [];
      const processedImageIds = car.processedImageIds
        ? [...car.processedImageIds]
        : [];
      let carHasChanges = false;

      console.log(`   📸 Processing ${car.imageIds.length} imageIds...`);

      for (const imageId of car.imageIds) {
        totalStringIds++;

        if (typeof imageId === "string") {
          console.log(`   🔍 Found string imageId: "${imageId}"`);

          // Check if it's a valid ObjectId format
          if (ObjectId.isValid(imageId)) {
            const objectId = new ObjectId(imageId);

            // Check if the image actually exists in the images collection
            const imageExists = await imagesCollection.findOne({
              _id: objectId,
            });

            if (imageExists) {
              console.log(
                `   ✅ Converting valid string "${imageId}" to ObjectId`
              );
              cleanedImageIds.push(objectId);
              totalConverted++;
            } else {
              console.log(
                `   ❌ Image "${imageId}" doesn't exist, removing from imageIds`
              );
              carHasChanges = true;
              totalRemoved++;
            }
          } else {
            console.log(
              `   ❌ Invalid ObjectId format "${imageId}", removing from imageIds`
            );
            carHasChanges = true;
            totalRemoved++;
          }
        } else if (imageId instanceof ObjectId) {
          // Already an ObjectId, verify it exists
          const imageExists = await imagesCollection.findOne({ _id: imageId });

          if (imageExists) {
            cleanedImageIds.push(imageId);
          } else {
            console.log(
              `   ❌ ObjectId "${imageId}" doesn't exist, removing from imageIds`
            );
            carHasChanges = true;
            totalRemoved++;
          }
        } else {
          console.log(
            `   ❌ Invalid imageId type: ${typeof imageId}, removing`
          );
          carHasChanges = true;
          totalRemoved++;
        }
      }

      // Clean up processedImageIds the same way
      if (car.processedImageIds && Array.isArray(car.processedImageIds)) {
        const cleanedProcessedIds = [];

        for (const imageId of car.processedImageIds) {
          if (typeof imageId === "string") {
            if (ObjectId.isValid(imageId)) {
              const objectId = new ObjectId(imageId);
              const imageExists = await imagesCollection.findOne({
                _id: objectId,
              });

              if (imageExists) {
                cleanedProcessedIds.push(objectId);
                console.log(
                  `   ✅ Converting processed imageId "${imageId}" to ObjectId`
                );
              } else {
                console.log(
                  `   ❌ Processed image "${imageId}" doesn't exist, removing`
                );
                carHasChanges = true;
              }
            } else {
              console.log(
                `   ❌ Invalid processed imageId format "${imageId}", removing`
              );
              carHasChanges = true;
            }
          } else if (imageId instanceof ObjectId) {
            const imageExists = await imagesCollection.findOne({
              _id: imageId,
            });
            if (imageExists) {
              cleanedProcessedIds.push(imageId);
            } else {
              console.log(
                `   ❌ Processed ObjectId "${imageId}" doesn't exist, removing`
              );
              carHasChanges = true;
            }
          }
        }

        if (cleanedProcessedIds.length !== car.processedImageIds.length) {
          carHasChanges = true;
        }
      }

      // Update the car if changes are needed
      if (carHasChanges || cleanedImageIds.length !== car.imageIds.length) {
        const updateDoc = {
          imageIds: cleanedImageIds,
          updatedAt: new Date().toISOString(),
        };

        if (car.processedImageIds) {
          const cleanedProcessedIds = [];
          for (const imageId of car.processedImageIds) {
            if (typeof imageId === "string" && ObjectId.isValid(imageId)) {
              const objectId = new ObjectId(imageId);
              const imageExists = await imagesCollection.findOne({
                _id: objectId,
              });
              if (imageExists) {
                cleanedProcessedIds.push(objectId);
              }
            } else if (imageId instanceof ObjectId) {
              const imageExists = await imagesCollection.findOne({
                _id: imageId,
              });
              if (imageExists) {
                cleanedProcessedIds.push(imageId);
              }
            }
          }
          updateDoc.processedImageIds = cleanedProcessedIds;
        }

        await carsCollection.updateOne({ _id: car._id }, { $set: updateDoc });

        console.log(`   ✅ Updated car ${car._id}`);
        console.log(
          `      - ImageIds: ${car.imageIds.length} → ${cleanedImageIds.length}`
        );
        if (car.processedImageIds) {
          console.log(
            `      - ProcessedImageIds: ${car.processedImageIds.length} → ${updateDoc.processedImageIds.length}`
          );
        }
      } else {
        console.log(`   ✅ No changes needed for car ${car._id}`);
      }
    }

    console.log(`\n🎉 Cleanup completed!`);
    console.log(`📊 Summary:`);
    console.log(`   - Cars processed: ${carsWithStringIds.length}`);
    console.log(`   - String IDs found: ${totalStringIds}`);
    console.log(`   - Successfully converted: ${totalConverted}`);
    console.log(`   - Removed (orphaned): ${totalRemoved}`);

    // Final verification
    console.log(`\n🔍 Final verification...`);
    const remainingStringIds = await carsCollection
      .find({
        imageIds: { $elemMatch: { $type: "string" } },
      })
      .toArray();

    console.log(
      `✅ Remaining cars with string imageIds: ${remainingStringIds.length}`
    );

    if (remainingStringIds.length === 0) {
      console.log(
        "🎊 SUCCESS: All orphaned string imageIds have been cleaned up!"
      );
    }
  } catch (error) {
    console.error("❌ Cleanup failed:", error);
  } finally {
    if (client) {
      await client.close();
      console.log("🔗 MongoDB connection closed");
    }
  }
}

// Run the cleanup if this file is executed directly
if (require.main === module) {
  cleanupOrphanedStringIds()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("Script failed:", error);
      process.exit(1);
    });
}

module.exports = { cleanupOrphanedStringIds };
