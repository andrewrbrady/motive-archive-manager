#!/usr/bin/env node

/**
 * Debug script for investigating deliverables linking issues
 *
 * This script checks why certain deliverables might not appear in the
 * "Link Existing Deliverables" dialog for a specific project.
 *
 * Usage: node scripts/debug-deliverables-linking.cjs
 */

require("dotenv").config();
const { MongoClient, ObjectId } = require("mongodb");

const PROJECT_ID = "68449a36f835fcc68f67b38a";
const CAR_ID = "681180b4634e46af8e37dddc";

async function main() {
  console.log("🔍 DEBUG: Deliverables Linking Investigation");
  console.log("==========================================");
  console.log(`Project ID: ${PROJECT_ID}`);
  console.log(`Car ID: ${CAR_ID}`);
  console.log("");

  const client = new MongoClient(process.env.MONGODB_URI);

  try {
    await client.connect();
    console.log("✅ Connected to MongoDB");

    const db = client.db("motive-archive-manager");

    // Step 0: Check what projects exist and their ID format
    console.log("\n🔍 Step 0: Checking project ID formats...");
    const projectSample = await db.collection("projects").findOne({});
    if (projectSample) {
      console.log(`Sample project ID type: ${typeof projectSample._id}`);
      console.log(`Sample project ID: ${projectSample._id}`);
      console.log(`Sample project name: "${projectSample.name}"`);
    }

    // Try to find the project with different ID formats
    let project = null;

    // Try as string first
    project = await db.collection("projects").findOne({ _id: PROJECT_ID });
    if (project) {
      console.log("✅ Found project using string ID");
    } else {
      // Try as ObjectId
      try {
        project = await db
          .collection("projects")
          .findOne({ _id: new ObjectId(PROJECT_ID) });
        if (project) {
          console.log("✅ Found project using ObjectId");
        }
      } catch (error) {
        console.log("❌ Invalid ObjectId format");
      }
    }

    // Step 1: Get project details
    console.log("\n📋 Step 1: Fetching project details...");

    if (!project) {
      console.log(
        "❌ Project not found with either string or ObjectId format!"
      );

      // Let's see what projects exist
      const projects = await db
        .collection("projects")
        .find({})
        .limit(5)
        .toArray();
      console.log(`\n📋 Found ${projects.length} projects in database:`);
      projects.forEach((p, i) => {
        console.log(`   ${i + 1}. "${p.name}" (ID: ${p._id})`);
      });
      return;
    }

    console.log(`✅ Project found: "${project.name}"`);
    console.log(`   Car IDs: ${JSON.stringify(project.carIds || [])}`);
    console.log(
      `   Current deliverable IDs: ${JSON.stringify(project.deliverableIds || [])}`
    );

    // Step 2: Get car details
    console.log("\n🚗 Step 2: Fetching car details...");

    // Try both formats for car as well
    let car = null;
    car = await db.collection("cars").findOne({ _id: CAR_ID });
    if (!car) {
      try {
        car = await db
          .collection("cars")
          .findOne({ _id: new ObjectId(CAR_ID) });
      } catch (error) {
        // Invalid ObjectId format
      }
    }

    if (!car) {
      console.log("❌ Car not found!");

      // Let's see what cars exist
      const cars = await db.collection("cars").find({}).limit(5).toArray();
      console.log(`\n🚗 Found ${cars.length} cars in database:`);
      cars.forEach((c, i) => {
        console.log(
          `   ${i + 1}. ${c.year} ${c.make} ${c.model} (ID: ${c._id})`
        );
      });
      return;
    }

    console.log(`✅ Car found: ${car.year} ${car.make} ${car.model}`);

    // Check if car is linked to project
    const projectCarIds = (project.carIds || []).map((id) => String(id));
    const isCarLinkedToProject = projectCarIds.includes(String(CAR_ID));
    console.log(
      `   Car linked to project: ${isCarLinkedToProject ? "✅ YES" : "❌ NO"}`
    );

    if (!isCarLinkedToProject) {
      console.log("   🚨 ISSUE: Car is not linked to the project!");
      console.log(
        `   Project car IDs (as strings): ${JSON.stringify(projectCarIds)}`
      );
      console.log(`   Looking for car ID: ${String(CAR_ID)}`);
    }

    // Step 3: Get all deliverables for this car
    console.log("\n📦 Step 3: Fetching deliverables for this car...");

    // Try both string and ObjectId formats for car_id
    let deliverables = await db
      .collection("deliverables")
      .find({
        car_id: CAR_ID,
      })
      .toArray();

    if (deliverables.length === 0) {
      // Try with ObjectId
      try {
        deliverables = await db
          .collection("deliverables")
          .find({
            car_id: new ObjectId(CAR_ID),
          })
          .toArray();
      } catch (error) {
        // Invalid ObjectId
      }
    }

    console.log(
      `✅ Found ${deliverables.length} deliverables for car ${CAR_ID}`
    );

    if (deliverables.length === 0) {
      console.log("   🚨 ISSUE: No deliverables found for this car!");

      // Let's see what deliverables exist for any car
      const allDeliverables = await db
        .collection("deliverables")
        .find({})
        .limit(5)
        .toArray();
      console.log(`\n📦 Sample deliverables in database:`);
      allDeliverables.forEach((d, i) => {
        console.log(
          `   ${i + 1}. "${d.title}" (Car ID: ${d.car_id}, Type: ${typeof d.car_id})`
        );
      });
      return;
    }

    // Step 4: Check each deliverable's status
    console.log("\n🔍 Step 4: Analyzing each deliverable...");
    const currentDeliverableIds = project.deliverableIds || [];

    deliverables.forEach((deliverable, index) => {
      console.log(`\n   Deliverable ${index + 1}: "${deliverable.title}"`);
      console.log(`   • ID: ${deliverable._id}`);
      console.log(
        `   • Car ID: ${deliverable.car_id} (matches: ${deliverable.car_id === CAR_ID ? "✅" : "❌"})`
      );
      console.log(`   • Status: ${deliverable.status}`);
      console.log(`   • Platform: ${deliverable.platform || "None"}`);
      console.log(`   • Edit Deadline: ${deliverable.edit_deadline || "None"}`);
      console.log(`   • Release Date: ${deliverable.release_date || "None"}`);
      console.log(
        `   • Social Media Link: ${deliverable.social_media_link ? "Yes" : "No"}`
      );

      // Check if already linked to project
      const alreadyLinked = currentDeliverableIds.includes(deliverable._id);
      console.log(
        `   • Already linked to project: ${alreadyLinked ? "✅ YES" : "❌ NO"}`
      );

      // Check if would be filtered out by published filter
      let isPublished = false;
      if (deliverable.release_date && deliverable.social_media_link) {
        const releaseDate = new Date(deliverable.release_date);
        const now = new Date();
        isPublished =
          releaseDate <= now && deliverable.social_media_link.trim();
      }
      console.log(
        `   • Would be filtered as published: ${isPublished ? "✅ YES" : "❌ NO"}`
      );

      // Determine if should appear in link dialog
      const shouldAppearInDialog =
        !alreadyLinked && (!isPublished || !deliverable.social_media_link);
      console.log(
        `   • Should appear in link dialog: ${shouldAppearInDialog ? "✅ YES" : "❌ NO"}`
      );

      if (!shouldAppearInDialog) {
        if (alreadyLinked) {
          console.log("     → Reason: Already linked to project");
        } else if (isPublished) {
          console.log("     → Reason: Filtered out as published");
        }
      }
    });

    // Step 5: Simulate the API call that the frontend makes
    console.log("\n🌐 Step 5: Simulating frontend API call...");

    // Get all deliverables (like the frontend does)
    const allDeliverables = await db
      .collection("deliverables")
      .find({})
      .limit(100)
      .toArray();
    console.log(`✅ Total deliverables in database: ${allDeliverables.length}`);

    // Filter out already linked ones
    const availableDeliverables = allDeliverables.filter(
      (d) => !currentDeliverableIds.includes(d._id)
    );
    console.log(
      `✅ Available (not linked) deliverables: ${availableDeliverables.length}`
    );

    // Apply vehicle filter
    const vehicleFilteredDeliverables = availableDeliverables.filter((d) => {
      if (!d.car_id) return false;
      const deliverableCarId = String(d.car_id);
      return projectCarIds.includes(deliverableCarId);
    });
    console.log(
      `✅ After vehicle filter: ${vehicleFilteredDeliverables.length}`
    );

    if (vehicleFilteredDeliverables.length === 0) {
      console.log("🚨 No deliverables passed the vehicle filter!");
      console.log(`   Project car IDs: ${JSON.stringify(projectCarIds)}`);
      console.log("   Available deliverable car IDs:");
      availableDeliverables.slice(0, 10).forEach((d, i) => {
        console.log(
          `     ${i + 1}. ${d.title} → car_id: ${d.car_id} (${typeof d.car_id})`
        );
      });
    }

    // Apply published filter
    const unpublishedDeliverables = vehicleFilteredDeliverables.filter((d) => {
      if (!d.release_date || !d.social_media_link) return true;
      const releaseDate = new Date(d.release_date);
      const now = new Date();
      return !(releaseDate <= now && d.social_media_link.trim());
    });
    console.log(`✅ After published filter: ${unpublishedDeliverables.length}`);

    // Show which deliverables would appear in the dialog
    console.log('\n📋 Final list for "Link Existing Deliverables" dialog:');
    if (unpublishedDeliverables.length === 0) {
      console.log("   ❌ NO DELIVERABLES WOULD APPEAR");
      console.log("\n🚨 POTENTIAL ISSUES:");
      console.log("   1. Car might not be linked to the project");
      console.log("   2. All deliverables for this car are already linked");
      console.log("   3. All deliverables are filtered out as published");
      console.log("   4. Deliverables might have incorrect car_id values");
      console.log("   5. ID format mismatch (string vs ObjectId)");
    } else {
      unpublishedDeliverables.forEach((d, i) => {
        console.log(
          `   ${i + 1}. "${d.title}" (ID: ${d._id}, Car: ${d.car_id})`
        );
      });
    }

    // Step 6: Check for caching issues
    console.log("\n💾 Step 6: Checking for potential caching issues...");

    // Check if there are recent deliverables that might not be appearing
    const recentDeliverables = await db
      .collection("deliverables")
      .find({
        car_id: { $in: [CAR_ID, new ObjectId(CAR_ID)] },
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // Last 24 hours
      })
      .toArray();

    console.log(
      `✅ Recent deliverables (last 24h): ${recentDeliverables.length}`
    );

    if (recentDeliverables.length > 0) {
      console.log("   Recent deliverables found:");
      recentDeliverables.forEach((d, i) => {
        console.log(`   ${i + 1}. "${d.title}" (Created: ${d.createdAt})`);
      });
      console.log(
        "   💡 If these don't appear in the UI, it might be a caching issue"
      );
    }

    console.log("\n✅ Investigation complete!");
  } catch (error) {
    console.error("❌ Error during investigation:", error);
  } finally {
    await client.close();
    console.log("🔌 Disconnected from MongoDB");
  }
}

main().catch(console.error);
