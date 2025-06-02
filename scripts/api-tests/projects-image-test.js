// Projects Image Loading Test
// Tests the primary image loading functionality in Projects API
// Based on successful patterns from debug-car-images.js and test-image-api.js

import { getDatabase } from "../../src/lib/mongodb.js";

const TEST_CONFIG = {
  // Test parameters
  maxProjectsToTest: 5,
  timeoutMs: 10000,

  // Expected behavior
  expectPrimaryImageUrl: true,
  expectImageFallback: false,
};

async function testProjectsImageLoading() {
  console.log("🖼️ PROJECTS IMAGE LOADING TEST");
  console.log("================================\n");

  try {
    // Connect to database
    console.log("📊 Connecting to database...");
    const db = await getDatabase();

    // Test 1: Check projects collection structure
    console.log("\n🔍 TEST 1: Projects Collection Analysis");
    const sampleProjects = await db
      .collection("projects")
      .find({})
      .limit(TEST_CONFIG.maxProjectsToTest)
      .toArray();

    console.log(`Found ${sampleProjects.length} projects to test`);

    let projectsWithPrimaryImage = 0;
    let projectsWithImageIds = 0;

    for (const project of sampleProjects) {
      console.log(`\nProject: ${project.title || "Untitled"}`);
      console.log(`  ID: ${project._id}`);
      console.log(`  primaryImageId: ${project.primaryImageId || "NOT SET"}`);
      console.log(`  primaryImageId type: ${typeof project.primaryImageId}`);

      if (project.primaryImageId) {
        projectsWithPrimaryImage++;

        // Check if image exists in images collection
        const image = await db.collection("images").findOne({
          _id: project.primaryImageId,
        });
        console.log(`  Image exists in DB: ${image ? "YES" : "NO"}`);

        if (image) {
          console.log(`  Image URL: ${image.url}`);
          console.log(`  Image cloudflareId: ${image.cloudflareId}`);
        }
      }

      // Check for any associated images
      if (project.galleryIds && project.galleryIds.length > 0) {
        console.log(`  Gallery IDs: ${project.galleryIds.length} found`);
        projectsWithImageIds++;
      }
    }

    console.log(`\n📈 Collection Summary:`);
    console.log(
      `  Projects with primaryImageId: ${projectsWithPrimaryImage}/${sampleProjects.length}`
    );
    console.log(
      `  Projects with galleries: ${projectsWithImageIds}/${sampleProjects.length}`
    );

    // Test 2: API Response Test
    console.log("\n🔍 TEST 2: API Response Test");
    console.log("Testing Projects API with includeImages=true...");

    // Simulate API call (this would normally be an HTTP request)
    const apiResponse = await db
      .collection("projects")
      .aggregate([
        { $match: {} },
        { $limit: 3 },
        // This is the current broken aggregation - should be fixed
        {
          $lookup: {
            from: "images",
            let: {
              primaryId: {
                $cond: [
                  { $ifNull: ["$primaryImageId", false] },
                  {
                    $cond: [
                      { $eq: [{ $type: "$primaryImageId" }, "objectId"] },
                      "$primaryImageId",
                      { $toObjectId: "$primaryImageId" },
                    ],
                  },
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
      ])
      .toArray();

    console.log("\n📊 API Response Analysis:");
    let successfulImageLoads = 0;

    for (const project of apiResponse) {
      const hasImage = !!project.primaryImageUrl;
      const hasPrimaryId = !!project.primaryImageId;

      console.log(`\nProject: ${project.title}`);
      console.log(`  Has primaryImageId: ${hasPrimaryId ? "YES" : "NO"}`);
      console.log(`  Has primaryImageUrl: ${hasImage ? "YES" : "NO"}`);
      console.log(`  Image URL: ${project.primaryImageUrl || "NULL"}`);

      if (hasImage) successfulImageLoads++;

      // This indicates the bug - projects with primaryImageId but no primaryImageUrl
      if (hasPrimaryId && !hasImage) {
        console.log(
          `  🚨 BUG DETECTED: primaryImageId exists but no URL generated`
        );
      }
    }

    console.log(`\n📈 API Results:`);
    console.log(
      `  Projects with loaded images: ${successfulImageLoads}/${apiResponse.length}`
    );
    console.log(
      `  Success rate: ${((successfulImageLoads / apiResponse.length) * 100).toFixed(1)}%`
    );

    // Test 3: Reference Implementation Test (Cars API)
    console.log("\n🔍 TEST 3: Reference Implementation Comparison");
    console.log("Testing Cars API (working reference)...");

    const carsResponse = await db
      .collection("cars")
      .aggregate([
        { $match: {} },
        { $limit: 2 },
        // This is the WORKING cars aggregation pipeline
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
      ])
      .toArray();

    let carsSuccessful = 0;
    for (const car of carsResponse) {
      const hasImage = !!car.displayImage;
      if (hasImage) carsSuccessful++;

      console.log(`\nCar: ${car.make} ${car.model}`);
      console.log(
        `  Has primaryImageId: ${!!car.primaryImageId ? "YES" : "NO"}`
      );
      console.log(`  Has displayImage: ${hasImage ? "YES" : "NO"}`);
    }

    console.log(`\n📈 Cars API Results (Reference):`);
    console.log(
      `  Cars with loaded images: ${carsSuccessful}/${carsResponse.length}`
    );
    console.log(
      `  Success rate: ${((carsSuccessful / carsResponse.length) * 100).toFixed(1)}%`
    );

    // Test Results Summary
    console.log("\n🎯 TEST SUMMARY");
    console.log("================");

    const projectsWorking = successfulImageLoads / apiResponse.length > 0.5;
    const carsWorking = carsSuccessful / carsResponse.length > 0.5;

    console.log(
      `Projects API Image Loading: ${projectsWorking ? "✅ WORKING" : "❌ BROKEN"}`
    );
    console.log(
      `Cars API Image Loading: ${carsWorking ? "✅ WORKING" : "❌ BROKEN"}`
    );

    if (!projectsWorking && carsWorking) {
      console.log("\n🔧 RECOMMENDED FIX:");
      console.log(
        "Replace Projects API aggregation pipeline with Cars API pattern"
      );
      console.log(
        "Focus on the $toObjectId conversion and $cond logic differences"
      );
    }

    if (!projectsWorking) {
      console.log("\n❌ PROJECTS IMAGE LOADING TEST: FAILED");
      process.exit(1);
    } else {
      console.log("\n✅ PROJECTS IMAGE LOADING TEST: PASSED");
    }
  } catch (error) {
    console.error("💥 Test failed with error:", error);
    process.exit(1);
  }
}

// Run the test
testProjectsImageLoading()
  .then(() => {
    console.log("\n🏁 Test completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Test runner failed:", error);
    process.exit(1);
  });
