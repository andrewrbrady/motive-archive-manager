import { Db } from "mongodb";
import { getDatabase } from "@/lib/mongodb";

/**
 * Database Indexes Management - Phase 3 Performance Optimization
 *
 * This module manages MongoDB indexes for optimal query performance.
 * Based on the performance plan analysis of frequently queried fields.
 */

export interface IndexDefinition {
  collection: string;
  index: Record<string, 1 | -1 | "text">;
  options?: {
    name?: string;
    unique?: boolean;
    sparse?: boolean;
    background?: boolean;
    partialFilterExpression?: Record<string, any>;
  };
}

/**
 * Critical indexes based on performance analysis
 */
export const PERFORMANCE_INDEXES: IndexDefinition[] = [
  // Images collection - heavily queried in gallery components
  {
    collection: "images",
    index: { carId: 1, "metadata.category": 1 },
    options: { name: "carId_category_idx", background: true },
  },
  {
    collection: "images",
    index: { createdAt: -1 },
    options: { name: "createdAt_desc_idx", background: true },
  },
  {
    collection: "images",
    index: { updatedAt: -1 },
    options: { name: "updatedAt_desc_idx", background: true },
  },
  {
    collection: "images",
    index: { "metadata.angle": 1, "metadata.movement": 1 },
    options: { name: "metadata_filters_idx", background: true },
  },
  {
    collection: "images",
    index: { filename: "text", "metadata.description": "text" },
    options: { name: "search_text_idx", background: true },
  },

  // Cars collection - frequently searched and filtered
  {
    collection: "cars",
    index: { make: 1, model: 1, year: 1 },
    options: { name: "make_model_year_idx", background: true },
  },
  {
    collection: "cars",
    index: { createdAt: -1 },
    options: { name: "cars_createdAt_desc_idx", background: true },
  },
  {
    collection: "cars",
    index: { status: 1 },
    options: { name: "cars_status_idx", background: true },
  },
  {
    collection: "cars",
    index: { clientId: 1 },
    options: { name: "cars_clientId_idx", sparse: true, background: true },
  },

  // Events collection - calendar and timeline queries
  {
    collection: "events",
    index: { start: 1, status: 1 },
    options: { name: "events_start_status_idx", background: true },
  },
  {
    collection: "events",
    index: { car_id: 1, start: 1 },
    options: { name: "events_car_start_idx", sparse: true, background: true },
  },
  {
    collection: "events",
    index: { project_id: 1, start: 1 },
    options: {
      name: "events_project_start_idx",
      sparse: true,
      background: true,
    },
  },
  {
    collection: "events",
    index: { type: 1, start: 1 },
    options: { name: "events_type_start_idx", background: true },
  },
  {
    collection: "events",
    index: { teamMemberIds: 1, start: 1 },
    options: { name: "events_team_start_idx", background: true },
  },

  // Projects collection - project management queries
  {
    collection: "projects",
    index: { status: 1, createdAt: -1 },
    options: { name: "projects_status_created_idx", background: true },
  },
  {
    collection: "projects",
    index: { "timeline.startDate": 1, "timeline.endDate": 1 },
    options: { name: "projects_timeline_idx", background: true },
  },
  {
    collection: "projects",
    index: { carIds: 1 },
    options: { name: "projects_carIds_idx", background: true },
  },

  // Raw assets collection - production queries
  {
    collection: "rawAssets",
    index: { date: -1 },
    options: { name: "rawAssets_date_desc_idx", background: true },
  },
  {
    collection: "rawAssets",
    index: { carIds: 1 },
    options: { name: "rawAssets_carIds_idx", background: true },
  },
  {
    collection: "rawAssets",
    index: { hardDriveIds: 1 },
    options: { name: "rawAssets_hardDriveIds_idx", background: true },
  },

  // Captions collection - AI content queries
  {
    collection: "captions",
    index: { carId: 1, platform: 1 },
    options: {
      name: "captions_car_platform_idx",
      sparse: true,
      background: true,
    },
  },
  {
    collection: "captions",
    index: { projectId: 1, platform: 1 },
    options: {
      name: "captions_project_platform_idx",
      sparse: true,
      background: true,
    },
  },
  {
    collection: "captions",
    index: { createdAt: -1 },
    options: { name: "captions_createdAt_desc_idx", background: true },
  },

  // System collections
  {
    collection: "systemPrompts",
    index: { isActive: 1, type: 1 },
    options: { name: "systemPrompts_active_type_idx", background: true },
  },
  {
    collection: "promptTemplates",
    index: { platform: 1, isActive: 1 },
    options: { name: "promptTemplates_platform_active_idx", background: true },
  },
];

