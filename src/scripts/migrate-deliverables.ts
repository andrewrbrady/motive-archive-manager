import { getDatabase } from "../lib/mongodb";
import { ObjectId, Db } from "mongodb";

interface Deliverable {
  _id: ObjectId;
  car_id: ObjectId;
}

interface DeliverablesByCarId {
  [key: string]: ObjectId[];
}

async function migrateDeliverables() {
  try {
    const db = await getDatabase();
    console.log("Connected to database");

    // Get all deliverables
    const deliverables = await db
      .collection<Deliverable>("deliverables")
      .find({})
      .toArray();
    console.log(`Found ${deliverables.length} deliverables`);

    // First, ensure all cars have a deliverableIds array
    await db
      .collection("cars")
      .updateMany(
        { deliverableIds: { $exists: false } },
        { $set: { deliverableIds: [] } }
      );
    console.log("Initialized deliverableIds array for all cars");

    // Group deliverables by car_id
    const deliverablesByCarId = deliverables.reduce<DeliverablesByCarId>(
      (acc, deliverable) => {
        const carId = deliverable.car_id.toString();
        if (!acc[carId]) {
          acc[carId] = [];
        }
        acc[carId].push(deliverable._id);
        return acc;
      },
      {}
    );

    // Update each car with its deliverable references
    for (const [carId, deliverableIds] of Object.entries(deliverablesByCarId)) {
      await db.collection("cars").updateOne(
        { _id: new ObjectId(carId) },
        {
          $set: {
            deliverableIds: deliverableIds,
          },
        }
      );
      console.log(
        `Updated car ${carId} with ${deliverableIds.length} deliverable references`
      );
    }

    // Create an index on car_id for better query performance
    await db.collection("deliverables").createIndex({ car_id: 1 });
    console.log("Created index on deliverables.car_id");

    console.log("Migration completed successfully");
    process.exit(0);
  } catch (error) {
    console.error("Error during migration:", error);
    process.exit(1);
  }
}

// Run the migration
migrateDeliverables();
