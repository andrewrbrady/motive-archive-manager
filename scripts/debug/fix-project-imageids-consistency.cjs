#!/usr/bin/env node

const { MongoClient, ObjectId } = require("mongodb");

async function fixProjectImageIdsConsistency() {
  const client = new MongoClient(
    process.env.MONGODB_URI || "mongodb://localhost:27017"
  );

  try {
    await client.connect();
    const db = client.db("motive_archive");

    console.log("🔧 FIXING PROJECT IMAGEIDS CONSISTENCY");
    console.log("=====================================\n");

    // Find all projects with imageIds
    const projects = await db
      .collection("projects")
      .find({
        imageIds: { $exists: true, $ne: [] },
      })
      .toArray();

    console.log(`📋 Found ${projects.length} projects with imageIds`);

    for (const project of projects) {
      console.log(
        `\n🔄 Processing project: ${project._id} (${project.title || "No title"})`
      );

      if (!project.imageIds || project.imageIds.length === 0) {
        console.log("  ⏭️ No imageIds to process");
        continue;
      }

      let hasStringIds = false;
      let hasObjectIds = false;
      const convertedIds = [];

      // Analyze current types
      for (const id of project.imageIds) {
        if (typeof id === "string") {
          hasStringIds = true;
          // Convert string to ObjectId if it's a valid ObjectId string
          if (ObjectId.isValid(id)) {
            convertedIds.push(new ObjectId(id));
          } else {
            console.log(`  ⚠️ Invalid ObjectId string: ${id}`);
            convertedIds.push(id); // Keep as-is if not valid
          }
        } else if (id instanceof ObjectId) {
          hasObjectIds = true;
          convertedIds.push(id);
        } else {
          console.log(`  ⚠️ Unknown type: ${typeof id} - ${id}`);
          convertedIds.push(id);
        }
      }

      console.log(`  📊 Analysis: ${project.imageIds.length} total IDs`);
      console.log(`    - String IDs: ${hasStringIds ? "YES" : "NO"}`);
      console.log(`    - ObjectIds: ${hasObjectIds ? "YES" : "NO"}`);
      console.log(
        `    - Mixed types: ${hasStringIds && hasObjectIds ? "YES" : "NO"}`
      );

      // Update if we had mixed types or string IDs
      if (hasStringIds) {
        console.log(`  🔄 Converting to ObjectIds...`);

        const updateResult = await db
          .collection("projects")
          .updateOne(
            { _id: project._id },
            { $set: { imageIds: convertedIds } }
          );

        if (updateResult.modifiedCount > 0) {
          console.log(`  ✅ Updated project ${project._id}`);
        } else {
          console.log(`  ⚠️ Project ${project._id} not modified`);
        }
      } else {
        console.log(`  ✅ Already using ObjectIds - no update needed`);
      }
    }

    console.log("\n🎉 Project imageIds consistency fix completed!");

    // Also fix car imageIds for consistency
    console.log("\n🚗 Fixing car imageIds consistency...");

    const cars = await db
      .collection("cars")
      .find({
        imageIds: { $exists: true, $ne: [] },
      })
      .toArray();

    console.log(`📋 Found ${cars.length} cars with imageIds`);

    for (const car of cars) {
      if (!car.imageIds || car.imageIds.length === 0) continue;

      let hasStringIds = false;
      const convertedIds = [];

      for (const id of car.imageIds) {
        if (typeof id === "string") {
          hasStringIds = true;
          if (ObjectId.isValid(id)) {
            convertedIds.push(new ObjectId(id));
          } else {
            convertedIds.push(id);
          }
        } else {
          convertedIds.push(id);
        }
      }

      if (hasStringIds) {
        await db
          .collection("cars")
          .updateOne({ _id: car._id }, { $set: { imageIds: convertedIds } });
        console.log(`  ✅ Updated car ${car._id}`);
      }
    }

    console.log("\n✅ All imageIds consistency fixes completed!");
  } catch (error) {
    console.error("❌ Fix failed:", error);
  } finally {
    await client.close();
  }
}

fixProjectImageIdsConsistency().catch(console.error);