/**
 * Create all performance indexes
 */
export async function createPerformanceIndexes(db?: Db): Promise<void> {
  const database = db || (await getDatabase());

  // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("🚀 Creating performance indexes...");

  for (const indexDef of PERFORMANCE_INDEXES) {
    try {
      const collection = database.collection(indexDef.collection);

      // Check if index already exists
      const existingIndexes = await collection.indexes();
      const indexName =
        indexDef.options?.name || generateIndexName(indexDef.index);

      const indexExists = existingIndexes.some(
        (idx) =>
          idx.name === indexName ||
          JSON.stringify(idx.key) === JSON.stringify(indexDef.index)
      );

      if (!indexExists) {
        await collection.createIndex(indexDef.index, indexDef.options);
        // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log(`✅ Created index: ${indexName} on ${indexDef.collection}`);
      } else {
        console.log(
          `⏭️  Index already exists: ${indexName} on ${indexDef.collection}`
        );
      }
    } catch (error) {
      console.error(
        `❌ Failed to create index on ${indexDef.collection}:`,
        error
      );
    }
  }

  // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("🎉 Performance indexes creation completed!");
}

/**
 * Drop all performance indexes (for cleanup/reset)
 */
export async function dropPerformanceIndexes(db?: Db): Promise<void> {
  const database = db || (await getDatabase());

  // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("🗑️  Dropping performance indexes...");

  for (const indexDef of PERFORMANCE_INDEXES) {
    try {
      const collection = database.collection(indexDef.collection);
      const indexName =
        indexDef.options?.name || generateIndexName(indexDef.index);

      await collection.dropIndex(indexName);
      // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log(`✅ Dropped index: ${indexName} on ${indexDef.collection}`);
    } catch (error) {
      // Index might not exist, which is fine
      console.log(
        `⏭️  Index not found (already dropped): ${indexDef.collection}`
      );
    }
  }

  // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("🎉 Performance indexes cleanup completed!");
}

/**
 * Analyze index usage and performance
 */
export async function analyzeIndexPerformance(db?: Db): Promise<any> {
  const database = db || (await getDatabase());

  const analysis: Record<string, any> = {};

  for (const indexDef of PERFORMANCE_INDEXES) {
    try {
      const collection = database.collection(indexDef.collection);

      // Get index stats
      const stats = await collection.aggregate([{ $indexStats: {} }]).toArray();

      // Get collection stats
      const collectionStats = await database.command({
        collStats: indexDef.collection,
      });

      analysis[indexDef.collection] = {
        indexStats: stats,
        collectionStats: {
          count: collectionStats.count,
          size: collectionStats.size,
          avgObjSize: collectionStats.avgObjSize,
          totalIndexSize: collectionStats.totalIndexSize,
        },
      };
    } catch (error) {
      console.error(`Error analyzing ${indexDef.collection}:`, error);
    }
  }

  return analysis;
}

/**
 * Generate index name from index definition
 */
function generateIndexName(index: Record<string, 1 | -1 | "text">): string {
  return (
    Object.entries(index)
      .map(([field, direction]) => {
        if (direction === "text") return `${field}_text`;
        return `${field}_${direction === 1 ? "asc" : "desc"}`;
      })
      .join("_") + "_idx"
  );
}

/**
 * Validate query performance against indexes
 */
export async function validateQueryPerformance(
  collection: string,
  query: Record<string, any>,
  db?: Db
): Promise<any> {
  const database = db || (await getDatabase());

  try {
    const coll = database.collection(collection);

    // Explain the query
    const explanation = await coll.find(query).explain("executionStats");

    return {
      collection,
      query,
      executionStats: explanation.executionStats,
      indexUsed: explanation.queryPlanner?.winningPlan?.inputStage?.indexName,
      docsExamined: explanation.executionStats?.docsExamined,
      docsReturned: explanation.executionStats?.docsReturned,
      executionTimeMillis: explanation.executionStats?.executionTimeMillis,
      indexHit:
        explanation.executionStats?.docsExamined ===
        explanation.executionStats?.docsReturned,
    };
  } catch (error) {
    console.error(
      `Error validating query performance for ${collection}:`,
      error
    );
    return null;
  }
}
