const { MongoClient, ObjectId } = require("mongodb");

async function fixCarIds() {
  const client = new MongoClient(
    process.env.MONGODB_URI || "mongodb://localhost:27017"
  );

  try {
    await client.connect();
    const db = client.db(process.env.MONGODB_DB || "motive_archive");
    const imagesCollection = db.collection("images");
    const carsCollection = db.collection("cars");

    console.log("🔍 Starting carId migration...");

    // Step 1: Find images with string carIds (including empty strings)
    const imagesWithStringCarIds = await imagesCollection
      .find({
        carId: { $type: "string" },
      })
      .toArray();

    console.log(
      `📊 Found ${imagesWithStringCarIds.length} images with string carIds`
    );

    let fixedImages = 0;
    let orphanedImages = 0;

    for (const image of imagesWithStringCarIds) {
      console.log(`\n📸 Processing image: ${image._id}`);
      console.log(
        `   - Current carId: "${image.carId}" (${typeof image.carId})`
      );

      if (!image.carId || image.carId === "") {
        // Empty string carId - set to null
        await imagesCollection.updateOne(
          { _id: image._id },
          { $set: { carId: null } }
        );
        console.log(`   - ✅ Set empty carId to null`);
        orphanedImages++;
      } else if (ObjectId.isValid(image.carId)) {
        // Valid ObjectId string - convert to ObjectId
        const carObjectId = new ObjectId(image.carId);

        // Check if the car actually exists
        const carExists = await carsCollection.findOne({ _id: carObjectId });

        if (carExists) {
          await imagesCollection.updateOne(
            { _id: image._id },
            { $set: { carId: carObjectId } }
          );
          console.log(`   - ✅ Converted string carId to ObjectId`);
          fixedImages++;
        } else {
          // Car doesn't exist - set carId to null
          await imagesCollection.updateOne(
            { _id: image._id },
            { $set: { carId: null } }
          );
          console.log(`   - ⚠️  Car not found, set carId to null`);
          orphanedImages++;
        }
      } else {
        // Invalid ObjectId string - set to null
        await imagesCollection.updateOne(
          { _id: image._id },
          { $set: { carId: null } }
        );
        console.log(`   - ⚠️  Invalid ObjectId string, set carId to null`);
        orphanedImages++;
      }
    }

    console.log(`\n📊 Image carId migration complete:`);
    console.log(`   - Fixed: ${fixedImages} images`);
    console.log(`   - Orphaned: ${orphanedImages} images`);

    // Step 2: Fix processedImageIds in cars collection
    console.log(`\n🚗 Fixing processedImageIds in cars...`);

    const carsWithProcessedImages = await carsCollection
      .find({
        processedImageIds: { $exists: true, $ne: [] },
      })
      .toArray();

    console.log(
      `📊 Found ${carsWithProcessedImages.length} cars with processedImageIds`
    );

    let fixedCars = 0;

    for (const car of carsWithProcessedImages) {
      console.log(
        `\n🚗 Processing car: ${car._id} (${car.year} ${car.make} ${car.model})`
      );

      if (!car.processedImageIds || !Array.isArray(car.processedImageIds)) {
        console.log("   - ⏭️  No processedImageIds array, skipping");
        continue;
      }

      const validProcessedImageIds = [];
      let hasChanges = false;

      for (const imageId of car.processedImageIds) {
        if (typeof imageId === "string" && ObjectId.isValid(imageId)) {
          // Convert string to ObjectId
          const objectId = new ObjectId(imageId);

          // Check if the image actually exists and is associated with this car
          const imageExists = await imagesCollection.findOne({
            _id: objectId,
            carId: car._id,
          });

          if (imageExists) {
            validProcessedImageIds.push(objectId);
            console.log(`   - ✅ Converted string "${imageId}" to ObjectId`);
            hasChanges = true;
          } else {
            console.log(
              `   - ❌ Image "${imageId}" not found or not associated with this car`
            );
            hasChanges = true;
          }
        } else if (imageId instanceof ObjectId) {
          // Already an ObjectId - check if it exists and is associated with this car
          const imageExists = await imagesCollection.findOne({
            _id: imageId,
            carId: car._id,
          });

          if (imageExists) {
            validProcessedImageIds.push(imageId);
          } else {
            console.log(
              `   - ❌ Image "${imageId}" not found or not associated with this car`
            );
            hasChanges = true;
          }
        } else {
          console.log(`   - ❌ Invalid imageId type: ${typeof imageId}`);
          hasChanges = true;
        }
      }

      if (hasChanges) {
        await carsCollection.updateOne(
          { _id: car._id },
          { $set: { processedImageIds: validProcessedImageIds } }
        );
        console.log(
          `   - ✅ Updated processedImageIds (${car.processedImageIds.length} → ${validProcessedImageIds.length})`
        );
        fixedCars++;
      } else {
        console.log(`   - ✅ No changes needed`);
      }
    }

    console.log(`\n📊 Car processedImageIds migration complete:`);
    console.log(`   - Fixed: ${fixedCars} cars`);

    // Step 3: Rebuild processedImageIds from scratch to ensure consistency
    console.log(`\n🔄 Rebuilding processedImageIds from processed images...`);

    // First, clear all processedImageIds
    await carsCollection.updateMany(
      { processedImageIds: { $exists: true } },
      { $set: { processedImageIds: [] } }
    );

    // Find all processed images with valid carIds
    const processedImages = await imagesCollection
      .find({
        "metadata.category": "processed",
        carId: { $ne: null, $exists: true },
      })
      .toArray();

    console.log(
      `📊 Found ${processedImages.length} processed images to rebuild associations`
    );

    const carImageMap = new Map();

    for (const image of processedImages) {
      const carIdStr = image.carId.toString();
      if (!carImageMap.has(carIdStr)) {
        carImageMap.set(carIdStr, []);
      }
      carImageMap.get(carIdStr).push(image._id);
    }

    let rebuiltCars = 0;

    for (const [carIdStr, imageIds] of carImageMap) {
      const carObjectId = new ObjectId(carIdStr);

      await carsCollection.updateOne(
        { _id: carObjectId },
        { $set: { processedImageIds: imageIds } }
      );

      console.log(
        `   - ✅ Rebuilt car ${carIdStr}: ${imageIds.length} processed images`
      );
      rebuiltCars++;
    }

    console.log(`\n🎉 Migration complete!`);
    console.log(`📊 Summary:`);
    console.log(`   - Fixed ${fixedImages} image carIds`);
    console.log(`   - Orphaned ${orphanedImages} images`);
    console.log(`   - Fixed ${fixedCars} car processedImageIds`);
    console.log(`   - Rebuilt ${rebuiltCars} car associations`);
  } catch (error) {
    console.error("❌ Migration failed:", error);
  } finally {
    await client.close();
  }
}

fixCarIds();
