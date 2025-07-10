#!/usr/bin/env node

// Test script to check if events API is working
console.log("🔍 Testing Events API Authentication");
console.log("===================================");

// This script simulates what the frontend should be doing
const testEventsAPI = async () => {
  try {
    const response = await fetch("http://localhost:3000/api/events", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        // Note: In real browser, this would include authentication headers
        // The frontend should be adding these automatically via useAPI hook
      },
    });

    console.log("Response status:", response.status);
    console.log(
      "Response headers:",
      Object.fromEntries(response.headers.entries())
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.log("❌ API Error:", errorText);
      return;
    }

    const data = await response.json();
    console.log("✅ API Success!");
    console.log("Events returned:", data.events?.length || 0);

    // Look for our specific event
    if (data.events) {
      const targetEvent = data.events.find(
        (e) => e.id === "686d6224dc1f14e26c3d697a"
      );
      console.log("Target event found:", !!targetEvent);
      if (targetEvent) {
        console.log("Event details:", {
          id: targetEvent.id,
          title: targetEvent.title,
          car_id: targetEvent.car_id,
          project_id: targetEvent.project_id,
        });
      }
    }
  } catch (error) {
    console.error("❌ Test failed:", error.message);
  }
};

testEventsAPI();
