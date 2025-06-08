// MONGODB CONNECTION OPTIMIZATION - Phase 1 Improvements
// Addressing: connection pool exhaustion, excessive validation, retry churn

// MongoDB configuration v1.2.0 - Enhanced for serverless environment with connection optimization
//
// ⚡ CONNECTION OPTIMIZATION SUMMARY:
// 1. INCREASED connection pool size (8 max, 6 on Vercel) to handle complex aggregation pipelines
// 2. REDUCED validation frequency (30s intervals) to minimize connection overhead
// 3. STREAMLINED retry logic with faster failure detection (3 attempts max)
// 4. OPTIMIZED timeout configurations for better balance between performance and reliability
// 5. IMPROVED error handling with connection-aware error classification
//
// PERFORMANCE IMPROVEMENTS IMPLEMENTED:
// - Connection pool exhaustion prevention through larger pool sizes
// - Reduced connection churn via longer idle times and extended TTL
// - Faster error detection with reduced timeouts for quicker failover
// - Less frequent heartbeats to reduce connection overhead
// - Simplified global state management to prevent connection confusion
//
// EXPECTED RESULTS:
// - Eliminated MongoDB maximum connection warnings
// - Reduced API response times for complex queries (cars, projects, events)
// - Better handling of concurrent requests without connection pool exhaustion
// - Improved connection reuse efficiency across API routes
import mongoose from "mongoose";
import { MongoClient, Db, MongoClientOptions } from "mongodb";

// Check if we're in a build environment and should skip database connections
const isBuildTime =
  process.env.NEXT_PHASE === "phase-production-build" ||
  (process.env.NODE_ENV === "production" &&
    !process.env.VERCEL &&
    !process.env.DATABASE_URL &&
    !process.env.MONGODB_URI);
const isStaticGeneration = process.env.NEXT_PHASE === "phase-production-build";

if (!process.env.MONGODB_URI) {
  if (isBuildTime || isStaticGeneration) {
    console.warn(
      "MongoDB URI not available during build time - this is expected"
    );
  } else {
    throw new Error('Invalid/Missing environment variable: "MONGODB_URI"');
  }
}

const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/fallback";

// ⚡ OPTIMIZED CONNECTION OPTIONS - Reduced validation overhead
const options: MongoClientOptions = {
  // Connection pool optimization - prevent exhaustion with complex queries
  maxPoolSize: 8, // ⚡ INCREASED: Better handling of complex aggregation pipelines
  minPoolSize: 2, // ⚡ INCREASED: Keep more connections warm to reduce connection churn
  maxIdleTimeMS: 45000, // ⚡ INCREASED: Reduce connection cycling during high-load periods

  // Timeout optimization - faster failure detection
  connectTimeoutMS: 15000, // ⚡ REDUCED: Faster timeout for quicker error detection
  socketTimeoutMS: 45000, // ⚡ REDUCED: Prevent hanging operations
  serverSelectionTimeoutMS: 10000, // ⚡ REDUCED: Quick server selection
  waitQueueTimeoutMS: 8000, // ⚡ INCREASED: More time for complex queries to wait for connections

  // Reliability settings
  retryWrites: true,
  retryReads: true,
  w: 1,
  wtimeoutMS: 5000, // ⚡ INCREASED: Allow more time for write operations
  journal: true,
  ssl: true,
  tls: true,
  tlsAllowInvalidCertificates: false,
  tlsAllowInvalidHostnames: false,
  family: 4, // Force IPv4

  // ⚡ OPTIMIZED: Reduced heartbeat frequency to minimize connection overhead
  heartbeatFrequencyMS: 30000, // ⚡ INCREASED: Less frequent heartbeats to reduce load

  serverApi: {
    version: "1",
    strict: false,
    deprecationErrors: false,
  },
};

// Detect if running on Vercel - more conservative settings for serverless
const isVercel = process.env.VERCEL === "1";

if (isVercel) {
  // ⚡ VERCEL OPTIMIZATION: Balanced pool size for serverless efficiency
  options.maxPoolSize = 6; // ⚡ INCREASED: Better balance for complex queries vs. connection limits
  options.minPoolSize = 1; // Keep at least one warm connection
  options.maxIdleTimeMS = 30000; // Faster release for serverless
  options.serverSelectionTimeoutMS = 8000;
  options.connectTimeoutMS = 12000;
  options.socketTimeoutMS = 35000;
  options.waitQueueTimeoutMS = 6000;
  options.heartbeatFrequencyMS = 25000; // Slightly more frequent for serverless
  options.family = 4;
}

