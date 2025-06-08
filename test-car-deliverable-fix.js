// Test script to validate car deliverable endpoint fix
// This simulates the logic from the fixed PUT endpoint

function testCarDeliverableLogic() {
  console.log("🧪 Testing car deliverable endpoint logic...\n");

  // Test cases based on the frontend behavior
  const testCases = [
    {
      name: "Remove car association (carId: undefined)",
      data: { _id: "someId", carId: undefined, title: "Test Deliverable" },
      expectedCarId: null,
    },
    {
      name: "Remove car association (carId: null)",
      data: { _id: "someId", carId: null, title: "Test Deliverable" },
      expectedCarId: null,
    },
    {
      name: "Set car association (valid carId)",
      data: {
        _id: "someId",
        carId: "6828d039fd0653415c46d38c",
        title: "Test Deliverable",
      },
      expectedCarId: "6828d039fd0653415c46d38c",
    },
    {
      name: "No carId in data (no change)",
      data: { _id: "someId", title: "Test Deliverable" },
      expectedCarId: "no-change",
    },
  ];

  testCases.forEach((testCase, index) => {
    console.log(`Test ${index + 1}: ${testCase.name}`);
    console.log(`Input data:`, testCase.data);

    // Simulate the logic from our fix
    const { _id, ...updateData } = testCase.data;

    // Handle car association updates (our fix)
    if ("carId" in testCase.data) {
      console.log(`🚗 Car association update: carId=${testCase.data.carId}`);
      if (testCase.data.carId === undefined || testCase.data.carId === null) {
        updateData.car_id = null; // Explicitly remove car association
        console.log(`🚗 Removing car association: setting car_id to null`);
      } else {
        updateData.car_id = testCase.data.carId; // Set car association
        console.log(
          `🚗 Setting car association: car_id=${testCase.data.carId}`
        );
      }
    }

    const updateFields = {
      ...updateData,
      updated_at: new Date(),
    };

    console.log(`Result updateFields.car_id:`, updateFields.car_id);

    // Validate result
    if (testCase.expectedCarId === "no-change") {
      const passed = !("car_id" in updateFields);
      console.log(`✅ Expected: no car_id field in updateFields`);
      console.log(
        `${passed ? "✅ PASS" : "❌ FAIL"}: car_id field ${passed ? "not present" : "present"} as expected\n`
      );
    } else {
      const passed = updateFields.car_id === testCase.expectedCarId;
      console.log(`✅ Expected car_id: ${testCase.expectedCarId}`);
      console.log(
        `${passed ? "✅ PASS" : "❌ FAIL"}: car_id matches expected value\n`
      );
    }
  });

  console.log(
    "🎉 Test completed! All tests should show ✅ PASS for the fix to be working correctly."
  );
}

// Run the test
testCarDeliverableLogic();
