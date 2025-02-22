import { MongoClient, ObjectId } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB || "motive_archive";

if (!MONGODB_URI) {
  throw new Error("Please add your Mongo URI to .env.local");
}

interface Make {
  _id: ObjectId;
  name: string;
  country_of_origin: string;
  founded: number;
  type: string[];
  parent_company: string;
  created_at: Date;
  updated_at: Date;
  active: boolean;
}

interface Car {
  _id: ObjectId;
  make: string;
  model: string;
  year: number;
  [key: string]: any;
}

async function validateCarMakes() {
  const client = new MongoClient(MONGODB_URI as string);

  try {
    await client.connect();
    const db = client.db(DB_NAME);
    const makesCollection = db.collection<Make>("makes");
    const carsCollection = db.collection<Car>("cars");

    // Get all active makes
    const makes = await makesCollection.find({ active: true }).toArray();
    const makeNameMap = new Map<string, string>();

    // Create a map of normalized names to correct names
    makes.forEach((make) => {
      makeNameMap.set(make.name.toLowerCase().trim(), make.name);
      // Add common variations
      if (make.name === "Mercedes-Benz") {
        makeNameMap.set("mercedes", make.name);
      }
      if (make.name === "McLaren") {
        makeNameMap.set("mclaren/mercedes", make.name);
      }
    });

    // Find all cars with non-matching make names
    const cars = await carsCollection.find({}).toArray();
    const carsToUpdate: { id: ObjectId; oldMake: string; newMake: string }[] =
      [];
    const unmatchedMakes = new Set<string>();

    cars.forEach((car) => {
      if (!car.make) {
        console.log(`Car ${car._id} has no make specified`);
        return;
      }

      const normalizedMake = car.make.toLowerCase().trim();
      const correctMake = makeNameMap.get(normalizedMake);

      if (!correctMake) {
        unmatchedMakes.add(car.make);
      } else if (correctMake !== car.make) {
        carsToUpdate.push({
          id: car._id,
          oldMake: car.make,
          newMake: correctMake,
        });
      }
    });

    // Report findings
    console.log("\nValidation Results:");
    console.log("------------------");
    console.log(`Total cars checked: ${cars.length}`);
    console.log(`Cars needing make updates: ${carsToUpdate.length}`);
    console.log(`Unmatched makes found: ${unmatchedMakes.size}`);

    if (unmatchedMakes.size > 0) {
      console.log("\nUnmatched makes:");
      console.log(Array.from(unmatchedMakes).sort());
      console.log(
        "\nPlease run validate_makes.ts first to add these makes to the makes collection."
      );
    }

    if (carsToUpdate.length > 0) {
      console.log("\nCars to update:");
      carsToUpdate.forEach(({ oldMake, newMake }) => {
        console.log(`${oldMake} -> ${newMake}`);
      });

      // Prompt for confirmation
      console.log("\nWould you like to update these cars? (y/n)");
      process.stdin.resume();
      process.stdin.setEncoding("utf8");

      process.stdin.once("data", async (data) => {
        const answer = data.toString().trim().toLowerCase();
        if (answer === "y") {
          console.log("\nUpdating cars...");
          let updatedCount = 0;

          for (const { id, newMake } of carsToUpdate) {
            try {
              await carsCollection.updateOne(
                { _id: id },
                {
                  $set: {
                    make: newMake,
                    updated_at: new Date(),
                  },
                }
              );
              updatedCount++;
            } catch (error) {
              console.error(`Error updating car ${id}:`, error);
            }
          }

          console.log(`\nSuccessfully updated ${updatedCount} cars`);
        } else {
          console.log("\nUpdate cancelled");
        }
        process.exit(0);
      });
    } else if (unmatchedMakes.size === 0) {
      console.log("\nAll car makes are valid!");
      process.exit(0);
    }
  } catch (error) {
    console.error("Error validating car makes:", error);
    process.exit(1);
  }
}

validateCarMakes().catch(console.error);
