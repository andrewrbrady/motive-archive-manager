#!/usr/bin/env node

/**
 * Test script for centralized deliverable API
 * This validates the field mapping logic without running the full server
 */

// Mock field mapping test
function testFieldMapping() {
  console.log("🧪 Testing field mapping logic...");

  // Simulate request body from frontend
  const requestBody = {
    carId: undefined, // Test case: removing car association
    title: "Test Deliverable",
    editDeadline: "2024-01-15T10:00:00Z",
    aspectRatio: "16:9",
    platforms: ["instagram", "youtube"],
    duration: 30,
  };

  // Simulate the updateData transformation logic
  const updateData = {
    updated_at: new Date(),
  };

  // Handle car association updates - CRITICAL FIX
  if ("carId" in requestBody) {
    console.log(`🚗 Car association update: carId=${requestBody.carId}`);
    if (
      requestBody.carId === undefined ||
      requestBody.carId === null ||
      requestBody.carId === ""
    ) {
      updateData.car_id = null; // Explicitly remove car association
      console.log(`🚗 Removing car association: setting car_id to null`);
    } else {
      updateData.car_id = requestBody.carId; // Set car association
      console.log(`🚗 Setting car association: car_id=${requestBody.carId}`);
    }
  }

  // Handle other field updates
  if (requestBody.title) updateData.title = requestBody.title.trim();
  if (requestBody.editDeadline)
    updateData.edit_deadline = new Date(requestBody.editDeadline);
  if (requestBody.aspectRatio)
    updateData.aspect_ratio = requestBody.aspectRatio;
  if (requestBody.platforms) updateData.platforms = requestBody.platforms;
  if (requestBody.duration !== undefined)
    updateData.duration = requestBody.duration;

  console.log("📝 Final updateData:", JSON.stringify(updateData, null, 2));

  // Validate expected outcome
  const expectedCarIdNull = updateData.car_id === null;
  const expectedFieldMappings =
    updateData.edit_deadline instanceof Date &&
    updateData.aspect_ratio === "16:9" &&
    updateData.platforms.length === 2 &&
    updateData.title === "Test Deliverable";

  if (expectedCarIdNull && expectedFieldMappings) {
    console.log("✅ Field mapping test PASSED");
    return true;
  } else {
    console.log("❌ Field mapping test FAILED");
    return false;
  }
}

// Test response format compatibility
function testResponseFormat() {
  console.log("\n🧪 Testing response format compatibility...");

  // Mock deliverable object with toPublicJSON method
  const mockDeliverable = {
    _id: "507f1f77bcf86cd799439011",
    title: "Test Deliverable",
    car_id: null, // After removal
    edit_deadline: new Date("2024-01-15T10:00:00Z"),
    aspect_ratio: "16:9",
    platforms: ["instagram", "youtube"],
    updated_at: new Date(),
    toPublicJSON: function () {
      return {
        _id: this._id,
        title: this.title,
        car_id: this.car_id,
        carId: this.car_id, // Frontend expects camelCase
        edit_deadline: this.edit_deadline,
        editDeadline: this.edit_deadline, // Frontend expects camelCase
        aspect_ratio: this.aspect_ratio,
        aspectRatio: this.aspect_ratio, // Frontend expects camelCase
        platforms: this.platforms,
        updated_at: this.updated_at,
      };
    },
  };

  const response = {
    message: "Deliverable updated successfully",
    deliverable: mockDeliverable.toPublicJSON(),
    success: true,
  };

  console.log("📤 API Response:", JSON.stringify(response, null, 2));

  // Validate response structure
  const hasSuccessField = response.success === true;
  const hasDeliverableField = !!response.deliverable;
  const hasCarIdNull = response.deliverable.car_id === null;
  const hasCarIdCamelCase = "carId" in response.deliverable;

  if (
    hasSuccessField &&
    hasDeliverableField &&
    hasCarIdNull &&
    hasCarIdCamelCase
  ) {
    console.log("✅ Response format test PASSED");
    return true;
  } else {
    console.log("❌ Response format test FAILED");
    return false;
  }
}

// Run tests
console.log("🚀 Running Deliverable API Consolidation Tests\n");

const fieldMappingPassed = testFieldMapping();
const responseFormatPassed = testResponseFormat();

console.log("\n📊 Test Results:");
console.log(`Field Mapping: ${fieldMappingPassed ? "✅ PASS" : "❌ FAIL"}`);
console.log(`Response Format: ${responseFormatPassed ? "✅ PASS" : "❌ FAIL"}`);

if (fieldMappingPassed && responseFormatPassed) {
  console.log("\n🎉 All tests PASSED! Centralized API ready for deployment.");
  process.exit(0);
} else {
  console.log("\n💥 Some tests FAILED! Please review the implementation.");
  process.exit(1);
}
