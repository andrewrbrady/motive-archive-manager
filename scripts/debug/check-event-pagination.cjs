#!/usr/bin/env node

const { MongoClient, ObjectId } = require("mongodb");

async function checkEventPagination() {
  const client = new MongoClient(
    process.env.MONGODB_URI || "mongodb://localhost:27017"
  );

  try {
    await client.connect();
    const db = client.db("motive_archive");

    console.log("🔍 CHECKING EVENT PAGINATION");
    console.log("============================\n");

    const targetEventId = "686d6224dc1f14e26c3d697a";
    const targetCarId = "6784b0e37a85711f907ba1e6";

    // Get total number of events
    const totalEvents = await db.collection("events").countDocuments({});
    console.log("📊 TOTAL EVENTS IN SYSTEM:", totalEvents);

    // Get all events sorted by start date (same as API)
    const allEvents = await db
      .collection("events")
      .find({})
      .sort({ start: 1 })
      .toArray();

    console.log("📊 EVENTS SORTED BY START DATE:", allEvents.length);

    // Find our target event's position
    const targetEventIndex = allEvents.findIndex(
      (event) => event._id.toString() === targetEventId
    );

    if (targetEventIndex === -1) {
      console.log("❌ TARGET EVENT NOT FOUND");
      return;
    }

    console.log("\n🎯 TARGET EVENT POSITION:");
    console.log("  Event ID:", targetEventId);
    console.log("  Position in sorted list:", targetEventIndex + 1);
    console.log(
      "  Page (20 per page):",
      Math.ceil((targetEventIndex + 1) / 20)
    );
    console.log(
      "  Page (50 per page):",
      Math.ceil((targetEventIndex + 1) / 50)
    );

    const targetEvent = allEvents[targetEventIndex];
    console.log("  Event details:");
    console.log("    Title:", targetEvent.title);
    console.log("    Start date:", targetEvent.start);
    console.log("    Car ID:", targetEvent.car_id);
    console.log("    Project ID:", targetEvent.project_id || "none");

    // Check events in first 20 (default API limit)
    const first20Events = allEvents.slice(0, 20);
    const isInFirst20 = first20Events.some(
      (event) => event._id.toString() === targetEventId
    );

    console.log("\n📄 PAGINATION ANALYSIS:");
    console.log("  Is target event in first 20 results:", isInFirst20);
    console.log("  First 20 events date range:");
    if (first20Events.length > 0) {
      console.log("    Earliest:", first20Events[0].start);
      console.log("    Latest:", first20Events[first20Events.length - 1].start);
    }

    console.log("\n🔍 EVENTS WITH CAR_ID", targetCarId + ":");
    const eventsForCar = allEvents.filter(
      (event) => event.car_id === targetCarId
    );
    eventsForCar.forEach((event, index) => {
      const position =
        allEvents.findIndex((e) => e._id.toString() === event._id.toString()) +
        1;
      console.log(
        `    [${index}] ${event._id} - "${event.title}" (position ${position})`
      );
    });

    // Show events around our target event
    console.log("\n📍 EVENTS AROUND TARGET EVENT:");
    const start = Math.max(0, targetEventIndex - 5);
    const end = Math.min(allEvents.length, targetEventIndex + 6);

    for (let i = start; i < end; i++) {
      const event = allEvents[i];
      const marker = i === targetEventIndex ? " >>> TARGET <<<" : "";
      console.log(
        `    [${i + 1}] ${event._id} - "${event.title}" (${event.start})${marker}`
      );
    }
  } catch (error) {
    console.error("❌ Check failed:", error);
  } finally {
    await client.close();
  }
}

checkEventPagination().catch(console.error);
