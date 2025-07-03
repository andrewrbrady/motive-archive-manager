#!/usr/bin/env node

const { MongoClient, ObjectId } = require("mongodb");

async function detailedProjectUploadTest() {
  const client = new MongoClient(
    process.env.MONGODB_URI || "mongodb://localhost:27017"
  );

  try {
    await client.connect();
    const db = client.db("motive_archive");

    console.log("🔍 DETAILED PROJECT UPLOAD DEBUG");
    console.log("=================================\n");

    const testProjectId = "6833cacc214fd075f219ab41";

    // Step 1: Check project before upload
    const beforeProject = await db.collection("projects").findOne({
      _id: new ObjectId(testProjectId),
    });

    console.log("📋 BEFORE UPLOAD:");
    console.log("  ImageIds count:", beforeProject?.imageIds?.length || 0);
    console.log("  ImageIds array:");
    beforeProject?.imageIds?.forEach((id, index) => {
      console.log(`    [${index}] ${id} (${typeof id}) ${id.constructor.name}`);
    });

    // Step 2: Simulate upload
    const testFormData = new FormData();
    testFormData.append("cloudflareId", "detailed-test-" + Date.now());
    testFormData.append("imageUrl", "https://test-detailed.com/test.jpg");
    testFormData.append("fileName", "detailed-test.jpg");
    testFormData.append("selectedPromptId", "default");
    testFormData.append("selectedModelId", "none");
    testFormData.append(
      "metadata",
      JSON.stringify({
        projectId: testProjectId,
        category: "project",
      })
    );

    const response = await fetch(
      "http://localhost:3000/api/cloudflare/images/analyze",
      {
        method: "POST",
        body: testFormData,
      }
    );

    if (!response.ok) {
      console.log("❌ API Error:", response.status);
      return;
    }

    const result = await response.json();
    console.log("\n✅ Upload successful, imageId:", result.imageId);
    console.log("  ImageId type:", typeof result.imageId);

    // Step 3: Check project after upload
    const afterProject = await db.collection("projects").findOne({
      _id: new ObjectId(testProjectId),
    });

    console.log("\n📋 AFTER UPLOAD:");
    console.log("  ImageIds count:", afterProject?.imageIds?.length || 0);
    console.log("  ImageIds array:");
    afterProject?.imageIds?.forEach((id, index) => {
      console.log(`    [${index}] ${id} (${typeof id}) ${id.constructor.name}`);
    });

    // Step 4: Check comparison logic
    console.log("\n🔍 COMPARISON ANALYSIS:");
    console.log("  Looking for imageId:", result.imageId);
    console.log("  As ObjectId:", new ObjectId(result.imageId));

    const foundByString = afterProject?.imageIds?.some(
      (id) => id.toString() === result.imageId
    );
    const foundByIncludes = afterProject?.imageIds?.includes(result.imageId);
    const foundByObjectId = afterProject?.imageIds?.some(
      (id) => id.equals && id.equals(new ObjectId(result.imageId))
    );

    console.log("  Found by string comparison:", foundByString);
    console.log("  Found by includes():", foundByIncludes);
    console.log("  Found by ObjectId.equals():", foundByObjectId);

    // Step 5: Cleanup
    console.log("\n🧹 Cleaning up...");
    await db
      .collection("images")
      .deleteOne({ _id: new ObjectId(result.imageId) });
    await db
      .collection("projects")
      .updateOne(
        { _id: new ObjectId(testProjectId) },
        { $pull: { imageIds: new ObjectId(result.imageId) } }
      );
    console.log("✅ Cleanup completed");
  } catch (error) {
    console.error("❌ Test failed:", error);
  } finally {
    await client.close();
  }
}

detailedProjectUploadTest().catch(console.error);
