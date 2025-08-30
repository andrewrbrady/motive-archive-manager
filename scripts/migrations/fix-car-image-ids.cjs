#!/usr/bin/env node
/**
 * Migration: Normalize cars.imageIds and primaryImageId to ObjectId
 * - Converts string hex IDs to ObjectId
 * - Removes embedded images/categorizedImages fields from car documents
 * - Optionally converts client to ObjectId when valid
 *
 * Usage:
 *   MONGODB_URI="mongodb+srv://..." MONGODB_DB="motive_archive" node scripts/migrations/fix-car-image-ids.cjs
 */
const { MongoClient, ObjectId } = require("mongodb");

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME =
  process.env.MONGODB_DB || process.env.DB_NAME || "motive_archive";

if (!MONGODB_URI) {
  console.error("Missing MONGODB_URI env var");
  process.exit(1);
}

async function run() {
  const client = new MongoClient(MONGODB_URI, {
    connectTimeoutMS: 10000,
    socketTimeoutMS: 45000,
  });
  await client.connect();
  const db = client.db(DB_NAME);
  const cars = db.collection("cars");

  let processed = 0;
  let modified = 0;

  const cursor = cars.find(
    {},
    {
      projection: {
        _id: 1,
        imageIds: 1,
        primaryImageId: 1,
        client: 1,
        images: 1,
        categorizedImages: 1,
      },
    }
  );
  while (await cursor.hasNext()) {
    const car = await cursor.next();
    const updates = {};
    let needsUpdate = false;

    // imageIds -> ObjectId[]
    if (Array.isArray(car.imageIds)) {
      const newImageIds = car.imageIds
        .map((id) => {
          if (!id) return null;
          if (id instanceof ObjectId) return id;
          if (typeof id === "string" && ObjectId.isValid(id))
            return new ObjectId(id);
          return null;
        })
        .filter(Boolean);
      // Only update if something changes in length or type
      const changed =
        newImageIds.length !== car.imageIds.length ||
        car.imageIds.some((v) => typeof v === "string");
      if (changed) {
        updates.imageIds = newImageIds;
        needsUpdate = true;
      }
    }

    // primaryImageId -> ObjectId
    if (car.primaryImageId) {
      const id = car.primaryImageId;
      if (typeof id === "string" && ObjectId.isValid(id)) {
        updates.primaryImageId = new ObjectId(id);
        needsUpdate = true;
      }
    }

    // client -> ObjectId
    if (
      car.client &&
      typeof car.client === "string" &&
      ObjectId.isValid(car.client)
    ) {
      updates.client = new ObjectId(car.client);
      needsUpdate = true;
    }

    // Remove embedded images / categorizedImages
    if (car.images || car.categorizedImages) {
      updates.$unset = {};
      if (car.images) updates.$unset.images = "";
      if (car.categorizedImages) updates.$unset.categorizedImages = "";
      needsUpdate = true;
    }

    if (needsUpdate) {
      const updateQuery = {};

      // Separate $set and $unset operations
      const { $unset, ...setUpdates } = updates;

      if (Object.keys(setUpdates).length > 0) {
        updateQuery.$set = setUpdates;
      }

      if ($unset) {
        updateQuery.$unset = $unset;
      }

      await cars.updateOne({ _id: car._id }, updateQuery);
      modified++;
    }
    processed++;
    if (processed % 200 === 0) {
      console.log(`Processed ${processed} cars, modified ${modified}`);
    }
  }

  console.log(`Done. Processed ${processed}, modified ${modified}`);
  await client.close();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