// Add development environment specific settings
if (process.env.NODE_ENV === "development") {
  options.ssl = true;
  options.tls = true;
  options.tlsAllowInvalidCertificates = false;
  options.family = 4;
  // More generous timeouts for development
  options.serverSelectionTimeoutMS = 15000;
  options.connectTimeoutMS = 20000;
  options.socketTimeoutMS = 60000;
  options.maxIdleTimeMS = 60000;
  options.heartbeatFrequencyMS = 45000; // Less frequent in development
}

// Get database name from environment or use default
const DB_NAME = process.env.MONGODB_DB || "motive_archive";

// ⚡ OPTIMIZED: Simplified connection validation - reduced ping frequency
let lastValidationTime = 0;
const VALIDATION_INTERVAL = 30000; // Only validate every 30 seconds

// Helper function to get database instance with efficient validation
export async function getDatabase(): Promise<Db> {
  if (isBuildTime || isStaticGeneration) {
    throw new Error("Database connections are not available during build time");
  }

  try {
    const client = await getMongoClient();
    const db = client.db(DB_NAME);

    // ⚡ OPTIMIZED: Reduced validation frequency to prevent connection overhead
    const now = Date.now();
    if (now - lastValidationTime > VALIDATION_INTERVAL) {
      try {
        await db.admin().ping();
        lastValidationTime = now;
      } catch (pingError) {
        console.log("Connection validation failed, attempting reconnection...");

        // Clear cached client and try once more
        global._mongoClientPromise = null;
        global._lastConnectionTime = 0;

        const freshClient = await getMongoClient();
        const freshDb = freshClient.db(DB_NAME);
        await freshDb.admin().ping();
        lastValidationTime = now;

        return freshDb;
      }
    }

    return db;
  } catch (error) {
    console.error("Error getting database:", error);

    // Clear cached client and try once more
    global._mongoClientPromise = null;
    global._lastConnectionTime = 0;

    try {
      console.log("Creating fresh MongoDB connection");
      const client = await getMongoClient();
      const db = client.db(DB_NAME);

      global._lastConnectionTime = Date.now();
      lastValidationTime = Date.now();

      // Single validation for fresh connection
      await db.admin().ping();

      return db;
    } catch (retryError) {
      console.error("Failed to reconnect to MongoDB:", retryError);
      throw retryError;
    }
  }
}

// Define the type for cached mongoose connection
interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

// ⚡ OPTIMIZED: Streamlined global state management
declare global {
  var mongoose: MongooseCache | undefined;
  var _mongoClientPromise: Promise<MongoClient> | null;
  var _lastConnectionTime: number | undefined;
  var _connectionAttempts: number | undefined;
}

// Global connection cache
const cached: MongooseCache = global.mongoose || { conn: null, promise: null };
global.mongoose = cached;

// ⚡ OPTIMIZED: Simplified connection timing logic
if (!global._lastConnectionTime) {
  global._lastConnectionTime = 0;
}

// Helper function to check if we should force a new connection
function shouldForceNewConnection(): boolean {
  const now = Date.now();
  const timeSinceLastConnection = now - (global._lastConnectionTime || 0);

  // ⚡ OPTIMIZED: Extended TTL to reduce unnecessary reconnections
  const CONNECTION_TTL =
    process.env.NODE_ENV === "development"
      ? 900 * 1000 // 15 minutes for development (was 10)
      : 600 * 1000; // 10 minutes for production (was 5)

  return timeSinceLastConnection > CONNECTION_TTL;
}

