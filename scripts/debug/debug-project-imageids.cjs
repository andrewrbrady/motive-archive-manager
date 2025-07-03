#!/usr/bin/env node

const { MongoClient, ObjectId } = require("mongodb");

async function debugProjectImageIds() {
  const client = new MongoClient(
    process.env.MONGODB_URI || "mongodb://localhost:27017"
  );

  try {
    await client.connect();
    const db = client.db("motive_archive");

    console.log("🔍 DEBUGGING PROJECT IMAGEIDS DATA TYPES");
    console.log("=========================================\n");

    // Find the test project
    const testProject = await db.collection("projects").findOne({
      _id: new ObjectId("6833cacc214fd075f219ab41"),
    });

    if (!testProject) {
      console.log("❌ Test project not found");
      return;
    }

    console.log("📋 Project Info:");
    console.log("  _id:", testProject._id.toString());
    console.log("  title:", testProject.title);
    console.log("  imageIds type:", typeof testProject.imageIds);
    console.log("  imageIds array:", testProject.imageIds);

    if (testProject.imageIds && testProject.imageIds.length > 0) {
      console.log("\n📊 ImageIds Analysis:");
      testProject.imageIds.forEach((id, index) => {
        console.log(`  [${index}] Value: ${id}`);
        console.log(`  [${index}] Type: ${typeof id}`);
        console.log(`  [${index}] Constructor: ${id.constructor.name}`);
        console.log(`  [${index}] Is ObjectId: ${id instanceof ObjectId}`);
        console.log("  ---");
      });
    }

    // Test what we would be adding
    const testImageId = new ObjectId();
    console.log("\n🧪 Testing New ImageId:");
    console.log("  New imageId:", testImageId.toString());
    console.log("  Type:", typeof testImageId);
    console.log("  Constructor:", testImageId.constructor.name);
    console.log("  Is ObjectId:", testImageId instanceof ObjectId);

    // Check if existing IDs match the new format
    if (testProject.imageIds && testProject.imageIds.length > 0) {
      const firstExisting = testProject.imageIds[0];
      console.log("\n🔄 Compatibility Check:");
      console.log(
        "  Existing matches new format:",
        firstExisting.constructor.name === testImageId.constructor.name
      );
      console.log(
        "  Types match:",
        typeof firstExisting === typeof testImageId
      );
    }

    // Test the actual update operation
    console.log("\n🔄 Testing Update Operation...");

    const testUpdateResult = await db.collection("projects").updateOne(
      { _id: new ObjectId("6833cacc214fd075f219ab41") },
      { $addToSet: { test_imageIds: testImageId } } // Using addToSet to avoid duplicates
    );

    console.log("📊 Update Result:");
    console.log("  matched:", testUpdateResult.matchedCount);
    console.log("  modified:", testUpdateResult.modifiedCount);
    console.log("  acknowledged:", testUpdateResult.acknowledged);

    // Check the result
    const updatedProject = await db.collection("projects").findOne({
      _id: new ObjectId("6833cacc214fd075f219ab41"),
    });

    console.log("\n📋 After Test Update:");
    console.log("  test_imageIds exists:", !!updatedProject.test_imageIds);
    console.log("  test_imageIds:", updatedProject.test_imageIds);

    // Cleanup
    await db
      .collection("projects")
      .updateOne(
        { _id: new ObjectId("6833cacc214fd075f219ab41") },
        { $unset: { test_imageIds: "" } }
      );
    console.log("✅ Test field cleaned up");
  } catch (error) {
    console.error("❌ Debug failed:", error);
  } finally {
    await client.close();
  }
}

debugProjectImageIds().catch(console.error);
