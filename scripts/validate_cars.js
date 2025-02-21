const { MongoClient } = require("mongodb");
require("dotenv").config();

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB || "motive_archive";

if (!MONGODB_URI) {
  throw new Error("Please add your Mongo URI to .env.local");
}

async function validateCars() {
  const client = new MongoClient(MONGODB_URI);

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

          // Check required number fields
          { year: { $not: { $type: "number" } } },
          { price: { $not: { $type: "number" } } },

          // Check mileage structure
          {
            $or: [
              { "mileage.value": { $not: { $type: "number" } } },
              { "mileage.unit": { $not: { $type: "string" } } },
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
          { year: { $exists: false } },
          { price: { $exists: false } },
          { mileage: { $exists: false } },
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
        console.log("Price:", doc.price);
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
            "clientInfo._id": { $exists: false, clientInfo: { $exists: true } },
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
          { color: { $exists: true, $not: { $type: "string" } } },
          { interior_color: { $exists: true, $not: { $type: "string" } } },

          // Check for non-number doors
          { doors: { $exists: true, $not: { $type: "number" } } },

          // Check for invalid image URLs
          { "images.url": { $exists: true, $not: { $type: "string" } } },
        ],
      })
      .toArray();

    console.log("\nDocuments with type mismatches:", typeChecks.length);
    if (typeChecks.length > 0) {
      console.log("Sample of documents with type mismatches:");
      typeChecks.slice(0, 3).forEach((doc) => {
        console.log(`\nID: ${doc._id}`);
        if (doc.vin) console.log("VIN:", doc.vin);
        if (doc.color) console.log("Color:", doc.color);
        if (doc.interior_color)
          console.log("Interior Color:", doc.interior_color);
        if (doc.doors) console.log("Doors:", doc.doors);
        if (doc.images) console.log("Images:", doc.images.length);
      });
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

    // Suggest fixes
    console.log("\nSuggested Fixes:");
    console.log(
      "1. Update documents with 'P.O.A.' price to use numeric values"
    );
    console.log(
      "2. Set missing status fields to 'available' or appropriate value"
    );
    console.log(
      "3. Fix null mileage values with actual numbers or remove the field"
    );
    console.log("4. Ensure all dates are proper Date objects");
    console.log(
      "5. Validate nested structures (engine, dimensions, clientInfo)"
    );
  } catch (error) {
    console.error("Error validating cars:", error);
  } finally {
    await client.close();
  }
}

validateCars().catch(console.error);