// ⚡ OPTIMIZED: Mongoose connection with better error handling
export async function dbConnect() {
  if (isBuildTime || isStaticGeneration) {
    console.warn("Skipping database connection during build time");
    return;
  }

  try {
    if (mongoose.connection.readyState >= 1) {
      return;
    }

    if (!process.env.MONGODB_URI) {
      throw new Error("MongoDB URI not found in environment variables");
    }

    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: process.env.MONGODB_DB || "motive_archive",
    });
  } catch (error) {
    console.error("MongoDB - Connection error:", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}

// For native MongoDB driver connection (used by API routes)
let client: MongoClient | null = null;
let clientPromise: Promise<MongoClient> | null = null;

// Create a cached MongoDB connection
function initializeConnection() {
  if (isBuildTime || isStaticGeneration) {
    return;
  }

  if (!global._mongoClientPromise || shouldForceNewConnection()) {
    global._mongoClientPromise = createMongoClient();
  }
  clientPromise = global._mongoClientPromise;
}

// Initialize on module load
initializeConnection();

// ⚡ OPTIMIZED: Streamlined connection creation with improved error handling
function createMongoClient(): Promise<MongoClient> {
  if (isBuildTime || isStaticGeneration) {
    throw new Error("Cannot create MongoDB client during build time");
  }

  const clientOptions = {
    ...options,
  } as MongoClientOptions & { dbName: string };

  clientOptions.dbName = DB_NAME;
  client = new MongoClient(uri, clientOptions);

  // ⚡ OPTIMIZED: Simplified retry logic with faster failure detection
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const maxAttempts = 3; // ⚡ REDUCED: Faster failure for better UX

    const attemptConnection = () => {
      attempts++;

      if (!client) {
        console.error("Client object is null, recreating");
        client = new MongoClient(uri, clientOptions);
      }

      client
        .connect()
        .then((connectedClient) => {
          global._lastConnectionTime = Date.now();
          resolve(connectedClient);
        })
        .catch((err) => {
          console.error(
            `MongoDB connection error (attempt ${attempts}/${maxAttempts}):`,
            err
          );

          // Fast-fail for auth errors
          const errorMessage = err.toString().toLowerCase();
          if (
            errorMessage.includes("authentication") ||
            errorMessage.includes("auth failed")
          ) {
            console.error("Authentication error detected - failing fast");
            return reject(err);
          }

          // Retry with backoff
          if (attempts < maxAttempts) {
            const backoffDelay = Math.min(attempts * 1000, 3000); // ⚡ OPTIMIZED: Linear backoff
            setTimeout(attemptConnection, backoffDelay);
          } else {
            console.error(`Failed to connect after ${maxAttempts} attempts`);
            reject(err);
          }
        });
    };

    attemptConnection();
  });
}

// ⚡ OPTIMIZED: Streamlined client getter with better connection management
export async function getMongoClient(
  maxRetries = 2, // ⚡ REDUCED: Faster failure
  baseDelay = 500 // ⚡ INCREASED: More reasonable base delay
): Promise<MongoClient> {
  if (isBuildTime || isStaticGeneration) {
    throw new Error(
      "MongoDB client connections are not available during build time"
    );
  }

  // ⚡ OPTIMIZED: Simplified attempt tracking
  if (!global._connectionAttempts) {
    global._connectionAttempts = 0;
  }

  // Reset if too many attempts
  if (global._connectionAttempts > 5) {
    // ⚡ REDUCED: Lower threshold
    console.log("Too many connection attempts detected. Resetting connection.");
    global._mongoClientPromise = null;
    clientPromise = null;
    client = null;
    global._connectionAttempts = 0;
  }

  global._connectionAttempts++;

  try {
    // Check if we need a fresh connection
    if (shouldForceNewConnection() || !clientPromise) {
      global._mongoClientPromise = createMongoClient();
      clientPromise = global._mongoClientPromise;
    }

    if (!clientPromise) {
      clientPromise = createMongoClient();
    }

    const connectedClient = await clientPromise;

    // ⚡ OPTIMIZED: Less frequent ping validation
    const now = Date.now();
    if (now - lastValidationTime > VALIDATION_INTERVAL) {
      try {
        await connectedClient.db("admin").command({ ping: 1 });
        lastValidationTime = now;
      } catch (pingError) {
        console.warn("Ping failed, but continuing with existing connection");
      }
    }

    // Reset on success
    global._connectionAttempts = 0;
    return connectedClient;
  } catch (err) {
    console.error(
      `MongoDB connection error (attempt ${global._connectionAttempts}):`
    );

    if (global._connectionAttempts <= maxRetries) {
      const retryDelay = Math.min(global._connectionAttempts * baseDelay, 3000);

      await new Promise((resolve) => setTimeout(resolve, retryDelay));

      // Force new connection promise
      clientPromise = createMongoClient();
      global._mongoClientPromise = clientPromise;

      return getMongoClient(maxRetries, baseDelay);
    }

    console.error("All MongoDB connection retries failed");
    throw err;
  }
}

