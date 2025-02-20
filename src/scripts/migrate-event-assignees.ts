import { getDatabase } from "@/lib/mongodb";
import { Collection, ObjectId } from "mongodb";

interface OldEvent {
  _id: ObjectId;
  assignee?: string;
}

interface NewEvent {
  assignees: string[];
}

async function migrateEventAssignees() {
  try {
    console.log("Starting event assignees migration...");
    const db = await getDatabase();
    const eventsCollection = db.collection<OldEvent & NewEvent>("events");

    // Find all events with the old assignee field
    const events = await eventsCollection
      .find({ assignee: { $exists: true } })
      .toArray();
    console.log(`Found ${events.length} events to migrate`);

    // Update each event
    let successCount = 0;
    let errorCount = 0;

    for (const event of events) {
      try {
        // Convert single assignee to array and remove old field
        const result = await eventsCollection.updateOne({ _id: event._id }, [
          {
            $set: {
              assignees: {
                $cond: {
                  if: { $eq: ["$assignee", null] },
                  then: [],
                  else: ["$assignee"],
                },
              },
            },
          },
          {
            $unset: "assignee",
          },
        ]);

        if (result.modifiedCount > 0) {
          successCount++;
        } else {
          errorCount++;
          console.error(`Failed to update event ${event._id}`);
        }
      } catch (error) {
        errorCount++;
        console.error(`Error updating event ${event._id}:`, error);
      }
    }

    console.log("Migration completed:");
    console.log(`Successfully migrated: ${successCount} events`);
    console.log(`Failed to migrate: ${errorCount} events`);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

// Run the migration
migrateEventAssignees()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Migration failed:", error);
    process.exit(1);
  });
