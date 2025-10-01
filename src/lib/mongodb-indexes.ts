import { Db } from "mongodb";
import { getDatabase } from "./mongodb";

interface IndexDefinition {
  collection: string;
  index: Record<string, 1 | -1>;
  options?: {
    name?: string;
    unique?: boolean;
    background?: boolean;
    sparse?: boolean;
  };
}

// Define critical indexes for performance optimization
const CRITICAL_INDEXES: IndexDefinition[] = [
  // Projects collection - most critical for project detail pages
  {
    collection: "projects",
    index: { ownerId: 1 },
    options: { name: "projects_ownerId", background: true },
  },
  {
    collection: "projects",
    index: { "members.userId": 1 },
    options: { name: "projects_members_userId", background: true },
  },
  {
    collection: "projects",
    index: { _id: 1, ownerId: 1 },
    options: { name: "projects_id_owner", background: true },
  },

  // Events collection - critical for events tab
  {
    collection: "events",
    index: { projectId: 1 },
    options: { name: "events_projectId", background: true },
  },
  {
    collection: "events",
    index: { carId: 1 },
    options: { name: "events_carId", background: true, sparse: true },
  },

  // Project events collection - for attached events
  {
    collection: "project_events",
    index: { project_id: 1 },
    options: { name: "project_events_project_id", background: true },
  },
  {
    collection: "project_events",
    index: { event_id: 1 },
    options: { name: "project_events_event_id", background: true },
  },

  // Cars collection - for car lookups
  {
    collection: "cars",
    index: { _id: 1 },
    options: { name: "cars_id", background: true },
  },

  // Project captions collection - for copywriter tab
  {
    collection: "project_captions",
    index: { projectId: 1 },
    options: { name: "project_captions_projectId", background: true },
  },
  {
    collection: "project_captions",
    index: { projectId: 1, createdAt: -1 },
    options: { name: "project_captions_project_created", background: true },
  },
];

/**
 * Create database indexes for performance optimization
 * This should be called during application startup or via a script
 */
export async function createPerformanceIndexes(): Promise<void> {
  console.time("create-indexes");

  try {
    const db = await getDatabase();

    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("🔧 Creating performance indexes...");

    const results = await Promise.allSettled(
      CRITICAL_INDEXES.map(async ({ collection, index, options }) => {
        try {
          // Check if index already exists
          const existingIndexes = await db.collection(collection).indexes();
          const indexName = options?.name || `${Object.keys(index).join("_")}`;

          const exists = existingIndexes.some(
            (idx) =>
              idx.name === indexName ||
              JSON.stringify(idx.key) === JSON.stringify(index)
          );

          if (exists) {
            console.log(
              `✅ Index ${indexName} already exists on ${collection}`
            );
            return { collection, index: indexName, status: "exists" };
          }

          // Create the index
          const result = await db
            .collection(collection)
            .createIndex(index, options);
          console.log(
            `✅ Created index ${result} on ${collection}.${Object.keys(index).join(",")}`
          );

          return { collection, index: result, status: "created" };
        } catch (error) {
          console.error(`❌ Failed to create index on ${collection}:`, error);
          throw error;
        }
      })
    );

    // Summary of results
    const successful = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    console.log(
      `📊 Index creation summary: ${successful} successful, ${failed} failed`
    );

    if (failed > 0) {
      console.warn(
        "Some indexes failed to create. Check logs above for details."
      );
    }
  } catch (error) {
    console.error("💥 Error creating performance indexes:", error);
    throw error;
  } finally {
    console.timeEnd("create-indexes");
  }
}

/**
 * Check which indexes exist in the database
 */
export async function checkIndexes(): Promise<Record<string, any[]>> {
  try {
    const db = await getDatabase();
    const collections = [
      "projects",
      "events",
      "project_events",
      "cars",
      "project_captions",
    ];

    const indexInfo: Record<string, any[]> = {};

    for (const collection of collections) {
      try {
        const indexes = await db.collection(collection).indexes();
        indexInfo[collection] = indexes.map((idx) => ({
          name: idx.name,
          key: idx.key,
          unique: idx.unique || false,
          sparse: idx.sparse || false,
        }));
      } catch (error) {
        console.warn(`Could not check indexes for ${collection}:`, error);
        indexInfo[collection] = [];
      }
    }

    return indexInfo;
  } catch (error) {
    console.error("Error checking indexes:", error);
    return {};
  }
}