// ⚡ OPTIMIZED: Simplified validation function
export async function validateConnection(): Promise<boolean> {
  try {
    const client = await getMongoClient(1, 1000);
    const db = client.db(DB_NAME);

    const result = await db.command({ ping: 1 });
    return result && result.ok === 1;
  } catch (error) {
    console.error("Failed to validate MongoDB connection:", error);
    return false;
  }
}

// ⚡ OPTIMIZED: Streamlined connection function
export async function connectToDatabase() {
  try {
    const client = await getMongoClient();
    const db = client.db(DB_NAME);

    // Single ping for verification
    await db.command({ ping: 1 });

    return { client, db };
  } catch (err) {
    console.error("Failed to connect to database:", err);
    throw err;
  }
}

// Initialize Mongoose connection
if (!isBuildTime && !isStaticGeneration) {
  dbConnect().catch(console.error);
}

// Graceful shutdown handlers
if (!isBuildTime && !isStaticGeneration) {
  ["SIGINT", "SIGTERM", "SIGQUIT"].forEach((signal) => {
    process.on(signal, async () => {
      try {
        if (cached.conn) {
          await cached.conn.disconnect();
        }
        if (clientPromise) {
          const client = await clientPromise;
          await client.close();
        }
        // [REMOVED] // [REMOVED] console.log("MongoDB connections closed.");
        process.exit(0);
      } catch (err) {
        console.error("Error closing MongoDB connections:", err);
        process.exit(1);
      }
    });
  });
}

export default clientPromise;

// Add debug info to returned values
export interface MongoDebugInfo {
  timestamp: string;
  environment: string;
  vercel: boolean;
  database: string;
  connectionPoolSize: number;
  hasCollection?: boolean;
  returnedCount?: number;
  totalCount?: number;
  connectionStatus: "success" | "error";
  connectionError?: string;
  retryCount?: number;
}

// Add this function to handle more robust collection checking
export async function ensureCollectionExists(
  collectionName: string,
  dbClient?: MongoClient
): Promise<{ exists: boolean; client?: MongoClient }> {
  const DB_NAME = process.env.MONGODB_DB || "motive_archive";
  const ALT_DB_NAME = DB_NAME === "motive_archive" ? "motive-archive" : null;

  let client: MongoClient | undefined = dbClient;
  let ownClient = false;

  try {
    // If no client provided, create one
    if (!client) {
      client = await getMongoClient();
      ownClient = true;
    }

    // Check the primary database first
    const db = client.db(DB_NAME);
    const collections = await db.listCollections().toArray();

    // Check if collection exists - case sensitive
    let exists = collections.some((c) => c.name === collectionName);

    if (exists) {
      return { exists: true, client };
    }

    // Try case-insensitive match if not found
    const caseInsensitiveMatch = collections.find(
      (c) => c.name.toLowerCase() === collectionName.toLowerCase()
    );

    if (caseInsensitiveMatch) {
      console.log(
        `Found collection with different case: ${caseInsensitiveMatch.name}`
      );
      return { exists: true, client };
    }

    // If still not found and we have an alternative database, check it
    if (!exists && ALT_DB_NAME) {
      try {
        const altDb = client.db(ALT_DB_NAME);
        const altCollections = await altDb.listCollections().toArray();

        // Check in alternative database
        exists = altCollections.some((c) => c.name === collectionName);

        if (exists) {
          console.log(
            `Found collection in alternative database: ${ALT_DB_NAME}`
          );
          return { exists: true, client };
        }

        // Try case-insensitive match in alternative DB
        const altCaseInsensitiveMatch = altCollections.find(
          (c) => c.name.toLowerCase() === collectionName.toLowerCase()
        );

        if (altCaseInsensitiveMatch) {
          console.log(
            `Found collection with different case in alternative database: ${altCaseInsensitiveMatch.name}`
          );
          return { exists: true, client };
        }
      } catch (error) {
        console.error(
          `Error checking alternative database: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    }

    // As a last resort, try to directly access the collection
    // Some MongoDB configurations might allow this even if listCollections doesn't show it
    try {
      const count = await db
        .collection(collectionName)
        .countDocuments({}, { limit: 1 });
      if (count >= 0) {
        // If we can successfully run this, the collection exists or can be auto-created
        return { exists: true, client };
      }
    } catch (error) {
      // Ignore errors here, since we're just trying as a last resort
    }

    return { exists: false, client };
  } catch (error) {
    console.error(
      `Error checking for collection: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return { exists: false, client };
  } finally {
    // Close the client only if we created it
    if (ownClient && client && !dbClient) {
      await client.close();
    }
  }
}
