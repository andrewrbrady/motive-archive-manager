import { getDatabase } from "../src/lib/mongodb.js";
import { adminDb } from "../src/lib/firebase-admin.js";
import { DocumentData, QueryDocumentSnapshot } from "firebase-admin/firestore";

interface FirestoreUser {
  uid: string;
  name: string;
  email: string;
}

async function migrateAndrewBradyDeliverables() {
  try {
    const mongodb = await getDatabase();
    const deliverables = mongodb.collection("deliverables");

    // Find all deliverables assigned to Andrew Brady
    const andrewDeliverables = await deliverables
      .find({
        $or: [
          { editor: "Andrew Brady" },
          { firebase_uid: "115667720852671300123" }, // Legacy OAuth UID
          { firebase_uid: "dc7fe9cd-1f34-4c9d-84cb-f967e2064448" }, // UUID OAuth UID
        ],
      })
      .toArray();

    console.log(
      `Found ${andrewDeliverables.length} deliverables assigned to Andrew Brady`
    );

    // Get Andrew Brady's correct Firebase UID from Firestore
    // We want the andrew@motivearchive.com user (test user), not the admin
    const andrewDoc = await adminDb
      .collection("users")
      .where("email", "==", "andrew@motivearchive.com")
      .limit(1)
      .get();

    if (andrewDoc.empty) {
      console.error(
        "Could not find Andrew Brady (andrew@motivearchive.com) in Firestore"
      );
      return;
    }

    const andrewData = andrewDoc.docs[0].data() as FirestoreUser;
    const correctFirebaseUid = andrewDoc.docs[0].id;

    console.log(
      `Found Andrew Brady in Firestore with UID: ${correctFirebaseUid}`
    );
    console.log(`Email: ${andrewData.email}`);
    console.log(`Name: ${andrewData.name}`);

    // Process each deliverable
    let updated = 0;
    let skipped = 0;
    let errors = 0;

    for (const deliverable of andrewDeliverables) {
      try {
        // Check if this deliverable already has the correct UID
        if (deliverable.firebase_uid === correctFirebaseUid) {
          console.log(
            `Deliverable ${deliverable._id} already has correct UID, skipping`
          );
          skipped++;
          continue;
        }

        // Update the deliverable with the correct firebase_uid
        const result = await deliverables.updateOne(
          { _id: deliverable._id },
          {
            $set: {
              firebase_uid: correctFirebaseUid,
              editor: "Andrew Brady", // Ensure editor name is consistent
            },
          }
        );

        if (result.modifiedCount > 0) {
          updated++;
          console.log(
            `Updated deliverable "${deliverable.title}" (${deliverable._id}) ` +
              `from UID ${deliverable.firebase_uid} to ${correctFirebaseUid}`
          );
        } else {
          console.log(`No changes made to deliverable ${deliverable._id}`);
          skipped++;
        }
      } catch (error) {
        console.error(
          `Error processing deliverable ${deliverable._id}:`,
          error
        );
        errors++;
      }
    }

    console.log("Andrew Brady deliverables migration complete:", {
      total: andrewDeliverables.length,
      updated,
      skipped,
      errors,
    });
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

// Run the migration
migrateAndrewBradyDeliverables();
