import { getDatabase } from "../src/lib/mongodb.js";
import { adminDb } from "../src/lib/firebase-admin.js";
import { DocumentData, QueryDocumentSnapshot } from "firebase-admin/firestore";

interface FirestoreUser {
  uid: string;
  displayName: string;
}

async function migrateDeliverables() {
  try {
    const mongodb = await getDatabase();
    const deliverables = mongodb.collection("deliverables");

    // Find all deliverables that have an editor field but no firebase_uid
    const deliverablesWithEditor = await deliverables
      .find({ editor: { $exists: true }, firebase_uid: { $exists: false } })
      .toArray();

    console.log(
      `Found ${deliverablesWithEditor.length} deliverables to migrate`
    );

    // Get all users from Firestore
    const usersSnapshot = await adminDb.collection("users").get();
    const userMap = new Map<string, string>();

    usersSnapshot.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
      const userData = doc.data() as FirestoreUser;
      if (userData.displayName) {
        userMap.set(userData.displayName, doc.id);
      }
    });

    console.log(`Found ${userMap.size} users in Firestore`);

    // Process each deliverable
    let updated = 0;
    let skipped = 0;
    let errors = 0;

    for (const deliverable of deliverablesWithEditor) {
      try {
        const editorName = deliverable.editor;
        const firebaseUid = userMap.get(editorName);

        if (firebaseUid) {
          // Update the deliverable with the firebase_uid
          await deliverables.updateOne(
            { _id: deliverable._id },
            {
              $set: { firebase_uid: firebaseUid },
              $unset: { editor: "" },
            }
          );
          updated++;
          console.log(
            `Updated deliverable ${deliverable._id} with firebase_uid ${firebaseUid}`
          );
        } else {
          console.log(`No matching user found for editor: ${editorName}`);
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

    console.log("Migration complete:", {
      total: deliverablesWithEditor.length,
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
migrateDeliverables();
