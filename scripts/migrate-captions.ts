const { MongoClient, ObjectId } = require("mongodb");
const dotenv = require("dotenv");

dotenv.config({ path: ".env.local" });

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = "motive_archive";

interface Caption {
  _id: typeof ObjectId;
  carId: typeof ObjectId | string;
  platform: string;
  context: string;
  caption: string;
  createdAt: Date;
}

async function migrateCaptions() {
  if (!MONGODB_URI) {
    console.error("Error: MONGODB_URI is not defined in .env.local");
    process.exit(1);
  }

  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log("Connected to MongoDB Atlas");

    const db = client.db(DB_NAME);
    const captions = db.collection("captions");

    // Get all captions that need to be cleaned up
    const captionsToUpdate = await captions.find({}).toArray();
    console.log(`Found ${captionsToUpdate.length} captions to update`);

    let updated = 0;
    let errors = 0;

    for (const caption of captionsToUpdate) {
      try {
        // First, remove all car-related fields
        await captions.updateOne(
          { _id: caption._id },
          {
            $unset: {
              carDetails: "",
              car: "",
              clientInfo: "",
              dimensions: "",
              fuel_capacity: "",
              interior_features: "",
              performance: "",
              transmission: "",
              weight: "",
              market_average: "",
              sold_price: "",
              listing_page: "",
              has_reserve: "",
              type: "",
              documents: "",
              images: "",
              history_report: "",
              owner_id: "",
              client: "",
              make: "",
              model: "",
              year: "",
              price: "",
              mileage: "",
              engine: "",
              condition: "",
              location: "",
              description: "",
              interior_color: "",
              vin: "",
            },
          }
        );

        // Convert carId to ObjectId if it's a string
        let carId = caption.carId;
        if (typeof carId === "string") {
          try {
            carId = new ObjectId(carId);
          } catch (err) {
            console.error(
              `Invalid ObjectId format for caption ${caption._id}: ${carId}`
            );
            errors++;
            continue;
          }
        }

        // Then set only the fields we want to keep, ensuring carId is an ObjectId
        const updatedCaption = {
          carId: carId,
          platform: caption.platform,
          context: caption.context || "",
          caption: caption.caption,
          createdAt: caption.createdAt,
        };

        await captions.updateOne(
          { _id: caption._id },
          { $set: updatedCaption }
        );

        updated++;
        console.log(`Updated caption ${caption._id}`);
      } catch (err) {
        errors++;
        console.error(`Error updating caption ${caption._id}:`, err);
      }
    }

    console.log("\nMigration complete:");
    console.log(`- Total captions processed: ${captionsToUpdate.length}`);
    console.log(`- Successfully updated: ${updated}`);
    console.log(`- Errors: ${errors}`);
  } catch (err) {
    console.error("Error during migration:", err);
  } finally {
    await client.close();
  }
}

migrateCaptions();
