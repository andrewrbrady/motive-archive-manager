import { NextRequest, NextResponse } from "next/server";
import { withFirebaseAuth } from "@/lib/firebase-auth-middleware";
import { adminDb } from "@/lib/firebase-admin";

/**
 * Firestore index definition
 */
interface IndexDefinition {
  collectionGroup: string;
  queryScope: "COLLECTION" | "COLLECTION_GROUP";
  fields: {
    fieldPath: string;
    order: "ASCENDING" | "DESCENDING" | "ARRAY_CONTAINS";
  }[];
}

// Define the response type
interface FirestoreIndexesResponse {
  message: string;
  indexes: IndexDefinition[];
  instructions: {
    cli: string;
    console: string;
  };
}

// Define error response
interface ErrorResponse {
  error: string;
}

/**
 * Recommended indexes for Firestore collections
 */
const RECOMMENDED_INDEXES: IndexDefinition[] = [
  // Users collection indexes
  {
    collectionGroup: "users",
    queryScope: "COLLECTION",
    fields: [
      { fieldPath: "roles", order: "ARRAY_CONTAINS" },
      { fieldPath: "name", order: "ASCENDING" },
    ],
  },
  {
    collectionGroup: "users",
    queryScope: "COLLECTION",
    fields: [
      { fieldPath: "creativeRoles", order: "ARRAY_CONTAINS" },
      { fieldPath: "name", order: "ASCENDING" },
    ],
  },
  {
    collectionGroup: "users",
    queryScope: "COLLECTION",
    fields: [
      { fieldPath: "status", order: "ASCENDING" },
      { fieldPath: "name", order: "ASCENDING" },
    ],
  },
  {
    collectionGroup: "users",
    queryScope: "COLLECTION",
    fields: [{ fieldPath: "email", order: "ASCENDING" }],
  },
  {
    collectionGroup: "users",
    queryScope: "COLLECTION",
    fields: [{ fieldPath: "mongoId", order: "ASCENDING" }],
  },

  // API tokens collection indexes
  {
    collectionGroup: "api_tokens",
    queryScope: "COLLECTION",
    fields: [
      { fieldPath: "token", order: "ASCENDING" },
      { fieldPath: "expiresAt", order: "ASCENDING" },
    ],
  },
  {
    collectionGroup: "api_tokens",
    queryScope: "COLLECTION",
    fields: [
      { fieldPath: "userId", order: "ASCENDING" },
      { fieldPath: "expiresAt", order: "ASCENDING" },
    ],
  },
];

/**
 * API endpoint to create recommended Firestore indexes
 * This should be run once during setup or after adding new index definitions
 * Only accessible to admin users
 */
async function createFirestoreIndexes(
  request: NextRequest
): Promise<NextResponse<FirestoreIndexesResponse>> {
  try {
    // Check for FIREBASE_PROJECT_ID
    const projectId = process.env.FIREBASE_PROJECT_ID;
    if (!projectId) {
      throw new Error("FIREBASE_PROJECT_ID is not set");
    }

    // Helper function to check if index exists (approximate matching)
    const doesIndexExist = (existingIndexes: any[], index: IndexDefinition) => {
      return existingIndexes.some((existing) => {
        // Compare collection group
        if (existing.collectionGroup !== index.collectionGroup) return false;

        // Compare query scope
        if (existing.queryScope !== index.queryScope) return false;

        // Compare fields (field paths and order directions)
        if (existing.fields.length !== index.fields.length) return false;

        // Check if all fields match
        return index.fields.every(
          (field, i) =>
            existing.fields[i].fieldPath === field.fieldPath &&
            existing.fields[i].order === field.order
        );
      });
    };

    // We can't directly create indexes via Admin SDK, so provide instructions
    // on how to create them manually or via Firebase CLI

    const results: FirestoreIndexesResponse = {
      message: "Firestore indexes information",
      indexes: RECOMMENDED_INDEXES,
      instructions: {
        cli: `To create these indexes using Firebase CLI, run:
        firebase firestore:indexes --project=${projectId}
        
        And paste the following index definitions:
        
        {
          "indexes": ${JSON.stringify(RECOMMENDED_INDEXES, null, 2)}
        }`,
        console:
          "You can also create these indexes manually in the Firebase Console",
      },
    };

    return NextResponse.json(results);
  } catch (error: any) {
    console.error("Error creating Firestore indexes:", error);
    // Instead of returning a different type, throw an error that will be caught by the middleware
    throw new Error(error.message || "Failed to create Firestore indexes");
  }
}

export const GET = withFirebaseAuth(createFirestoreIndexes, ["admin"]);
