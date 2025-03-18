import { getDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

async function migrateCreatedAt() {
  try {
    console.log("Starting createdAt migration...");
    const db = await getDatabase();
    const carsCollection = db.collection("cars");

    // Find all documents without a createdAt field
    const cursor = carsCollection.find({ createdAt: { $exists: false } });
    const docsToUpdate = await cursor.toArray();
    console.log(
      `Found ${docsToUpdate.length} documents without createdAt field`
    );

    let updated = 0;
    for (const doc of docsToUpdate) {
      // Extract timestamp from ObjectId
      const timestamp =
        doc._id instanceof ObjectId
          ? doc._id.getTimestamp()
          : new ObjectId(doc._id).getTimestamp();

      // Update the document with the extracted timestamp
      await carsCollection.updateOne(
        { _id: doc._id },
        {
          $set: {
            createdAt: timestamp,
            updatedAt: timestamp,
          },
        }
      );
      updated++;

      if (updated % 100 === 0) {
        console.log(`Updated ${updated} documents...`);
      }
    }

    console.log(`Migration complete. Updated ${updated} documents.`);
  } catch (error) {
    console.error("Error during migration:", error);
    process.exit(1);
  }
}

// Run the migration
migrateCreatedAt();
