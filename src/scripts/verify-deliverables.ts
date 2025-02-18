import { getDatabase } from "../lib/mongodb";
import { ObjectId } from "mongodb";

interface Car {
  _id: ObjectId;
  deliverableIds: ObjectId[];
}

interface Deliverable {
  _id: ObjectId;
  car_id: ObjectId;
}

async function verifyDeliverables() {
  try {
    const db = await getDatabase();
    console.log("Connected to database");

    // 1. Check all cars have deliverableIds array
    const carsWithoutArray = await db
      .collection("cars")
      .countDocuments({ deliverableIds: { $exists: false } });

    console.log(`Cars missing deliverableIds array: ${carsWithoutArray}`);

    // 2. Get all deliverables
    const deliverables = await db
      .collection<Deliverable>("deliverables")
      .find({})
      .toArray();
    console.log(`Total deliverables: ${deliverables.length}`);

    // 3. Get all cars with their deliverable references
    const cars = await db.collection<Car>("cars").find({}).toArray();
    console.log(`Total cars: ${cars.length}`);

    // 4. Count total references
    const totalReferences = cars.reduce(
      (sum, car) => sum + (car.deliverableIds?.length || 0),
      0
    );
    console.log(`Total deliverable references: ${totalReferences}`);

    // 5. Verify each deliverable is referenced
    const referencedDeliverableIds = new Set(
      cars.flatMap(
        (car) => car.deliverableIds?.map((id) => id.toString()) || []
      )
    );

    const unreferencedDeliverables = deliverables.filter(
      (d) => !referencedDeliverableIds.has(d._id.toString())
    );

    if (unreferencedDeliverables.length > 0) {
      console.error("\nFound unreferenced deliverables:");
      unreferencedDeliverables.forEach((d) => {
        console.error(`- Deliverable ${d._id} (car_id: ${d.car_id})`);
      });
    } else {
      console.log("\nAll deliverables are properly referenced");
    }

    // 6. Verify each reference points to a real deliverable
    const deliverableIds = new Set(deliverables.map((d) => d._id.toString()));

    const invalidReferences = cars.flatMap((car) =>
      (car.deliverableIds || [])
        .filter((id) => !deliverableIds.has(id.toString()))
        .map((id) => ({ carId: car._id, deliverableId: id }))
    );

    if (invalidReferences.length > 0) {
      console.error("\nFound invalid references:");
      invalidReferences.forEach((ref) => {
        console.error(
          `- Car ${ref.carId} references non-existent deliverable ${ref.deliverableId}`
        );
      });
    } else {
      console.log("\nAll references are valid");
    }

    process.exit(0);
  } catch (error) {
    console.error("Error during verification:", error);
    process.exit(1);
  }
}

verifyDeliverables();
