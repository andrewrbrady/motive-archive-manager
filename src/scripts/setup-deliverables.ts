import { connectToDatabase } from "../lib/mongodb";

async function setupDeliverables() {
  try {
    const { db } = await connectToDatabase();

    // Create the deliverables collection
    await db.createCollection("deliverables");
    console.log("Created deliverables collection");

    // Create indexes
    const indexes = [
      { key: { car_id: 1 }, name: "car_id_idx" },
      { key: { status: 1 }, name: "status_idx" },
      { key: { platform: 1 }, name: "platform_idx" },
      { key: { type: 1 }, name: "type_idx" },
      { key: { editor: 1 }, name: "editor_idx" },
      { key: { edit_deadline: 1 }, name: "edit_deadline_idx" },
      { key: { release_date: 1 }, name: "release_date_idx" },
      { key: { created_at: 1 }, name: "created_at_idx" },
      // Compound indexes for common queries
      { key: { car_id: 1, status: 1 }, name: "car_status_idx" },
      { key: { car_id: 1, platform: 1 }, name: "car_platform_idx" },
    ];

    await Promise.all(
      indexes.map((index) =>
        db
          .collection("deliverables")
          .createIndex(index.key, { name: index.name })
      )
    );
    console.log("Created indexes for deliverables collection");

    process.exit(0);
  } catch (error) {
    console.error("Error setting up deliverables:", error);
    process.exit(1);
  }
}

setupDeliverables();
