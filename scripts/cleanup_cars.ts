import { MongoClient, ObjectId } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB || "motive_archive";

if (!MONGODB_URI) {
  throw new Error("Please add your Mongo URI to .env.local");
}

async function cleanupCars() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    const db = client.db(DB_NAME);
    const carsCollection = db.collection("cars");

    console.log("\nStarting database cleanup...");

    // 1. Fix the car with invalid nested structure
    const invalidNestedCar = await carsCollection.findOne({
      _id: new ObjectId("67b3e329ffaa1eb47c9d1fa0"),
    });

    if (invalidNestedCar) {
      console.log("\nFixing car with invalid nested structure...");

      // Extract series and trim from engine features
      const engineFeatures = invalidNestedCar.engine?.features || [];
      let series = "";
      let trim = "";
      let cylinders = null;
      const cleanedFeatures: string[] = [];

      engineFeatures.forEach((feature: string) => {
        if (feature.startsWith("Series:")) {
          series = feature.replace("Series:", "").trim();
        } else if (feature.startsWith("Trim:")) {
          const trimValue = feature.replace("Trim:", "").trim();
          trim = trimValue
            .split(",")
            .map((t) => t.trim())
            .join(", ");
        } else if (feature.includes("cylinders")) {
          const cylinderMatch = feature.match(/(\d+)\s*cylinders/);
          if (cylinderMatch) {
            cylinders = parseInt(cylinderMatch[1], 10);
          } else {
            cleanedFeatures.push(feature);
          }
        } else {
          cleanedFeatures.push(feature);
        }
      });

      // Update the document
      await carsCollection.updateOne(
        { _id: invalidNestedCar._id },
        {
          $set: {
            "engine.features": cleanedFeatures,
            "engine.cylinders": cylinders,
            "manufacturing.series":
              series || invalidNestedCar.manufacturing?.series,
            "manufacturing.trim": trim || invalidNestedCar.manufacturing?.trim,
          },
        }
      );

      console.log("Fixed invalid nested structure");
    }

    // 2. Move standalone fields to their proper nested locations
    console.log("\nMoving standalone fields to proper locations...");

    const result = await carsCollection.updateMany(
      {
        $or: [
          { horsepower: { $exists: true } },
          { weight: { $exists: true } },
          { body_style: { $exists: true } },
        ],
      },
      {
        $set: {
          "engine.power.hp": "$horsepower",
          "dimensions.weight": {
            value: "$weight",
            unit: "lbs",
          },
          "manufacturing.bodyClass": "$body_style",
        },
        $unset: {
          horsepower: "",
          weight: "",
          body_style: "",
          fuel_capacity: "",
          has_reserve: "",
          listing_page: "",
          completion_date: "",
          delivery_date: "",
        },
      }
    );

    console.log(
      `Updated ${result.modifiedCount} documents with field relocations`
    );

    // 3. Ensure all cars have proper price structure
    console.log("\nValidating price structures...");

    const priceResult = await carsCollection.updateMany(
      {
        $or: [
          { "price.listPrice": { $exists: false } },
          { "price.priceHistory": { $exists: false } },
        ],
      },
      {
        $set: {
          "price.listPrice": null,
          "price.priceHistory": [],
        },
      }
    );

    console.log(
      `Updated ${priceResult.modifiedCount} documents with missing price structure`
    );

    // 4. Clean up clientInfo structure
    console.log("\nCleaning up clientInfo structure...");

    const clientResult = await carsCollection.updateMany(
      {
        clientInfo: { $exists: true },
        "clientInfo._id": { $exists: false },
      },
      [
        {
          $set: {
            clientInfo: {
              $cond: {
                if: { $eq: [{ $type: "$clientInfo" }, "object"] },
                then: {
                  _id: "$client",
                  name: "$clientInfo.name",
                  email: "$clientInfo.email",
                  phone: "$clientInfo.phone",
                  address: {
                    street: "",
                    city: "",
                    state: "",
                    zipCode: "",
                    country: "",
                  },
                  businessType: "dealer",
                },
                else: null,
              },
            },
          },
        },
      ]
    );

    console.log(
      `Updated ${clientResult.modifiedCount} documents with invalid clientInfo`
    );

    // Final validation
    console.log("\nRunning final validation...");
    const remainingIssues = await carsCollection.countDocuments({
      $or: [
        { horsepower: { $exists: true } },
        { weight: { $exists: true } },
        { body_style: { $exists: true } },
        { "price.listPrice": { $exists: false } },
        { "price.priceHistory": { $exists: false } },
        {
          $and: [
            { clientInfo: { $exists: true } },
            { "clientInfo._id": { $exists: false } },
          ],
        },
      ],
    });

    console.log(`\nRemaining issues after cleanup: ${remainingIssues}`);
  } catch (error) {
    console.error("Error cleaning up cars:", error);
  } finally {
    await client.close();
  }
}

cleanupCars().catch(console.error);
