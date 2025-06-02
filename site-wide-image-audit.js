#!/usr/bin/env node

/**
 * SITE-WIDE IMAGE AUDIT SCRIPT
 *
 * Tests all major image-serving APIs to identify 400 error patterns
 * and URLs that need the /public fix
 */

import { MongoClient, ObjectId } from "mongodb";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017";
const DB_NAME = process.env.MONGODB_DB || "motive_archive";

async function testImageUrl(url, description) {
  try {
    console.log(`\n🔗 Testing: ${description}`);
    console.log(`   URL: ${url}`);

    const response = await fetch(url);
    const status = response.status;
    const contentType = response.headers.get("content-type") || "unknown";

    if (status === 200) {
      console.log(`   ✅ SUCCESS: ${status} (${contentType})`);
      return { status: "success", url, description };
    } else if (status === 400) {
      console.log(`   🚨 BROKEN: ${status} - Needs /public fix`);

      // Test the /public fix
      const fixedUrl = url.includes("/public") ? url : `${url}/public`;
      try {
        const fixedResponse = await fetch(fixedUrl);
        if (fixedResponse.status === 200) {
          console.log(`   ✅ FIXED: ${fixedUrl} works!`);
          return { status: "fixable", url, fixedUrl, description };
        }
      } catch (e) {
        console.log(`   ❌ Fix failed: ${e.message}`);
      }

      return { status: "broken", url, description, httpStatus: status };
    } else {
      console.log(`   ⚠️  OTHER: ${status} ${response.statusText}`);
      return { status: "other", url, description, httpStatus: status };
    }
  } catch (error) {
    console.log(`   ❌ ERROR: ${error.message}`);
    return { status: "error", url, description, error: error.message };
  }
}

async function auditSiteWideImages() {
  console.log("🔍 SITE-WIDE IMAGE AUDIT");
  console.log("========================");

  const client = new MongoClient(MONGODB_URI);
  const results = [];

  try {
    await client.connect();
    console.log("✅ Connected to MongoDB\n");

    const db = client.db(DB_NAME);

    // 1. Test Projects API (we know this one was broken)
    console.log("📋 TESTING PROJECTS API");
    console.log("======================");

    const project = await db
      .collection("projects")
      .findOne({ primaryImageId: { $exists: true } });
    if (project?.primaryImageId) {
      const projectImage = await db
        .collection("images")
        .findOne({ _id: new ObjectId(project.primaryImageId) });
      if (projectImage?.url) {
        const result = await testImageUrl(
          projectImage.url,
          "Projects API - Raw DB URL"
        );
        results.push(result);
      }
    }

    // 2. Test Cars API
    console.log("\n🚗 TESTING CARS API");
    console.log("==================");

    const car = await db
      .collection("cars")
      .findOne({ primaryImageId: { $exists: true } });
    if (car?.primaryImageId) {
      const carImage = await db
        .collection("images")
        .findOne({ _id: new ObjectId(car.primaryImageId) });
      if (carImage?.url) {
        const result = await testImageUrl(
          carImage.url,
          "Cars API - Raw DB URL"
        );
        results.push(result);
      }
    }

    // 3. Test Images API
    console.log("\n🖼️  TESTING IMAGES COLLECTION");
    console.log("============================");

    const images = await db.collection("images").find({}).limit(5).toArray();
    for (let i = 0; i < Math.min(3, images.length); i++) {
      const img = images[i];
      if (img.url) {
        const result = await testImageUrl(
          img.url,
          `Images Collection #${i + 1}`
        );
        results.push(result);
      }
    }

    // 4. Test Galleries API
    console.log("\n🖼️  TESTING GALLERIES API");
    console.log("========================");

    const gallery = await db
      .collection("galleries")
      .findOne({ thumbnailImage: { $exists: true } });
    if (gallery?.thumbnailImage?.url) {
      const result = await testImageUrl(
        gallery.thumbnailImage.url,
        "Galleries API - Thumbnail"
      );
      results.push(result);
    }

    // Summary
    console.log("\n📊 AUDIT SUMMARY");
    console.log("================");

    const summary = {
      total: results.length,
      success: results.filter((r) => r.status === "success").length,
      broken: results.filter((r) => r.status === "broken").length,
      fixable: results.filter((r) => r.status === "fixable").length,
      errors: results.filter((r) => r.status === "error").length,
      other: results.filter((r) => r.status === "other").length,
    };

    console.log(`Total URLs tested: ${summary.total}`);
    console.log(`✅ Working: ${summary.success}`);
    console.log(`🚨 Broken (400): ${summary.broken}`);
    console.log(`🔧 Fixable with /public: ${summary.fixable}`);
    console.log(`❌ Errors: ${summary.errors}`);
    console.log(`⚠️  Other issues: ${summary.other}`);

    // Recommendations
    console.log("\n🎯 RECOMMENDATIONS");
    console.log("==================");

    if (summary.fixable > 0) {
      console.log(
        `🔧 APPLY SIMPLE FIX: ${summary.fixable} URLs need /public appended`
      );
      console.log("   Files to update:");
      console.log("   - /src/app/api/cars/list/route.ts");
      console.log("   - /src/app/api/cars/[id]/route.ts");
      console.log("   - /src/app/api/galleries/route.ts");
      console.log("   - /src/app/api/galleries/[id]/route.ts");
      console.log("   - /src/app/api/images/route.ts");
      console.log("   - /src/app/api/images/optimized/route.ts");
    }

    if (summary.broken > 0 || summary.fixable > 0) {
      console.log(`\n📝 PATTERN: Database stores base URLs without variants`);
      console.log(
        `   Solution: Append /public to all Cloudflare imagedelivery.net URLs`
      );
      console.log(
        `   Replace: getFormattedImageUrl(url) with simpler approach`
      );
    }

    if (summary.success === summary.total) {
      console.log("🎉 ALL IMAGES WORKING! No fixes needed.");
    }
  } catch (error) {
    console.error("❌ Audit failed:", error);
  } finally {
    await client.close();
    console.log("\n🔚 Audit complete");
  }
}

// Run the audit
auditSiteWideImages().catch(console.error);
