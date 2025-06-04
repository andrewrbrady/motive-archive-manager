#!/usr/bin/env node

/**
 * Test the fixed cars API to verify image URLs now work
 */

import { MongoClient, ObjectId } from "mongodb";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017";
const DB_NAME = process.env.MONGODB_DB || "motive_archive";

async function testFixedCarsAPI() {
  console.log("🚗 TESTING FIXED CARS API");
  console.log("=========================");

  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    const db = client.db(DB_NAME);

    // Simulate the fixed cars API logic
    const cars = await db
      .collection("cars")
      .aggregate([
        { $match: {} },
        { $limit: 2 }, // Just test 2 cars
        {
          $lookup: {
            from: "images",
            let: {
              primaryId: {
                $cond: [
                  { $ifNull: ["$primaryImageId", false] },
                  { $toObjectId: "$primaryImageId" },
                  null,
                ],
              },
            },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [{ $eq: ["$_id", "$$primaryId"] }],
                  },
                },
              },
              { $limit: 1 },
            ],
            as: "primaryImage",
          },
        },
        {
          $addFields: {
            displayImage: {
              $cond: {
                if: { $gt: [{ $size: "$primaryImage" }, 0] },
                then: { $arrayElemAt: ["$primaryImage", 0] },
                else: null,
              },
            },
          },
        },
        {
          $project: {
            _id: 1,
            make: 1,
            model: 1,
            year: 1,
            primaryImage: {
              $cond: {
                if: "$displayImage",
                then: {
                  _id: { $toString: "$displayImage._id" },
                  url: "$displayImage.url",
                },
                else: null,
              },
            },
          },
        },
      ])
      .toArray();

    console.log(`\n📊 Found ${cars.length} cars`);

    // Apply the simple fix and test URLs
    for (let i = 0; i < cars.length; i++) {
      const car = cars[i];
      if (car.primaryImage?.url) {
        console.log(
          `\n🚗 Car ${i + 1}: ${car.make} ${car.model} (${car.year})`
        );

        const originalUrl = car.primaryImage.url;
        console.log(`   Original URL: ${originalUrl}`);

        // Apply simple fix
        let fixedUrl = originalUrl;
        if (
          originalUrl.includes("imagedelivery.net") &&
          !originalUrl.includes("/public")
        ) {
          fixedUrl = `${originalUrl}/public`;
        }
        console.log(`   Fixed URL: ${fixedUrl}`);

        // Test the fixed URL
        try {
          const response = await fetch(fixedUrl);
          if (response.status === 200) {
            console.log(
              `   ✅ SUCCESS: ${response.status} (${response.headers.get("content-type")})`
            );
          } else {
            console.log(
              `   ❌ FAILED: ${response.status} ${response.statusText}`
            );
          }
        } catch (error) {
          console.log(`   ❌ ERROR: ${error.message}`);
        }
      } else {
        console.log(
          `\n🚗 Car ${i + 1}: ${car.make} ${car.model} (${car.year}) - No image`
        );
      }
    }
  } catch (error) {
    console.error("❌ Test failed:", error);
  } finally {
    await client.close();
    console.log("\n🔚 Test complete");
  }
}

testFixedCarsAPI().catch(console.error);
