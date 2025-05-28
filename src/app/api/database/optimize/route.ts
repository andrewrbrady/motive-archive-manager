import { NextRequest, NextResponse } from "next/server";
import {
  createPerformanceIndexes,
  dropPerformanceIndexes,
  analyzeIndexPerformance,
  PERFORMANCE_INDEXES,
} from "@/lib/database/indexes";
import { cacheUtils } from "@/lib/database/cache";
import { getDatabase } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

/**
 * Database Optimization API - Phase 3 Performance Optimization
 *
 * Endpoints:
 * POST /api/database/optimize?action=create   - Create all performance indexes
 * POST /api/database/optimize?action=analyze - Analyze index performance
 * POST /api/database/optimize?action=clean   - Drop all performance indexes
 * POST /api/database/optimize?action=cache   - Manage cache system
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action") || "create";

    console.log(`🚀 Database optimization: ${action}`);

    const db = await getDatabase();
    let result: any = {};

    switch (action) {
      case "create":
      case "init":
        result = await createIndexes(db);
        break;

      case "analyze":
      case "stats":
        result = await analyzePerformance(db);
        break;

      case "clean":
      case "drop":
        result = await cleanIndexes(db);
        break;

      case "cache":
        result = await manageCaches();
        break;

      case "all":
        const createResult = await createIndexes(db);
        const analyzeResult = await analyzePerformance(db);
        const cacheResult = await manageCaches();

        result = {
          create: createResult,
          analyze: analyzeResult,
          cache: cacheResult,
        };
        break;

      default:
        return NextResponse.json(
          {
            error: "Invalid action",
            availableActions: ["create", "analyze", "clean", "cache", "all"],
          },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      action,
      result,
      performance: {
        executionTime: Date.now() - startTime,
      },
    });
  } catch (error) {
    console.error("❌ Database optimization failed:", error);
    return NextResponse.json(
      {
        error: "Database optimization failed",
        details: error instanceof Error ? error.message : "Unknown error",
        performance: {
          executionTime: Date.now() - startTime,
        },
      },
      { status: 500 }
    );
  }
}

/**
 * Create all performance indexes
 */
async function createIndexes(db: any) {
  console.log("📊 Creating Performance Indexes");

  await createPerformanceIndexes(db);

  // Show index summary
  const collections = [
    ...new Set(PERFORMANCE_INDEXES.map((idx) => idx.collection)),
  ];
  const summary: Record<string, number> = {};

  for (const collection of collections) {
    const collectionIndexes = PERFORMANCE_INDEXES.filter(
      (idx) => idx.collection === collection
    );
    summary[collection] = collectionIndexes.length;
  }

  return {
    message: `Created ${PERFORMANCE_INDEXES.length} performance indexes`,
    totalIndexes: PERFORMANCE_INDEXES.length,
    collections: summary,
  };
}

/**
 * Analyze index performance
 */
async function analyzePerformance(db: any) {
  console.log("📈 Analyzing Index Performance");

  const analysis = await analyzeIndexPerformance(db);

  const summary: Record<string, any> = {};

  for (const [collection, stats] of Object.entries(analysis)) {
    const collectionStats = (stats as any).collectionStats;
    const indexStats = (stats as any).indexStats;

    summary[collection] = {
      documents: collectionStats.count,
      sizeMB: Math.round((collectionStats.size / 1024 / 1024) * 100) / 100,
      avgDocSize: collectionStats.avgObjSize,
      indexSizeMB:
        Math.round((collectionStats.totalIndexSize / 1024 / 1024) * 100) / 100,
      indexCount: indexStats ? indexStats.length : 0,
    };
  }

  return {
    message: "Index performance analysis completed",
    collections: summary,
    totalCollections: Object.keys(analysis).length,
  };
}

/**
 * Clean all performance indexes
 */
async function cleanIndexes(db: any) {
  console.log("🗑️ Cleaning Performance Indexes");

  await dropPerformanceIndexes(db);

  return {
    message: `Cleaned ${PERFORMANCE_INDEXES.length} performance indexes`,
    totalIndexes: PERFORMANCE_INDEXES.length,
  };
}

/**
 * Manage cache system
 */
async function manageCaches() {
  console.log("🔥 Managing Cache System");

  // Clear all caches
  cacheUtils.clearAll();

  // Warm up caches
  await cacheUtils.warmupCache();

  // Get cache stats
  const stats = cacheUtils.getAllStats();

  const summary: Record<string, any> = {};
  for (const [cacheName, cacheStats] of Object.entries(stats)) {
    summary[cacheName] = {
      size: cacheStats.size,
      maxSize: cacheStats.maxSize,
      utilization: Math.round((cacheStats.size / cacheStats.maxSize) * 100),
    };
  }

  return {
    message: "Cache system managed successfully",
    caches: summary,
    totalCaches: Object.keys(stats).length,
  };
}

/**
 * Get database optimization status
 */
export async function GET(request: NextRequest) {
  try {
    const db = await getDatabase();

    // Get basic stats for all collections
    const collections = ["images", "cars", "events", "projects", "captions"];
    const stats: Record<string, any> = {};

    for (const collectionName of collections) {
      try {
        const collection = db.collection(collectionName);
        const count = await collection.countDocuments();
        const indexes = await collection.indexes();

        stats[collectionName] = {
          documents: count,
          indexes: indexes.length,
          indexNames: indexes.map((idx) => idx.name),
        };
      } catch (error) {
        stats[collectionName] = {
          error: "Collection not accessible",
        };
      }
    }

    // Get cache stats
    const cacheStats = cacheUtils.getAllStats();

    return NextResponse.json({
      database: stats,
      cache: cacheStats,
      optimizations: {
        totalIndexes: PERFORMANCE_INDEXES.length,
        collections: [
          ...new Set(PERFORMANCE_INDEXES.map((idx) => idx.collection)),
        ],
      },
    });
  } catch (error) {
    console.error("Error getting database status:", error);
    return NextResponse.json(
      { error: "Failed to get database status" },
      { status: 500 }
    );
  }
}
