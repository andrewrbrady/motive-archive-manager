import { MongoClient, ObjectId } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB || "motive_archive";

if (!MONGODB_URI) {
  throw new Error("Please add your Mongo URI to .env.local");
}

async function sanitizeClientIds() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log("\n=== Starting Client ID Sanitization ===");

    const db = client.db(DB_NAME);
    const carsCollection = db.collection("cars");

    // Find all cars where client is a string
    const stringClientCars = await carsCollection
      .find({
        client: { $type: "string" },
      })
      .toArray();

    console.log(
      `\nFound ${stringClientCars.length} cars with string client IDs`
    );

    if (stringClientCars.length === 0) {
      console.log("No cars need sanitization!");
      return;
    }

    // Process each car
    let successCount = 0;
    let failureCount = 0;
    let invalidCount = 0;

    console.log("\nProcessing cars...");

    for (const car of stringClientCars) {
      try {
        if (!car.client) {
          console.log(`Skipping car ${car._id} - null or empty client ID`);
          continue;
        }

        // Verify the client ID is valid
        if (!ObjectId.isValid(car.client)) {
          console.log(
            `Invalid client ID format for car ${car._id}: ${car.client}`
          );
          invalidCount++;
          continue;
        }

        // Convert to ObjectId
        const result = await carsCollection.updateOne(
          { _id: car._id },
          {
            $set: {
              client: new ObjectId(car.client),
              updatedAt: new Date(),
            },
          }
        );

        if (result.modifiedCount > 0) {
          successCount++;
        } else {
          failureCount++;
          console.log(`Failed to update car ${car._id}`);
        }
      } catch (error) {
        failureCount++;
        console.error(`Error processing car ${car._id}:`, error);
      }
    }

    // Print summary
    console.log("\n=== Sanitization Complete ===");
    console.log(`Total cars processed: ${stringClientCars.length}`);
    console.log(`Successfully converted: ${successCount}`);
    console.log(`Failed to convert: ${failureCount}`);
    console.log(`Invalid client IDs: ${invalidCount}`);

    // Verify results
    const remainingStringClients = await carsCollection.countDocuments({
      client: { $type: "string" },
    });

    console.log(
      `\nRemaining cars with string client IDs: ${remainingStringClients}`
    );
  } catch (error) {
    console.error("Error during sanitization:", error);
  } finally {
    await client.close();
  }
}

sanitizeClientIds().catch(console.error);
