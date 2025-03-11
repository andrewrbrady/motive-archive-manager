import { MongoClient, ObjectId } from "mongodb";

// Connection URI will be provided by environment variables
let uri;
let dbName;

// Create a new MongoClient
let client;

export async function standardizeRawAssets(mongoUri, mongoDbName) {
  // Set connection parameters from arguments or environment variables
  uri = mongoUri || process.env.MONGODB_URI;
  dbName = mongoDbName || process.env.MONGODB_DB || "motive_archive";

  if (!uri) {
    throw new Error(
      "MongoDB URI is required. Provide it as an argument or set MONGODB_URI environment variable."
    );
  }

  client = new MongoClient(uri);

  try {
    // Connect to the MongoDB server
    await client.connect();
    console.log("Connected to MongoDB server");

    // Get the database and collection
    const db = client.db(dbName);
    const rawAssetsCollection = db.collection("raw_assets");

    // Find all raw assets that have both carIds and cars fields
    const assetsWithBothFields = await rawAssetsCollection
      .find({
        $and: [
          { cars: { $exists: true, $ne: [] } },
          { $or: [{ carIds: { $exists: false } }, { carIds: { $eq: [] } }] },
        ],
      })
      .toArray();

    console.log(
      `Found ${assetsWithBothFields.length} assets with 'cars' field but missing or empty 'carIds'`
    );

    // Update documents where carIds is missing but cars exists
    let updatedCount = 0;
    for (const asset of assetsWithBothFields) {
      // Extract car IDs from the cars array
      const carIds = asset.cars.map((car) => {
        // Handle both string IDs and ObjectId instances
        const id = car._id.toString ? car._id.toString() : car._id;
        return new ObjectId(id);
      });

      // Update the document to set carIds and remove cars
      const result = await rawAssetsCollection.updateOne(
        { _id: asset._id },
        {
          $set: { carIds: carIds },
          $currentDate: { updatedAt: true },
        }
      );

      if (result.modifiedCount > 0) {
        updatedCount++;
      }
    }

    console.log(`Updated carIds for ${updatedCount} assets`);

    // Now remove the cars field from all documents
    const removeResult = await rawAssetsCollection.updateMany(
      { cars: { $exists: true } },
      {
        $unset: { cars: "" },
        $currentDate: { updatedAt: true },
      }
    );

    console.log(
      `Removed 'cars' field from ${removeResult.modifiedCount} assets`
    );

    // Verify the results
    const remainingWithCars = await rawAssetsCollection.countDocuments({
      cars: { $exists: true },
    });

    console.log(`Remaining assets with 'cars' field: ${remainingWithCars}`);

    return {
      processedCount: assetsWithBothFields.length,
      updatedCount: updatedCount,
      removedCarsField: removeResult.modifiedCount,
      remainingWithCars: remainingWithCars,
    };
  } finally {
    // Close the connection
    await client.close();
    console.log("MongoDB connection closed");
  }
}
