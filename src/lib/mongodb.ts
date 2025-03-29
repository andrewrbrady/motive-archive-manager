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

// Helper function to get database instance with consistent database name
export async function getDatabase(): Promise<Db> {
  const client = await getMongoClient();
  return client.db(DB_NAME);
}

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
  var _mongoClientPromise: Promise<MongoClient> | null;
  // eslint-disable-next-line no-var
  var _lastConnectionTime: number | undefined;
  // eslint-disable-next-line no-var
  var _connectionAttempts: number | undefined;
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
  const CONNECTION_TTL = 30 * 1000; // Lower to 30 seconds to ensure fresher connections

  // If more than CONNECTION_TTL has passed since our last connection,
  // we should force a new one to avoid using a stale connection
  if (timeSinceLastConnection > CONNECTION_TTL) {
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

    const mongooseUri = `${uri}/${DB_NAME}`;
    console.log("Creating new Mongoose connection to database:", DB_NAME);
    cached.promise = mongoose
      .connect(mongooseUri, opts as any)
      .then((mongoose) => {
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
let client: MongoClient | null = null;
let clientPromise: Promise<MongoClient> | null = null;

// Create a cached MongoDB connection
function initializeConnection() {
  if (!global._mongoClientPromise || shouldForceNewConnection()) {
    console.log("Initializing MongoDB connection");
    global._mongoClientPromise = createMongoClient();
  }
  clientPromise = global._mongoClientPromise;
}

// Initialize on module load
initializeConnection();

// Robust connection creation function with retry logic
function createMongoClient(): Promise<MongoClient> {
  console.log("Creating new MongoDB client connection to database:", DB_NAME);
  console.log("MongoDB connection options:", {
    maxPoolSize: options.maxPoolSize,
    minPoolSize: options.minPoolSize,
    maxIdleTimeMS: options.maxIdleTimeMS,
    isVercel: process.env.VERCEL === "1",
    environment: process.env.NODE_ENV,
  });

  const clientOptions = {
    ...options,
    connectTimeoutMS: 20000, // Adjust timeout for better reliability
    serverSelectionTimeoutMS: 20000, // Adjust server selection timeout
  } as MongoClientOptions & { dbName: string };

  clientOptions.dbName = DB_NAME;

  client = new MongoClient(uri, clientOptions);

  // Create new connection promise with improved error handling and retry logic
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const maxAttempts = 5;

    const attemptConnection = () => {
      attempts++;
      console.log(`Connection attempt ${attempts}/${maxAttempts}...`);

      if (!client) {
        console.error("Client object is null, recreating");
        client = new MongoClient(uri, clientOptions);
      }

      client
        .connect()
        .then((connectedClient) => {
          global._lastConnectionTime = Date.now();
          console.log(
            "MongoDB client connected successfully to database:",
            DB_NAME
          );
          resolve(connectedClient);
        })
        .catch((err) => {
          console.error(
            `MongoDB connection error (attempt ${attempts}/${maxAttempts}):`,
            err
          );

          // Try to determine if this is an auth error or network issue
          const errorMessage = err.toString().toLowerCase();
          if (
            errorMessage.includes("authentication") ||
            errorMessage.includes("auth failed")
          ) {
            console.error(
              "This appears to be an authentication error. Check your MongoDB username and password."
            );
            // Auth errors won't resolve with retries, so fail fast
            return reject(err);
          } else if (
            errorMessage.includes("network") ||
            errorMessage.includes("timeout")
          ) {
            console.error(
              "This appears to be a network connectivity issue. Check your MongoDB Atlas network settings."
            );
          }

          // If we haven't reached max attempts, try again with backoff
          if (attempts < maxAttempts) {
            const backoffDelay = Math.min(Math.pow(2, attempts) * 100, 3000);
            console.log(`Retrying in ${backoffDelay}ms...`);
            setTimeout(attemptConnection, backoffDelay);
          } else {
            console.error(`Failed to connect after ${maxAttempts} attempts`);
            reject(err);
          }
        });
    };

    // Start the first attempt
    attemptConnection();
  });
}

// Add exponential backoff retry mechanism for serverless environments
// Improved version with more aggressive retry strategy
export async function getMongoClient(
  maxRetries = 5,
  baseDelay = 300
): Promise<MongoClient> {
  // Keep track of attempts across function calls
  if (!global._connectionAttempts) {
    global._connectionAttempts = 0;
  }

  // If too many recent attempts, force a new connection
  if (global._connectionAttempts > 10) {
    console.log("Too many connection attempts detected. Resetting connection.");
    global._mongoClientPromise = null;
    clientPromise = null;
    client = null;
    global._connectionAttempts = 0;
  }

  // Increment attempt counter
  global._connectionAttempts++;

  try {
    // If we should force a new connection, clear the cached promise
    if (shouldForceNewConnection() || !clientPromise) {
      console.log("Creating fresh MongoDB connection");
      global._mongoClientPromise = createMongoClient();
      clientPromise = global._mongoClientPromise;
    }

    // Ensure there's a valid clientPromise
    if (!clientPromise) {
      console.log("No valid client promise, creating new one");
      clientPromise = createMongoClient();
    }

    // Get client from promise
    const connectedClient = await clientPromise;

    // Test the connection with a ping
    try {
      await connectedClient.db("admin").command({ ping: 1 });
      console.log("MongoDB connection verified with ping");

      // Reset attempt counter on success
      global._connectionAttempts = 0;
      return connectedClient;
    } catch (pingError) {
      console.error("Ping failed on existing connection, forcing reconnection");

      // Force a new connection since ping failed
      global._mongoClientPromise = null;
      clientPromise = null;
      client = null;

      // If we still have retries, try again
      if (global._connectionAttempts <= maxRetries) {
        console.log("Retrying after ping failure");
        clientPromise = createMongoClient();
        return await clientPromise;
      }

      throw pingError;
    }
  } catch (err) {
    console.error(
      `MongoDB connection error (attempt ${global._connectionAttempts}):`
    );

    // Basic retry with exponential backoff
    if (global._connectionAttempts <= maxRetries) {
      const retryDelay = Math.min(
        Math.pow(2, global._connectionAttempts) * baseDelay,
        5000
      );
      console.log(
        `Retrying connection in ${retryDelay}ms... (attempt ${global._connectionAttempts}/${maxRetries})`
      );

      await new Promise((resolve) => setTimeout(resolve, retryDelay));

      // Force a new connection promise
      clientPromise = createMongoClient();
      global._mongoClientPromise = clientPromise;

      return getMongoClient(maxRetries, baseDelay);
    }

    console.error("All MongoDB connection retries failed");
    throw err;
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
    const db = client.db(DB_NAME); // Always use DB_NAME

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

// Initialize Mongoose connection
dbConnect().catch(console.error);

// Graceful shutdown handlers
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
      console.log("MongoDB connections closed.");
      process.exit(0);
    } catch (err) {
      console.error("Error closing MongoDB connections:", err);
      process.exit(1);
    }
  });
});

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
