import { MongoClient } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB || "motive_archive";

if (!MONGODB_URI) {
  throw new Error("Please add your Mongo URI to .env.local");
}

async function validateCars() {
  const client = new MongoClient(MONGODB_URI as string);

  try {
    await client.connect();
    const db = client.db(DB_NAME);

    console.log("\nChecking for data inconsistencies in cars collection...");

    // Check for required fields with incorrect types or missing
    const requiredFieldChecks = await db
      .collection("cars")
      .find({
        $or: [
          // Check required string fields
          { make: { $not: { $type: "string" } } },
          { model: { $not: { $type: "string" } } },
          { status: { $not: { $in: ["available", "sold", "pending"] } } },

          // Check price structure
          {
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
          },

          // Check mileage structure
          {
            $or: [
              { "mileage.value": { $exists: true, $not: { $type: "number" } } },
              { "mileage.unit": { $exists: true, $not: { $type: "string" } } },
            ],
          },

          // Check dates
          { createdAt: { $not: { $type: "date" } } },
          { updatedAt: { $not: { $type: "date" } } },

          // Check array fields
          { imageIds: { $exists: true, $not: { $type: "array" } } },

          // Missing required fields
          { make: { $exists: false } },
          { model: { $exists: false } },
          { status: { $exists: false } },
        ],
      })
      .toArray();

    console.log(
      "\nDocuments with invalid required fields:",
      requiredFieldChecks.length
    );
    if (requiredFieldChecks.length > 0) {
      console.log("Sample of invalid documents:");
      requiredFieldChecks.slice(0, 3).forEach((doc) => {
        console.log(`\nID: ${doc._id}`);
        console.log("Make:", doc.make);
        console.log("Model:", doc.model);
        console.log("Year:", doc.year);
        console.log("Status:", doc.status);
        console.log("Mileage:", doc.mileage);
      });
    }

    // Check for invalid nested structures
    const nestedStructureChecks = await db
      .collection("cars")
      .find({
        $or: [
          // Check engine structure if it exists
          {
            engine: {
              $exists: true,
              $not: {
                $type: "object",
              },
            },
          },

          // Check dimensions structure if it exists
          {
            dimensions: {
              $exists: true,
              $not: {
                $type: "object",
              },
            },
          },

          // Check client info structure if it exists
          {
            clientInfo: {
              $exists: true,
              $not: {
                $type: "object",
              },
            },
          },
          {
            $and: [
              { clientInfo: { $exists: true } },
              { "clientInfo._id": { $exists: false } },
            ],
          },
        ],
      })
      .toArray();

    console.log(
      "\nDocuments with invalid nested structures:",
      nestedStructureChecks.length
    );
    if (nestedStructureChecks.length > 0) {
      console.log("Sample of documents with invalid structures:");
      nestedStructureChecks.slice(0, 3).forEach((doc) => {
        console.log(`\nID: ${doc._id}`);
        if (doc.engine) console.log("Engine:", doc.engine);
        if (doc.dimensions) console.log("Dimensions:", doc.dimensions);
        if (doc.clientInfo) console.log("Client Info:", doc.clientInfo);
      });
    }

    // Check for any unexpected fields
    const allFields = await db
      .collection("cars")
      .aggregate([
        {
          $project: {
            arrayOfKeys: { $objectToArray: "$$ROOT" },
          },
        },
        {
          $unwind: "$arrayOfKeys",
        },
        {
          $group: {
            _id: null,
            allKeys: { $addToSet: "$arrayOfKeys.k" },
          },
        },
      ])
      .toArray();

    console.log("\nAll fields present in the collection:");
    if (allFields.length > 0) {
      console.log(allFields[0].allKeys.sort());
    }

    // Additional type-specific checks
    const typeChecks = await db
      .collection("cars")
      .find({
        $or: [
          // Check for non-string VINs
          { vin: { $exists: true, $not: { $type: "string" } } },

          // Check for non-string colors
          { color: { $exists: true, $not: { $type: "string" }, $ne: null } },
          {
            interior_color: {
              $exists: true,
              $not: { $type: "string" },
              $ne: null,
            },
          },

          // Check for non-number doors
          { doors: { $exists: true, $not: { $type: "double" }, $ne: null } },

          // Check engine structure
          {
            $and: [
              { engine: { $exists: true } },
              {
                $or: [
                  {
                    "engine.type": {
                      $exists: true,
                      $not: { $type: "string" },
                      $ne: null,
                    },
                  },
                  {
                    "engine.displacement.value": {
                      $exists: true,
                      $not: { $type: "double" },
                      $ne: null,
                    },
                  },
                  {
                    "engine.power.hp": {
                      $exists: true,
                      $not: { $type: "double" },
                      $ne: null,
                    },
                  },
                ],
              },
            ],
          },

          // Check dimensions structure
          {
            $and: [
              { dimensions: { $exists: true } },
              {
                $or: [
                  {
                    "dimensions.length.value": {
                      $exists: true,
                      $not: { $type: "double" },
                      $ne: null,
                    },
                  },
                  {
                    "dimensions.width.value": {
                      $exists: true,
                      $not: { $type: "double" },
                      $ne: null,
                    },
                  },
                  {
                    "dimensions.height.value": {
                      $exists: true,
                      $not: { $type: "double" },
                      $ne: null,
                    },
                  },
                  {
                    "dimensions.weight.value": {
                      $exists: true,
                      $not: { $type: "double" },
                      $ne: null,
                    },
                  },
                ],
              },
            ],
          },

          // Check performance data
          {
            $and: [
              { performance: { $exists: true } },
              {
                $or: [
                  {
                    "performance.0_to_60_mph.value": {
                      $exists: true,
                      $not: { $type: "double" },
                      $ne: null,
                    },
                  },
                  {
                    "performance.top_speed.value": {
                      $exists: true,
                      $not: { $type: "double" },
                      $ne: null,
                    },
                  },
                ],
              },
            ],
          },

          // Check transmission data
          {
            $and: [
              { transmission: { $exists: true } },
              {
                $or: [
                  {
                    "transmission.type": {
                      $exists: true,
                      $not: { $type: "string" },
                      $ne: null,
                    },
                  },
                  {
                    "transmission.speeds": {
                      $exists: true,
                      $not: { $type: "double" },
                      $ne: null,
                    },
                  },
                ],
              },
            ],
          },

          // Check interior features
          {
            $and: [
              { interior_features: { $exists: true } },
              {
                $or: [
                  {
                    "interior_features.seats": {
                      $exists: true,
                      $not: { $type: "double" },
                      $ne: null,
                    },
                  },
                  {
                    "interior_features.features": {
                      $exists: true,
                      $not: { $type: "array" },
                    },
                  },
                ],
              },
            ],
          },

          // Check safety features
          {
            $and: [
              { safety: { $exists: true } },
              {
                $or: [
                  {
                    "safety.tpms.type": {
                      $exists: true,
                      $not: { $type: "string" },
                      $ne: null,
                    },
                  },
                  {
                    "safety.tpms.present": {
                      $exists: true,
                      $not: { $type: "bool" },
                    },
                  },
                  {
                    "safety.airbags": {
                      $exists: true,
                      $not: { $type: "array" },
                    },
                  },
                  {
                    "safety.assistSystems": {
                      $exists: true,
                      $not: { $type: "array" },
                    },
                  },
                ],
              },
            ],
          },

          // Check manufacturing data
          {
            $and: [
              { manufacturing: { $exists: true } },
              {
                $or: [
                  {
                    "manufacturing.plant.city": {
                      $exists: true,
                      $not: { $type: "string" },
                      $ne: null,
                    },
                  },
                  {
                    "manufacturing.plant.country": {
                      $exists: true,
                      $not: { $type: "string" },
                      $ne: null,
                    },
                  },
                  {
                    "manufacturing.plant.company": {
                      $exists: true,
                      $not: { $type: "string" },
                      $ne: null,
                    },
                  },
                  {
                    "manufacturing.series": {
                      $exists: true,
                      $not: { $type: "string" },
                      $ne: null,
                    },
                  },
                  {
                    "manufacturing.trim": {
                      $exists: true,
                      $not: { $type: "string" },
                      $ne: null,
                    },
                  },
                  {
                    "manufacturing.bodyClass": {
                      $exists: true,
                      $not: { $type: "string" },
                      $ne: null,
                    },
                  },
                ],
              },
            ],
          },

          // Check documents and research entries
          {
            $or: [
              { documents: { $exists: true, $not: { $type: "array" } } },
              { research_entries: { $exists: true, $not: { $type: "array" } } },
              { hasArticle: { $exists: true, $not: { $type: "bool" } } },
              {
                lastArticleUpdate: {
                  $exists: true,
                  $ne: null,
                  $not: { $type: "date" },
                },
              },
            ],
          },

          // Check various ID arrays
          {
            $or: [
              { eventIds: { $exists: true, $not: { $type: "array" } } },
              { deliverableIds: { $exists: true, $not: { $type: "array" } } },
              { captionIds: { $exists: true, $not: { $type: "array" } } },
            ],
          },
        ],
      })
      .toArray();

    console.log("\nDocuments with type mismatches:", typeChecks.length);
    if (typeChecks.length > 0) {
      // Group by field with type mismatch
      const mismatchesByField = new Map();

      typeChecks.forEach((doc) => {
        // Check each field
        if (doc.vin && typeof doc.vin !== "string") {
          mismatchesByField.set("vin", {
            count: (mismatchesByField.get("vin")?.count || 0) + 1,
            sample: mismatchesByField.get("vin")?.sample || {
              id: doc._id,
              value: doc.vin,
            },
          });
        }

        if (doc.color && typeof doc.color !== "string") {
          mismatchesByField.set("color", {
            count: (mismatchesByField.get("color")?.count || 0) + 1,
            sample: mismatchesByField.get("color")?.sample || {
              id: doc._id,
              value: doc.color,
            },
          });
        }

        if (doc.interior_color && typeof doc.interior_color !== "string") {
          mismatchesByField.set("interior_color", {
            count: (mismatchesByField.get("interior_color")?.count || 0) + 1,
            sample: mismatchesByField.get("interior_color")?.sample || {
              id: doc._id,
              value: doc.interior_color,
            },
          });
        }

        if (doc.doors && typeof doc.doors !== "number") {
          mismatchesByField.set("doors", {
            count: (mismatchesByField.get("doors")?.count || 0) + 1,
            sample: mismatchesByField.get("doors")?.sample || {
              id: doc._id,
              value: doc.doors,
            },
          });
        }

        if (doc.engine) {
          if (doc.engine.type && typeof doc.engine.type !== "string") {
            mismatchesByField.set("engine.type", {
              count: (mismatchesByField.get("engine.type")?.count || 0) + 1,
              sample: mismatchesByField.get("engine.type")?.sample || {
                id: doc._id,
                value: doc.engine.type,
              },
            });
          }

          if (
            doc.engine.displacement?.value &&
            typeof doc.engine.displacement.value !== "number"
          ) {
            mismatchesByField.set("engine.displacement", {
              count:
                (mismatchesByField.get("engine.displacement")?.count || 0) + 1,
              sample: mismatchesByField.get("engine.displacement")?.sample || {
                id: doc._id,
                value: doc.engine.displacement,
              },
            });
          }

          if (doc.engine.power?.hp && typeof doc.engine.power.hp !== "number") {
            mismatchesByField.set("engine.power", {
              count: (mismatchesByField.get("engine.power")?.count || 0) + 1,
              sample: mismatchesByField.get("engine.power")?.sample || {
                id: doc._id,
                value: doc.engine.power,
              },
            });
          }
        }

        if (doc.dimensions) {
          ["length", "width", "height", "weight"].forEach((dim) => {
            if (
              doc.dimensions[dim]?.value &&
              typeof doc.dimensions[dim].value !== "number"
            ) {
              mismatchesByField.set(`dimensions.${dim}`, {
                count:
                  (mismatchesByField.get(`dimensions.${dim}`)?.count || 0) + 1,
                sample: mismatchesByField.get(`dimensions.${dim}`)?.sample || {
                  id: doc._id,
                  value: doc.dimensions[dim],
                },
              });
            }
          });
        }

        // Check performance data
        if (doc.performance) {
          if (
            doc.performance["0_to_60_mph"]?.value &&
            typeof doc.performance["0_to_60_mph"].value !== "number"
          ) {
            mismatchesByField.set("performance.0_to_60_mph", {
              count:
                (mismatchesByField.get("performance.0_to_60_mph")?.count || 0) +
                1,
              sample: {
                id: doc._id,
                value: doc.performance["0_to_60_mph"],
              },
            });
          }
          if (
            doc.performance.top_speed?.value &&
            typeof doc.performance.top_speed.value !== "number"
          ) {
            mismatchesByField.set("performance.top_speed", {
              count:
                (mismatchesByField.get("performance.top_speed")?.count || 0) +
                1,
              sample: {
                id: doc._id,
                value: doc.performance.top_speed,
              },
            });
          }
        }

        // Check transmission data
        if (doc.transmission) {
          if (
            doc.transmission.type &&
            typeof doc.transmission.type !== "string"
          ) {
            mismatchesByField.set("transmission.type", {
              count:
                (mismatchesByField.get("transmission.type")?.count || 0) + 1,
              sample: {
                id: doc._id,
                value: doc.transmission.type,
              },
            });
          }
          if (
            doc.transmission.speeds &&
            typeof doc.transmission.speeds !== "number"
          ) {
            mismatchesByField.set("transmission.speeds", {
              count:
                (mismatchesByField.get("transmission.speeds")?.count || 0) + 1,
              sample: {
                id: doc._id,
                value: doc.transmission.speeds,
              },
            });
          }
        }

        // Check interior features
        if (doc.interior_features) {
          if (
            doc.interior_features.seats &&
            typeof doc.interior_features.seats !== "number"
          ) {
            mismatchesByField.set("interior_features.seats", {
              count:
                (mismatchesByField.get("interior_features.seats")?.count || 0) +
                1,
              sample: {
                id: doc._id,
                value: doc.interior_features.seats,
              },
            });
          }
          if (
            doc.interior_features.features &&
            !Array.isArray(doc.interior_features.features)
          ) {
            mismatchesByField.set("interior_features.features", {
              count:
                (mismatchesByField.get("interior_features.features")?.count ||
                  0) + 1,
              sample: {
                id: doc._id,
                value: doc.interior_features.features,
              },
            });
          }
        }

        // Check safety features
        if (doc.safety) {
          if (doc.safety.tpms) {
            if (typeof doc.safety.tpms.type !== "string") {
              mismatchesByField.set("safety.tpms.type", {
                count:
                  (mismatchesByField.get("safety.tpms.type")?.count || 0) + 1,
                sample: {
                  id: doc._id,
                  value: doc.safety.tpms.type,
                },
              });
            }
            if (typeof doc.safety.tpms.present !== "boolean") {
              mismatchesByField.set("safety.tpms.present", {
                count:
                  (mismatchesByField.get("safety.tpms.present")?.count || 0) +
                  1,
                sample: {
                  id: doc._id,
                  value: doc.safety.tpms.present,
                },
              });
            }
          }
          if (doc.safety.airbags && !Array.isArray(doc.safety.airbags)) {
            mismatchesByField.set("safety.airbags", {
              count: (mismatchesByField.get("safety.airbags")?.count || 0) + 1,
              sample: {
                id: doc._id,
                value: doc.safety.airbags,
              },
            });
          }
          if (
            doc.safety.assistSystems &&
            !Array.isArray(doc.safety.assistSystems)
          ) {
            mismatchesByField.set("safety.assistSystems", {
              count:
                (mismatchesByField.get("safety.assistSystems")?.count || 0) + 1,
              sample: {
                id: doc._id,
                value: doc.safety.assistSystems,
              },
            });
          }
        }

        // Add to mismatchesByField checks
        if (doc.manufacturing) {
          ["city", "country", "company"].forEach((field) => {
            if (
              doc.manufacturing.plant?.[field] &&
              typeof doc.manufacturing.plant[field] !== "string"
            ) {
              mismatchesByField.set(`manufacturing.plant.${field}`, {
                count:
                  (mismatchesByField.get(`manufacturing.plant.${field}`)
                    ?.count || 0) + 1,
                sample: {
                  id: doc._id,
                  value: doc.manufacturing.plant[field],
                },
              });
            }
          });

          ["series", "trim", "bodyClass"].forEach((field) => {
            if (
              doc.manufacturing[field] &&
              typeof doc.manufacturing[field] !== "string"
            ) {
              mismatchesByField.set(`manufacturing.${field}`, {
                count:
                  (mismatchesByField.get(`manufacturing.${field}`)?.count ||
                    0) + 1,
                sample: {
                  id: doc._id,
                  value: doc.manufacturing[field],
                },
              });
            }
          });
        }

        // Check array fields
        [
          "documents",
          "research_entries",
          "eventIds",
          "deliverableIds",
          "captionIds",
        ].forEach((field) => {
          if (doc[field] && !Array.isArray(doc[field])) {
            mismatchesByField.set(field, {
              count: (mismatchesByField.get(field)?.count || 0) + 1,
              sample: {
                id: doc._id,
                value: doc[field],
              },
            });
          }
        });

        // Check boolean and string fields
        if (doc.hasArticle && typeof doc.hasArticle !== "boolean") {
          mismatchesByField.set("hasArticle", {
            count: (mismatchesByField.get("hasArticle")?.count || 0) + 1,
            sample: {
              id: doc._id,
              value: doc.hasArticle,
            },
          });
        }

        if (
          doc.lastArticleUpdate &&
          typeof doc.lastArticleUpdate !== "string" &&
          !(doc.lastArticleUpdate instanceof Date)
        ) {
          mismatchesByField.set("lastArticleUpdate", {
            count: (mismatchesByField.get("lastArticleUpdate")?.count || 0) + 1,
            sample: {
              id: doc._id,
              value: doc.lastArticleUpdate,
            },
          });
        }
      });

      console.log("\nBreakdown of type mismatches:");
      for (const [field, info] of mismatchesByField) {
        console.log(`\n${field}: ${info.count} documents`);
        if (info.sample) {
          console.log("Sample document:");
          console.log(`ID: ${info.sample.id}`);
          console.log("Value:", info.sample.value);
        }
      }
    }

    // Print summary of issues found
    console.log("\nSummary of Issues Found:");
    console.log(
      "- Documents with invalid required fields:",
      requiredFieldChecks.length
    );
    console.log(
      "- Documents with invalid nested structures:",
      nestedStructureChecks.length
    );
    console.log("- Documents with type mismatches:", typeChecks.length);

    // Additional price structure analysis
    const priceAnalysis = await db
      .collection("cars")
      .aggregate([
        {
          $group: {
            _id: null,
            totalCars: { $sum: 1 },
            carsWithPrice: {
              $sum: { $cond: [{ $ifNull: ["$price", false] }, 1, 0] },
            },
            carsWithListPrice: {
              $sum: { $cond: [{ $ifNull: ["$price.listPrice", false] }, 1, 0] },
            },
            carsWithSoldPrice: {
              $sum: { $cond: [{ $ifNull: ["$price.soldPrice", false] }, 1, 0] },
            },
            carsWithPriceHistory: {
              $sum: {
                $cond: [{ $ifNull: ["$price.priceHistory", false] }, 1, 0],
              },
            },
            soldCarsCount: {
              $sum: { $cond: [{ $eq: ["$status", "sold"] }, 1, 0] },
            },
            soldCarsWithSoldPrice: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $eq: ["$status", "sold"] },
                      { $ifNull: ["$price.soldPrice", false] },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
          },
        },
      ])
      .toArray();

    if (priceAnalysis.length > 0) {
      const analysis = priceAnalysis[0];
      console.log("\nPrice Structure Analysis:");
      console.log(`Total cars: ${analysis.totalCars}`);
      console.log(`Cars with price field: ${analysis.carsWithPrice}`);
      console.log(`Cars with listPrice: ${analysis.carsWithListPrice}`);
      console.log(`Cars with soldPrice: ${analysis.carsWithSoldPrice}`);
      console.log(`Cars with priceHistory: ${analysis.carsWithPriceHistory}`);
      console.log(`Total sold cars: ${analysis.soldCarsCount}`);
      console.log(
        `Sold cars with soldPrice: ${analysis.soldCarsWithSoldPrice}`
      );
      console.log(
        `Sold cars missing soldPrice: ${
          analysis.soldCarsCount - analysis.soldCarsWithSoldPrice
        }`
      );
    }

    // Suggest fixes
    console.log("\nSuggested Fixes:");
    console.log("1. Update any remaining cars to use the new price structure");
    console.log("2. Add soldPrice for cars marked as sold");
    console.log("3. Ensure all price history entries have valid dates");
    console.log("4. Validate measurement units across all dimensional values");
    console.log(
      "5. Clean up any invalid nested structures in engine and dimensions"
    );

    // Check for type mismatches
    const typeMismatches = await db
      .collection("cars")
      .find({
        $or: [
          { "dimensions.weight.value": "$weight" },
          {
            "dimensions.weight.value": {
              $exists: true,
              $ne: null,
            },
            $expr: {
              $not: {
                $or: [
                  { $eq: [{ $type: "$dimensions.weight.value" }, "double"] },
                  { $eq: [{ $type: "$dimensions.weight.value" }, "int"] },
                  { $eq: [{ $type: "$dimensions.weight.value" }, "long"] },
                ],
              },
            },
          },
        ],
      })
      .toArray();

    console.log("\nType mismatch details:");
    console.log(
      `Total documents with type mismatches: ${typeMismatches.length}`
    );

    // Show all documents with weight issues
    console.log("\nAll documents with weight issues:");
    for (const doc of typeMismatches) {
      console.log(`\nDocument ID: ${doc._id}`);
      console.log(
        "Full dimensions object:",
        JSON.stringify(doc.dimensions, null, 2)
      );
      console.log("Weight value type:", typeof doc.dimensions?.weight?.value);
      if (doc.weight) {
        console.log("Root weight value:", doc.weight);
        console.log("Root weight type:", typeof doc.weight);
      }
    }

    // Group by type of mismatch
    const weightValueTypes = new Map();
    for (const doc of typeMismatches) {
      const weightValue = doc.dimensions?.weight?.value;
      const type = typeof weightValue;
      const count = weightValueTypes.get(type) || 0;
      weightValueTypes.set(type, count + 1);
    }

    console.log("\nBreakdown of weight value types:");
    for (const [type, count] of weightValueTypes) {
      console.log(`${type}: ${count} documents`);
    }
  } catch (error) {
    console.error("Error validating cars:", error);
  } finally {
    await client.close();
  }
}

validateCars().catch(console.error);
