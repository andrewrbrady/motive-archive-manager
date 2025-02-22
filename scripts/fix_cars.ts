import { MongoClient, ObjectId } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB || "motive_archive";

if (!MONGODB_URI) {
  throw new Error("Please add your Mongo URI to .env.local");
}

interface PriceHistory {
  listPrice: number | null;
  soldPrice?: number | null;
  priceHistory: Array<{
    type: "list" | "sold";
    price: number | null;
    date: string;
    notes?: string;
  }>;
}

interface Car {
  _id: ObjectId;
  make: string;
  model: string;
  year: number | null;
  price: number | string | PriceHistory;
  list_price?: number | string;
  sold_price?: number | string;
  mileage: {
    value: number | null;
    unit: string;
  };
  status?: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  color?: string | null;
  interior_color?: string | null;
  images?: Array<{
    url: string;
    [key: string]: any;
  }>;
  engine: {
    power: {
      hp: number | null;
      kW: number | null;
      ps: number | null;
    };
  };
  dimensions: {
    weight: {
      value: number | null;
      unit: string;
    };
  };
  [key: string]: any;
}

async function fixCars() {
  const client = new MongoClient(MONGODB_URI as string);

  try {
    await client.connect();
    const db = client.db(DB_NAME);
    const carsCollection = db.collection<Car>("cars");

    console.log("\nStarting car data fixes...");

    // 1. Fix price structures
    const carsToMigrate = await carsCollection
      .find({
        $or: [
          { price: { $exists: false } },
          { price: { $type: "double" } },
          { price: { $type: "string" } },
          {
            $and: [
              { price: { $exists: true } },
              {
                $or: [
                  { "price.listPrice": { $exists: false } },
                  { "price.priceHistory": { $exists: false } },
                  { "price.priceHistory": { $not: { $type: "array" } } },
                ],
              },
            ],
          },
        ],
      })
      .toArray();

    console.log(
      `\nFound ${carsToMigrate.length} cars needing price structure updates`
    );
    let priceFixCount = 0;

    for (const car of carsToMigrate) {
      const priceHistory: PriceHistory = {
        listPrice: null,
        soldPrice: null,
        priceHistory: [],
      };

      // Convert existing price fields
      const currentPrice =
        typeof car.price === "string"
          ? car.price === "P.O.A."
            ? null
            : parseFloat(car.price)
          : typeof car.price === "number"
          ? car.price
          : typeof car.price?.listPrice === "number"
          ? car.price.listPrice
          : null;

      const listPrice =
        typeof car.list_price === "string"
          ? car.list_price === "P.O.A."
            ? null
            : parseFloat(car.list_price)
          : typeof car.list_price === "number"
          ? car.list_price
          : currentPrice;

      const soldPrice =
        typeof car.sold_price === "string"
          ? car.sold_price === "P.O.A."
            ? null
            : parseFloat(car.sold_price)
          : typeof car.sold_price === "number"
          ? car.sold_price
          : car.status === "sold"
          ? currentPrice
          : null;

      // Set current list price
      priceHistory.listPrice = listPrice;

      // Set sold price if status is 'sold'
      if (car.status === "sold") {
        priceHistory.soldPrice = soldPrice;
      }

      // Add price history entries
      if (listPrice !== null) {
        priceHistory.priceHistory.push({
          type: "list",
          price: listPrice,
          date:
            car.createdAt instanceof Date
              ? car.createdAt.toISOString()
              : typeof car.createdAt === "string"
              ? car.createdAt
              : new Date().toISOString(),
        });
      }

      if (soldPrice !== null && car.status === "sold") {
        priceHistory.priceHistory.push({
          type: "sold",
          price: soldPrice,
          date:
            car.updatedAt instanceof Date
              ? car.updatedAt.toISOString()
              : typeof car.updatedAt === "string"
              ? car.updatedAt
              : new Date().toISOString(),
        });
      }

      // Ensure we have at least one price history entry
      if (
        priceHistory.priceHistory.length === 0 &&
        priceHistory.listPrice !== null
      ) {
        priceHistory.priceHistory.push({
          type: "list",
          price: priceHistory.listPrice,
          date: new Date().toISOString(),
        });
      }

      // Update the document with new price structure
      const updateResult = await carsCollection.updateOne(
        { _id: car._id },
        {
          $set: { price: priceHistory },
          $unset: {
            list_price: "",
            sold_price: "",
            market_average: "",
            reserve_price: "",
          },
        }
      );

      if (updateResult.modifiedCount > 0) {
        priceFixCount++;
      }
    }

    console.log(`Fixed ${priceFixCount} documents with price structure issues`);

    // 2. Fix type mismatches
    console.log("\nFixing type mismatches...");

    // Fix color fields
    const colorFixResult = await carsCollection.updateMany(
      {
        $or: [
          { color: { $exists: true, $not: { $type: "string" } } },
          { interior_color: { $exists: true, $not: { $type: "string" } } },
        ],
      },
      [
        {
          $set: {
            color: {
              $cond: {
                if: { $eq: [{ $type: "$color" }, "string"] },
                then: "$color",
                else: {
                  $cond: {
                    if: { $eq: ["$color", null] },
                    then: null,
                    else: { $toString: "$color" },
                  },
                },
              },
            },
            interior_color: {
              $cond: {
                if: { $eq: [{ $type: "$interior_color" }, "string"] },
                then: "$interior_color",
                else: {
                  $cond: {
                    if: { $eq: ["$interior_color", null] },
                    then: null,
                    else: { $toString: "$interior_color" },
                  },
                },
              },
            },
          },
        },
      ]
    );

    console.log(
      `Fixed ${colorFixResult.modifiedCount} documents with color type mismatches`
    );

    // Fix numeric fields
    const numericFixResult = await carsCollection.updateMany(
      {
        $or: [
          { doors: { $exists: true, $not: { $type: "number" } } },
          { "mileage.value": { $exists: true, $not: { $type: "number" } } },
        ],
      },
      [
        {
          $set: {
            doors: {
              $cond: {
                if: { $eq: [{ $type: "$doors" }, "number"] },
                then: "$doors",
                else: {
                  $cond: {
                    if: { $eq: ["$doors", null] },
                    then: null,
                    else: { $toInt: "$doors" },
                  },
                },
              },
            },
            "mileage.value": {
              $cond: {
                if: { $eq: [{ $type: "$mileage.value" }, "number"] },
                then: "$mileage.value",
                else: {
                  $cond: {
                    if: { $eq: ["$mileage.value", null] },
                    then: 0,
                    else: { $toInt: "$mileage.value" },
                  },
                },
              },
            },
          },
        },
      ]
    );

    console.log(
      `Fixed ${numericFixResult.modifiedCount} documents with numeric type mismatches`
    );

    // Fix date fields
    const dateFixResult = await carsCollection.updateMany(
      {
        $or: [
          { createdAt: { $not: { $type: "date" } } },
          { updatedAt: { $not: { $type: "date" } } },
        ],
      },
      [
        {
          $set: {
            createdAt: {
              $cond: {
                if: { $eq: [{ $type: "$createdAt" }, "date"] },
                then: "$createdAt",
                else: {
                  $cond: {
                    if: { $eq: ["$createdAt", null] },
                    then: new Date(),
                    else: { $toDate: "$createdAt" },
                  },
                },
              },
            },
            updatedAt: {
              $cond: {
                if: { $eq: [{ $type: "$updatedAt" }, "date"] },
                then: "$updatedAt",
                else: {
                  $cond: {
                    if: { $eq: ["$updatedAt", null] },
                    then: new Date(),
                    else: { $toDate: "$updatedAt" },
                  },
                },
              },
            },
          },
        },
      ]
    );

    console.log(
      `Fixed ${dateFixResult.modifiedCount} documents with date type mismatches`
    );

    // Fix engine power type mismatches
    console.log("\nFixing engine power type mismatches...");

    const enginePowerFixes = await carsCollection
      .aggregate([
        {
          $match: {
            $or: [
              { "engine.power.hp": "$horsepower" },
              {
                "engine.power.hp": {
                  $exists: true,
                  $not: { $type: "number" },
                  $ne: null,
                },
              },
            ],
          },
        },
        {
          $addFields: {
            "engine.power.hp": {
              $cond: {
                if: { $eq: ["$engine.power.hp", "$horsepower"] },
                then: { $toDouble: "$horsepower" },
                else: "$engine.power.hp",
              },
            },
          },
        },
      ])
      .toArray();

    console.log(
      `Found ${enginePowerFixes.length} documents with engine power type mismatches`
    );

    for (const doc of enginePowerFixes) {
      const hp =
        typeof doc.engine?.power?.hp === "number" ? doc.engine.power.hp : null;
      const kW = hp ? Math.round(hp * 0.7457 * 100) / 100 : null;
      const ps = hp ? Math.round(hp * 1.01387 * 100) / 100 : null;

      await carsCollection.updateOne(
        { _id: doc._id },
        {
          $set: {
            "engine.power": {
              hp: hp,
              kW: kW,
              ps: ps,
            },
          },
        }
      );

      console.log(`Fixed engine power for document ${doc._id}:`, {
        hp,
        kW,
        ps,
      });
    }

    // Fix dimensions weight type mismatches
    console.log("\nFixing dimensions weight type mismatches...");

    // First fix $weight placeholder values
    const placeholderWeightFixes = await carsCollection
      .find({
        "dimensions.weight.value": "$weight",
      })
      .toArray();

    console.log(
      `Found ${placeholderWeightFixes.length} documents with placeholder weight values`
    );

    for (const doc of placeholderWeightFixes) {
      const weightValue = doc.weight || null;
      await carsCollection.updateOne(
        { _id: doc._id },
        {
          $set: {
            "dimensions.weight": {
              value: weightValue,
              unit: "lbs",
            },
          },
        }
      );
      console.log(`Fixed placeholder weight for document ${doc._id}:`, {
        value: weightValue,
        unit: "lbs",
      });
    }

    // Then fix numeric weight values that need proper structure
    const numericWeightFixes = await carsCollection
      .find({
        "dimensions.weight": { $exists: true },
        "dimensions.weight.unit": { $exists: false },
      })
      .toArray();

    console.log(
      `\nFound ${numericWeightFixes.length} documents with numeric weight values`
    );

    for (const doc of numericWeightFixes) {
      const weightValue = doc.dimensions.weight;
      if (typeof weightValue === "number") {
        await carsCollection.updateOne(
          { _id: doc._id },
          {
            $set: {
              "dimensions.weight": {
                value: weightValue,
                unit: "lbs",
              },
            },
          }
        );
        console.log(`Fixed numeric weight for document ${doc._id}:`, {
          value: weightValue,
          unit: "lbs",
        });
      } else {
        console.log(
          `Skipping document ${doc._id} - weight value is not a number:`,
          weightValue
        );
      }
    }

    // Run validation to verify fixes
    console.log("\nRunning final validation...");
    const remainingIssues = await carsCollection.countDocuments({
      $or: [
        { "dimensions.weight.value": "$weight" },
        {
          "dimensions.weight.value": {
            $exists: true,
            $not: { $type: "double" },
            $ne: null,
          },
        },
      ],
    });

    console.log(
      `\nRemaining dimensions weight issues after fixes: ${remainingIssues}`
    );
  } catch (error) {
    console.error("Error fixing cars:", error);
  } finally {
    await client.close();
  }
}

fixCars().catch(console.error);
