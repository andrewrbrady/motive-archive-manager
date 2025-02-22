import { MongoClient } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB || "motive_archive";

if (!MONGODB_URI) {
  throw new Error("Please add your Mongo URI to .env.local");
}

function extractNumber(value: string): number | null {
  const match = value.match(/(\d+)/);
  return match ? Number(match[1]) : null;
}

function convertWeight(weight: any): { value: number; unit: string } | null {
  if (typeof weight === "number") {
    return { value: weight, unit: "lbs" };
  }
  if (typeof weight === "object" && weight !== null) {
    if (weight.curb_weight) {
      return {
        value: weight.curb_weight.value,
        unit: weight.curb_weight.unit,
      };
    }
    if (weight.value && weight.unit) {
      return weight;
    }
  }
  if (typeof weight === "string") {
    const num = extractNumber(weight);
    if (num) {
      return {
        value: num,
        unit: weight.toLowerCase().includes("kg") ? "kg" : "lbs",
      };
    }
  }
  return null;
}

function extractHorsepower(value: any): number | null {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string") {
    return extractNumber(value);
  }
  return null;
}

async function migrateMeasurements() {
  const client = new MongoClient(MONGODB_URI as string);

  try {
    await client.connect();
    const db = client.db(DB_NAME);
    const carsCollection = db.collection("cars");

    console.log("\nStarting measurement field migration...");

    // First, find all documents that need migration
    const docsToMigrate = await carsCollection
      .find({
        $or: [{ horsepower: { $exists: true } }, { weight: { $exists: true } }],
      })
      .toArray();

    console.log(`Found ${docsToMigrate.length} documents to migrate`);

    // Process each document
    let migratedCount = 0;
    let skippedDocs = [];

    for (const doc of docsToMigrate) {
      const update: any = {
        $unset: {},
      };

      let skipReason = "";

      // Handle horsepower migration
      if (doc.horsepower !== undefined) {
        const hp = extractHorsepower(doc.horsepower);
        if (hp !== null) {
          update.$set = {
            "engine.power": {
              hp: hp,
              kW: doc.engine?.power?.kW ?? Math.round(hp * 0.7457 * 100) / 100,
              ps: doc.engine?.power?.ps ?? Math.round(hp * 1.01387 * 100) / 100,
            },
          };
          update.$unset.horsepower = "";
        } else {
          skipReason = `Could not extract horsepower from value: ${JSON.stringify(
            doc.horsepower
          )}`;
        }
      }

      // Handle weight migration
      if (doc.weight !== undefined) {
        const weightData = convertWeight(doc.weight);
        if (weightData) {
          update.$set = {
            ...update.$set,
            "dimensions.weight": weightData,
          };
          update.$unset.weight = "";
        } else {
          skipReason = skipReason
            ? `${skipReason}, Could not convert weight: ${JSON.stringify(
                doc.weight
              )}`
            : `Could not convert weight: ${JSON.stringify(doc.weight)}`;
        }
      }

      // Only update if we have changes
      if (Object.keys(update.$set || {}).length > 0) {
        try {
          await carsCollection.updateOne({ _id: doc._id }, update);
          migratedCount++;
          console.log(`Successfully migrated document ${doc._id}:`, update);
        } catch (error) {
          skipReason = `Update failed: ${
            error instanceof Error ? error.message : String(error)
          }`;
          skippedDocs.push({ id: doc._id, reason: skipReason });
        }
      } else if (skipReason) {
        skippedDocs.push({ id: doc._id, reason: skipReason });
      }
    }

    console.log(`\nSuccessfully migrated ${migratedCount} documents`);

    if (skippedDocs.length > 0) {
      console.log("\nSkipped documents:");
      skippedDocs.forEach((doc) => {
        console.log(`ID: ${doc.id}, Reason: ${doc.reason}`);
      });
    }

    // Verify the migration
    const remainingDocs = await carsCollection
      .find({
        $or: [{ horsepower: { $exists: true } }, { weight: { $exists: true } }],
      })
      .toArray();

    console.log(
      `\nVerification: ${remainingDocs.length} documents still have old measurement fields`
    );

    if (remainingDocs.length > 0) {
      console.log("\nRemaining documents sample:");
      remainingDocs.slice(0, 3).forEach((doc) => {
        console.log(`\nID: ${doc._id}`);
        if (doc.horsepower !== undefined)
          console.log("Horsepower:", doc.horsepower);
        if (doc.weight !== undefined) console.log("Weight:", doc.weight);
      });
    }

    // Show a sample of migrated data
    const sample = await carsCollection.findOne({
      $or: [
        { "engine.power.hp": { $exists: true } },
        { "dimensions.weight": { $exists: true } },
      ],
    });

    if (sample) {
      console.log("\nSample of migrated data:");
      console.log("Engine power:", sample.engine?.power);
      console.log("Dimensions weight:", sample.dimensions?.weight);
    }
  } catch (error) {
    console.error("Error migrating measurements:", error);
  } finally {
    await client.close();
  }
}

migrateMeasurements().catch(console.error);
