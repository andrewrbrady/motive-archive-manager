#!/usr/bin/env node

const { MongoClient, ObjectId } = require("mongodb");

async function checkProjectImagesData() {
  const client = new MongoClient(
    process.env.MONGODB_URI || "mongodb://localhost:27017"
  );

  try {
    await client.connect();
    const db = client.db("motive_archive");

    console.log("🔍 CHECKING PROJECT IMAGES DATA");
    console.log("===============================\n");

    const testProjectId = "6833cacc214fd075f219ab41";

    // Check project document
    const project = await db.collection("projects").findOne({
      _id: new ObjectId(testProjectId),
    });

    console.log("📋 PROJECT DOCUMENT:");
    console.log("  _id:", project?._id);
    console.log("  title:", project?.title);
    console.log("  imageIds count:", project?.imageIds?.length || 0);
    console.log("  imageIds types:");
    project?.imageIds?.forEach((id, index) => {
      console.log(`    [${index}] ${id} (${typeof id}) ${id.constructor.name}`);
    });

    // Check images with projectId as ObjectId
    console.log("\n🔍 QUERY 1: Images with projectId as ObjectId");
    const imagesAsObjectId = await db
      .collection("images")
      .find({
        projectId: new ObjectId(testProjectId),
      })
      .toArray();

    console.log(`  Found: ${imagesAsObjectId.length} images`);
    imagesAsObjectId.forEach((img, index) => {
      console.log(
        `    [${index}] ${img._id} - projectId: ${img.projectId} (${typeof img.projectId}) ${img.projectId?.constructor?.name}`
      );
    });

    // Check images with projectId as string
    console.log("\n🔍 QUERY 2: Images with projectId as string");
    const imagesAsString = await db
      .collection("images")
      .find({
        projectId: testProjectId,
      })
      .toArray();

    console.log(`  Found: ${imagesAsString.length} images`);
    imagesAsString.forEach((img, index) => {
      console.log(
        `    [${index}] ${img._id} - projectId: ${img.projectId} (${typeof img.projectId}) ${img.projectId?.constructor?.name}`
      );
    });

    // Check all images that might be related to this project
    console.log("\n🔍 QUERY 3: All images with any reference to this project");
    const allRelated = await db
      .collection("images")
      .find({
        $or: [
          { projectId: new ObjectId(testProjectId) },
          { projectId: testProjectId },
          { "metadata.projectId": testProjectId },
          { "metadata.projectId": new ObjectId(testProjectId) },
        ],
      })
      .toArray();

    console.log(`  Found: ${allRelated.length} images total`);
    allRelated.forEach((img, index) => {
      console.log(
        `    [${index}] ${img._id} - projectId: ${img.projectId} (${typeof img.projectId})`
      );
      console.log(`        metadata.projectId: ${img.metadata?.projectId}`);
      console.log(`        filename: ${img.filename}`);
    });

    // Check recently uploaded images
    console.log("\n🔍 QUERY 4: Recent images (last 2 hours)");
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const recentImages = await db
      .collection("images")
      .find({
        createdAt: { $gte: twoHoursAgo },
      })
      .sort({ createdAt: -1 })
      .toArray();

    console.log(`  Found: ${recentImages.length} recent images`);
    recentImages.forEach((img, index) => {
      console.log(
        `    [${index}] ${img._id} - projectId: ${img.projectId} (${typeof img.projectId})`
      );
      console.log(`        filename: ${img.filename}`);
      console.log(`        created: ${img.createdAt}`);
    });
  } catch (error) {
    console.error("❌ Check failed:", error);
  } finally {
    await client.close();
  }
}

checkProjectImagesData().catch(console.error);
