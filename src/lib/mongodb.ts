// MongoDB configuration v1.1.0 - Enhanced for serverless environment
import mongoose from "mongoose";
import { MongoClient, Db, MongoClientOptions } from "mongodb";

if (!process.env.MONGODB_URI) {
  throw new Error('Invalid/Missing environment variable: "MONGODB_URI"');
}

const uri = process.env.MONGODB_URI;
const options: MongoClientOptions = {
  maxPoolSize: 10, // Lower pool size for serverless
  minPoolSize: 1, // Minimal connections for serverless
  maxIdleTimeMS: 45000, // Close idle connections after 45 seconds (balanced for serverless)
  connectTimeoutMS: 30000, // Connection timeout increased to 30 seconds (up from 10000)
  socketTimeoutMS: 60000, // Socket timeout increased to 60 seconds (up from 45000)
  serverSelectionTimeoutMS: 30000, // Server selection timeout added (30 seconds)
  waitQueueTimeoutMS: 10000, // Wait queue timeout added
  retryWrites: true, // Enable retry for write operations
  retryReads: true, // Enable retry for read operations
};

// Detect if running on Vercel
const isVercel = process.env.VERCEL === "1";

// Adjust options for Vercel environment - optimized for better reliability
if (isVercel) {
  // More aggressive settings for serverless functions
  options.maxPoolSize = 5;
  options.minPoolSize = 0; // No persistent connections
  options.serverSelectionTimeoutMS = 15000; // Shorter timeout for faster failures (down from 30000)
  options.connectTimeoutMS = 15000; // Shorter connection timeout (down from 30000)
  options.socketTimeoutMS = 30000; // Shorter socket timeout (down from 60000)
  options.waitQueueTimeoutMS = 5000; // Shorter wait queue timeout (down from 10000)
  options.heartbeatFrequencyMS = 15000; // More frequent heartbeats (default 10000)
  options.family = 4; // Force IPv4 (can help with some connectivity issues)
  console.log(
    "Detected Vercel environment, using optimized MongoDB connection settings"
  );
}

// Log MongoDB configuration (omit URI for security)
console.log("MongoDB Configuration:", {
  maxPoolSize: options.maxPoolSize,
  minPoolSize: options.minPoolSize,
  maxIdleTimeMS: options.maxIdleTimeMS,
  connectTimeoutMS: options.connectTimeoutMS,
  socketTimeoutMS: options.socketTimeoutMS,
  serverSelectionTimeoutMS: options.serverSelectionTimeoutMS,
  waitQueueTimeoutMS: options.waitQueueTimeoutMS,
  retryWrites: options.retryWrites,
  retryReads: options.retryReads,
  heartbeatFrequencyMS: options.heartbeatFrequencyMS,
  family: options.family,
  isVercel,
});

// Get database name from environment or use default
const DB_NAME = process.env.MONGODB_DB || "motive_archive";

// Define the type for cached mongoose connection
interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

// Extend the global object type
declare global {
  // We need to use var here because let/const are not allowed in global scope
  // eslint-disable-next-line no-var
  var mongoose: MongooseCache | undefined;
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
  // eslint-disable-next-line no-var
  var _lastConnectionTime: number | undefined;
}

// Global is used here to maintain a cached connection across hot reloads
// in development. This prevents connections growing exponentially
// during API Route usage.
const cached: MongooseCache = global.mongoose || { conn: null, promise: null };
global.mongoose = cached;

// Add a timestamp for the last successful connection
if (!global._lastConnectionTime) {
  global._lastConnectionTime = 0;
}

// Helper function to check if we should force a new connection
// This helps when a serverless function has been idle for a while
function shouldForceNewConnection(): boolean {
  const now = Date.now();
  const timeSinceLastConnection = now - (global._lastConnectionTime || 0);
  const CONNECTION_TTL = 60 * 1000; // 1 minute

  // If more than CONNECTION_TTL has passed since our last connection,
  // we should force a new one to avoid using a stale connection
  if (isVercel && timeSinceLastConnection > CONNECTION_TTL) {
    console.log(
      `Last connection was ${timeSinceLastConnection}ms ago. Forcing new connection.`
    );
    return true;
  }
  return false;
}

