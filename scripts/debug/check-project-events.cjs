#!/usr/bin/env node

const { MongoClient, ObjectId } = require("mongodb");

async function checkProjectEvents() {
  const client = new MongoClient(
    process.env.MONGODB_URI || "mongodb://localhost:27017"
  );

  try {
    await client.connect();
    const db = client.db("motive_archive");

    console.log("🔍 CHECKING PROJECT EVENTS");
    console.log("=========================\n");

    const projectId = "68363783f3968cb1c1d4305b"; // Updated to correct project ID
    const carId = "6784b0e37a85711f907ba1e6";
    const eventId = "686d6224dc1f14e26c3d697a";

    // Check if project exists
    const project = await db.collection("projects").findOne({
      _id: new ObjectId(projectId),
    });

    if (!project) {
      console.log("❌ Project not found");
      return;
    }

    console.log("📋 PROJECT FOUND:");
    console.log("  _id:", project._id);
    console.log("  title:", project.title);
    console.log("  carIds:", project.carIds);
    console.log("  carIds count:", project.carIds?.length || 0);
    console.log("  eventIds:", project.eventIds);
    console.log("  eventIds count:", project.eventIds?.length || 0);

    // Check if the specific car is linked to this project
    const isCarLinked = project.carIds?.some((id) => {
      const idStr = id instanceof ObjectId ? id.toString() : id;
      return idStr === carId;
    });

    console.log("\n🚗 CAR LINKAGE:");
    console.log("  Target car ID:", carId);
    console.log("  Is car linked to project:", isCarLinked);

    // Check events for the specific car
    const carEvents = await db
      .collection("events")
      .find({
        car_id: carId,
      })
      .toArray();

    console.log("\n📅 CAR EVENTS:");
    console.log("  Events for car", carId, ":", carEvents.length);
    carEvents.forEach((event, index) => {
      console.log(
        `    [${index}] ${event._id} - "${event.title}" (${event.type})`
      );
      console.log(`        car_id: ${event.car_id}`);
      console.log(`        project_id: ${event.project_id || "none"}`);
      console.log(`        created: ${event.created_at}`);
    });

    // Check the specific event
    const specificEvent = await db.collection("events").findOne({
      _id: new ObjectId(eventId),
    });

    console.log("\n🎯 SPECIFIC EVENT:");
    console.log("  Event ID:", eventId);
    console.log("  Event found:", !!specificEvent);
    if (specificEvent) {
      console.log("  Title:", specificEvent.title);
      console.log("  Type:", specificEvent.type);
      console.log("  Car ID:", specificEvent.car_id);
      console.log("  Project ID:", specificEvent.project_id || "none");
      console.log("  Created:", specificEvent.created_at);
    }

    // Check project events
    const projectEvents = await db
      .collection("events")
      .find({
        project_id: projectId,
      })
      .toArray();

    console.log("\n📅 PROJECT EVENTS:");
    console.log("  Events for project", projectId, ":", projectEvents.length);
    projectEvents.forEach((event, index) => {
      console.log(
        `    [${index}] ${event._id} - "${event.title}" (${event.type})`
      );
      console.log(`        car_id: ${event.car_id || "none"}`);
      console.log(`        project_id: ${event.project_id}`);
    });

    // Check project_events collection (for attached events)
    const attachedEvents = await db
      .collection("project_events")
      .find({
        project_id: new ObjectId(projectId),
      })
      .toArray();

    console.log("\n🔗 ATTACHED EVENTS:");
    console.log("  Attached events for project:", attachedEvents.length);

    // Check if our specific event is attached
    const isEventAttached = attachedEvents.some((attachment) => {
      const attachedEventIdStr =
        attachment.event_id instanceof ObjectId
          ? attachment.event_id.toString()
          : attachment.event_id;
      return attachedEventIdStr === eventId;
    });

    console.log("  Is our event attached:", isEventAttached);

    attachedEvents.forEach((attachment, index) => {
      console.log(`    [${index}] Event ID: ${attachment.event_id}`);
      console.log(`        Attached by: ${attachment.attached_by}`);
      console.log(`        Attached at: ${attachment.attached_at}`);
    });

    // Check all events in the system
    const allEvents = await db.collection("events").find({}).toArray();
    console.log("\n📊 SYSTEM EVENTS:");
    console.log("  Total events in system:", allEvents.length);

    const eventsWithCars = allEvents.filter((e) => e.car_id);
    console.log("  Events with car_id:", eventsWithCars.length);

    const eventsWithProjects = allEvents.filter((e) => e.project_id);
    console.log("  Events with project_id:", eventsWithProjects.length);

    // Summary
    console.log("\n📊 SUMMARY:");
    console.log("  Project exists:", !!project);
    console.log("  Car linked to project:", isCarLinked);
    console.log("  Specific event exists:", !!specificEvent);
    console.log("  Event belongs to car:", specificEvent?.car_id === carId);
    console.log("  Event already attached:", isEventAttached);
    console.log("  Car has events:", carEvents.length > 0);
    console.log("  Project has direct events:", projectEvents.length > 0);
    console.log("  Project has attached events:", attachedEvents.length > 0);

    if (isCarLinked && specificEvent && !isEventAttached) {
      console.log("\n✅ EXPECTED BEHAVIOR:");
      console.log("  The event should appear in the attach events modal");
      console.log("  Event should NOT be filtered out");
    } else if (!isCarLinked) {
      console.log("\n❌ ISSUE FOUND:");
      console.log("  Car is not linked to this project");
      console.log("  Events will not show up in attach modal");
    } else if (!specificEvent) {
      console.log("\n❌ ISSUE FOUND:");
      console.log("  Event does not exist");
    } else if (isEventAttached) {
      console.log("\n❌ ISSUE FOUND:");
      console.log("  Event is already attached to this project");
      console.log("  That's why it's not showing in the attach modal");
    }
  } catch (error) {
    console.error("❌ Check failed:", error);
  } finally {
    await client.close();
  }
}

checkProjectEvents().catch(console.error);
