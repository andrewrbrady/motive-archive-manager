// Migration script to convert primaryImageId strings to ObjectIds
import { MongoClient, ObjectId, Document } from "mongodb";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB || "motive_archive";

if (!MONGODB_URI) {
  console.error("MONGODB_URI is not defined in the environment variables");
  process.exit(1);
}

interface Car {
  _id: ObjectId;
  primaryImageId: string | ObjectId;
  make: string;
  model: string;
}

async function migratePrimaryImageIds(): Promise<void> {
  let client: MongoClient | undefined;

  try {
    console.log("Connecting to MongoDB...");
    client = new MongoClient(MONGODB_URI as string);

    await client.connect();
    console.log("Connected to MongoDB");

    const db = client.db(DB_NAME);
    const carsCollection = db.collection("cars");

    // Find all cars that have a primaryImageId that is a string (not already an ObjectId)
    // Using Document type to avoid TypeScript errors with MongoDB operators
    const query = {
      primaryImageId: {
        $exists: true,
        $type: "string" as const, // Specify literal type to avoid type error
        $ne: "", // Exclude empty strings
      },
    } as Document;

    // Get count of affected documents
    const count = await carsCollection.countDocuments(query);
    console.log(`Found ${count} cars with string primaryImageId values`);

    if (count === 0) {
      console.log("No cars need migration. Exiting.");
      return;
    }

    // Get all cars that need migration
    const carsToMigrate = await carsCollection.find<Car>(query).toArray();
    console.log("Starting migration...");

    let successCount = 0;
    let errorCount = 0;

    // Process each car document
    for (const car of carsToMigrate) {
      try {
        // Check if the primaryImageId is a valid ObjectId
        if (
          typeof car.primaryImageId !== "string" ||
          !ObjectId.isValid(car.primaryImageId)
        ) {
          console.warn(
            `Invalid ObjectId format for car ${car._id}: ${car.primaryImageId}`
          );
          errorCount++;
          continue;
        }

        // Convert string to ObjectId
        const result = await carsCollection.updateOne(
          { _id: car._id },
          {
            $set: {
              primaryImageId: new ObjectId(car.primaryImageId as string),
            },
          }
        );

        if (result.modifiedCount === 1) {
          successCount++;
          if (successCount % 100 === 0) {
            console.log(`Processed ${successCount} cars...`);
          }
        } else {
          console.warn(
            `Failed to update car ${car._id} (${car.make} ${car.model})`
          );
          errorCount++;
        }
      } catch (error) {
        console.error(`Error processing car ${car._id}:`, error);
        errorCount++;
      }
    }

    console.log("\nMigration complete:");
    console.log(`- ${successCount} cars successfully migrated`);
    console.log(`- ${errorCount} cars failed to migrate`);
  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    if (client) {
      await client.close();
      console.log("MongoDB connection closed");
    }
  }
}

// Run the migration
migratePrimaryImageIds().catch(console.error);
