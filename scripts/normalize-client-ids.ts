import { MongoClient, ObjectId } from "mongodb";

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB || "motive_archive";

if (!MONGODB_URI) {
  throw new Error("Please add your Mongo URI to .env");
}

async function normalizeClientIds() {
  const client = new MongoClient(MONGODB_URI as string);

  try {
    console.log("Connecting to MongoDB...");
    await client.connect();
    const db = client.db(DB_NAME);
    const carsCollection = db.collection("cars");

    // Find all cars where client is a string type
    const carsWithStringClient = await carsCollection
      .find({
        client: { $type: "string" },
      })
      .toArray();

    console.log(
      `Found ${carsWithStringClient.length} cars with string client IDs`
    );

    let successCount = 0;
    let errorCount = 0;

    // Process each car
    for (const car of carsWithStringClient) {
      try {
        // Convert string to ObjectId
        const clientObjectId = new ObjectId(car.client);

        // Update the document
        await carsCollection.updateOne(
          { _id: car._id },
          { $set: { client: clientObjectId } }
        );

        successCount++;
        console.log(`Successfully updated car ${car._id}`);
      } catch (error) {
        errorCount++;
        console.error(`Error updating car ${car._id}:`, error);
      }
    }

    console.log("\nNormalization complete!");
    console.log(`Successfully updated: ${successCount} cars`);
    console.log(`Failed to update: ${errorCount} cars`);
  } catch (error) {
    console.error("Error during normalization:", error);
  } finally {
    await client.close();
  }
}

// Run the script
normalizeClientIds().catch(console.error);
