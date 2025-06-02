#!/usr/bin/env node

/**
 * PROJECTS IMAGE DEBUG SCRIPT
 *
 * Tests the exact same aggregation pipeline used in the projects API
 * to debug why images are returning 400 errors.
 */

import { MongoClient, ObjectId } from "mongodb";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017";
const DB_NAME = process.env.MONGODB_DB || "motive_archive";

async function testProjectsImageLookup() {
  console.log("🔍 PROJECTS IMAGE LOOKUP DEBUG");
  console.log("==============================\n");

  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log("✅ Connected to MongoDB");

    const db = client.db(DB_NAME);

    // Test with the specific project ID from your sample data
    const testProjectId = new ObjectId("683a0fefb2aaf999dc1bf851");

    console.log(`🎯 Testing project: ${testProjectId}`);
    console.log(`🎯 Expected primaryImageId: 67d241f0ecadae57ebfe7ce7\n`);

    // First, let's verify the project exists and has primaryImageId
    const project = await db
      .collection("projects")
      .findOne({ _id: testProjectId });

    if (!project) {
      console.log("❌ Project not found");
      return;
    }

    console.log("📋 Project found:");
    console.log(`   Title: ${project.title}`);
    console.log(`   Primary Image ID: ${project.primaryImageId}`);
    console.log("");

    // Now let's check if the image exists in the images collection
    const imageId = new ObjectId(project.primaryImageId);
    const image = await db.collection("images").findOne({ _id: imageId });

    console.log("🖼️  Image lookup:");
    if (image) {
      console.log(`   ✅ Image found: ${image._id}`);
      console.log(`   📄 URL: ${image.url}`);
      console.log(
        `   📊 Metadata: ${JSON.stringify(image.metadata || {}, null, 2)}`
      );
    } else {
      console.log(`   ❌ Image NOT found with ID: ${imageId}`);
    }
    console.log("");

    // Now test the exact aggregation pipeline from the API
    console.log("🔧 Testing aggregation pipeline...");

    const pipeline = [
      { $match: { _id: testProjectId } },
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
          as: "primaryImageData",
        },
      },
      {
        $addFields: {
          primaryImageUrl: {
            $cond: {
              if: { $gt: [{ $size: "$primaryImageData" }, 0] },
              then: { $arrayElemAt: ["$primaryImageData.url", 0] },
              else: null,
            },
          },
        },
      },
      {
        $unset: "primaryImageData",
      },
    ];

    const result = await db
      .collection("projects")
      .aggregate(pipeline)
      .toArray();

    if (result.length > 0) {
      const projectWithImage = result[0];
      console.log("✅ Aggregation result:");
      console.log(`   Primary Image URL: ${projectWithImage.primaryImageUrl}`);

      if (projectWithImage.primaryImageUrl) {
        console.log("\n🔗 URL Analysis:");
        console.log(`   Raw URL: ${projectWithImage.primaryImageUrl}`);
        console.log(`   URL Type: ${typeof projectWithImage.primaryImageUrl}`);
        console.log(
          `   URL Length: ${projectWithImage.primaryImageUrl.length}`
        );
        console.log(
          `   Contains imagedelivery.net: ${projectWithImage.primaryImageUrl.includes("imagedelivery.net")}`
        );

        // Test URL accessibility
        console.log("\n🌐 Testing URL accessibility...");

        // Test original URL (should fail)
        try {
          const response = await fetch(projectWithImage.primaryImageUrl);
          console.log(
            `   Original URL Status: ${response.status} ${response.statusText}`
          );
        } catch (fetchError) {
          console.log(`   ❌ Original URL Fetch error: ${fetchError.message}`);
        }

        // Test simple fix: append /public
        const fixedUrl = `${projectWithImage.primaryImageUrl}/public`;
        console.log(`\n🔧 Testing simple fix: ${fixedUrl}`);
        try {
          const response = await fetch(fixedUrl);
          console.log(
            `   Fixed URL Status: ${response.status} ${response.statusText}`
          );
          console.log(
            `   Content-Type: ${response.headers.get("content-type")}`
          );

          if (response.status === 200) {
            console.log("   ✅ SUCCESS! Simple /public fix works!");
          }
        } catch (fetchError) {
          console.log(`   ❌ Fixed URL Fetch error: ${fetchError.message}`);
        }
      } else {
        console.log("❌ No primaryImageUrl in aggregation result");
      }
    } else {
      console.log("❌ No results from aggregation pipeline");
    }
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await client.close();
    console.log("\n🔚 Connection closed");
  }
}

// Run the test
testProjectsImageLookup().catch(console.error);