// For Mongoose ORM connection (used by models)
export async function dbConnect() {
  if (cached.conn && !shouldForceNewConnection()) {
    console.log("Using cached Mongoose connection");
    return cached.conn;
  }

  if (!cached.promise || shouldForceNewConnection()) {
    const opts = {
      ...options,
      bufferCommands: false,
    };

    console.log("Creating new Mongoose connection");
    cached.promise = mongoose.connect(uri, opts).then((mongoose) => {
      global._lastConnectionTime = Date.now();
      console.log(
        "New Mongoose connection established with pool size:",
        options.maxPoolSize
      );
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    console.error("MongoDB connection error:", e);
    throw e;
  }

  return cached.conn;
}

// For native MongoDB driver connection (used by API routes)
let client: MongoClient;
let clientPromise: Promise<MongoClient>;

// Robust connection creation function with retry logic
function createMongoClient(): Promise<MongoClient> {
  const dbName = process.env.MONGODB_DB || "motive_archive";
  console.log("Creating new MongoDB client connection to database:", dbName);
  console.log("MongoDB connection options:", {
    maxPoolSize: options.maxPoolSize,
    minPoolSize: options.minPoolSize,
    maxIdleTimeMS: options.maxIdleTimeMS,
    isVercel: process.env.VERCEL === "1",
    environment: process.env.NODE_ENV,
  });

  client = new MongoClient(uri, options);

  // Create new connection promise with improved error handling
  return client
    .connect()
    .then((client) => {
      global._lastConnectionTime = Date.now();
      console.log("MongoDB client connected successfully to database:", dbName);
      return client;
    })
    .catch((err) => {
      console.error("MongoDB client connection error:", err);
      // Add more detailed error information
      console.error("Connection details (sanitized):", {
        uriPrefix: uri.substring(0, 20) + "...",
        dbName,
        environment: process.env.NODE_ENV,
        vercel: process.env.VERCEL === "1",
      });

      // Try to determine if this is an auth error or network issue
      const errorMessage = err.toString().toLowerCase();
      if (
        errorMessage.includes("authentication") ||
        errorMessage.includes("auth failed")
      ) {
        console.error(
          "This appears to be an authentication error. Check your MongoDB username and password."
        );
      } else if (
        errorMessage.includes("network") ||
        errorMessage.includes("timeout")
      ) {
        console.error(
          "This appears to be a network connectivity issue. Check your MongoDB Atlas network settings."
        );
      }

      throw err;
    });
}

// Create a cached MongoDB connection
if (process.env.NODE_ENV === "development") {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  if (!global._mongoClientPromise || shouldForceNewConnection()) {
    global._mongoClientPromise = createMongoClient();
  }
  clientPromise = global._mongoClientPromise;
} else {
  // In production mode, it's best to not use a global variable.
  // However, for serverless functions we still need to be careful
  // about creating too many connections
  if (!global._mongoClientPromise || shouldForceNewConnection()) {
    global._mongoClientPromise = createMongoClient();
  }
  clientPromise = global._mongoClientPromise;
}

// Add exponential backoff retry mechanism for serverless environments
// Improved version with more aggressive retry strategy
export async function getMongoClient(
  retries = 3,
  delay = 500
): Promise<MongoClient> {
  try {
    // If we should force a new connection, clear the cached promise
    if (shouldForceNewConnection()) {
      console.log("Forcing new MongoDB connection due to TTL expiration");
      global._mongoClientPromise = createMongoClient();
      clientPromise = global._mongoClientPromise;
    }

    return await clientPromise;
  } catch (err) {
    if (retries <= 0) {
      console.error("All MongoDB connection retries failed");
      throw err;
    }

    // More aggressive exponential backoff for Vercel environment
    const baseDelay = isVercel ? 300 : delay; // Shorter base delay for Vercel
    const retryDelay = baseDelay * Math.pow(1.5, 3 - retries); // Less aggressive exponential factor
    console.log(
      `MongoDB connection failed, retrying in ${retryDelay}ms... (${retries} attempts left)`
    );

    await new Promise((resolve) => setTimeout(resolve, retryDelay));
    return getMongoClient(retries - 1, delay);
  }
}

// Add a connection validation function
export async function validateConnection(): Promise<boolean> {
  try {
    console.time("mongodb-validate");
    const client = await getMongoClient(1, 500);
    const db = client.db(DB_NAME);

    // Test connection with a lightweight ping operation
    const result = await db.command({ ping: 1 });
    console.timeEnd("mongodb-validate");

    if (result && result.ok === 1) {
      console.log("MongoDB connection validated successfully");
      return true;
    } else {
      console.error(
        "MongoDB connection validation failed: unexpected response",
        result
      );
      return false;
    }
  } catch (error) {
    console.error("Failed to validate MongoDB connection:", error);
    return false;
  }
}

// Connection with diagnostics for debugging connection issues
export async function connectToDatabase() {
  try {
    console.time("mongodb-connect");
    const client = await getMongoClient();
    const db = client.db(DB_NAME);

    // Log connection success with timing
    console.timeEnd("mongodb-connect");
    console.log(
      "Connected to database:",
      db.databaseName,
      "with pool size:",
      options.maxPoolSize
    );

    // Run a simple ping to verify connection is responsive
    await db.command({ ping: 1 });
    console.log("Database ping successful");

    return { client, db };
  } catch (err) {
    console.error("Failed to connect to database:", err);
    throw err;
  }
}

// Helper function to get a typed database instance
export async function getDatabase(): Promise<Db> {
  const client = await getMongoClient();
  return client.db(DB_NAME);
}

// Initialize Mongoose connection
dbConnect().catch(console.error);

// Graceful shutdown handlers
["SIGINT", "SIGTERM", "SIGQUIT"].forEach((signal) => {
  process.on(signal, async () => {
    try {
      if (cached.conn) {
        await cached.conn.disconnect();
      }
      const client = await clientPromise;
      await client.close();
      console.log("MongoDB connections closed.");
      process.exit(0);
    } catch (err) {
      console.error("Error closing MongoDB connections:", err);
      process.exit(1);
    }
  });
});

export default clientPromise;
