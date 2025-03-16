// MongoDB configuration v1.0.6
import mongoose from "mongoose";
import { MongoClient, Db, MongoClientOptions } from "mongodb";

if (!process.env.MONGODB_URI) {
  throw new Error('Invalid/Missing environment variable: "MONGODB_URI"');
}

const uri = process.env.MONGODB_URI;
const options: MongoClientOptions = {
  maxPoolSize: 150, // Increase from default (100)
  minPoolSize: 5, // Keep some connections ready
  maxIdleTimeMS: 60000, // Close idle connections after 60 seconds (up from 30000)
  connectTimeoutMS: 30000, // Connection timeout increased to 30 seconds (up from 10000)
  socketTimeoutMS: 60000, // Socket timeout increased to 60 seconds (up from 45000)
  serverSelectionTimeoutMS: 30000, // Server selection timeout added (30 seconds)
  waitQueueTimeoutMS: 10000, // Wait queue timeout added
};

// Log MongoDB configuration (omit URI for security)
console.log("MongoDB Configuration:", {
  maxPoolSize: options.maxPoolSize,
  minPoolSize: options.minPoolSize,
  maxIdleTimeMS: options.maxIdleTimeMS,
  connectTimeoutMS: options.connectTimeoutMS,
  socketTimeoutMS: options.socketTimeoutMS,
  serverSelectionTimeoutMS: options.serverSelectionTimeoutMS,
  waitQueueTimeoutMS: options.waitQueueTimeoutMS,
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
}

// Global is used here to maintain a cached connection across hot reloads
// in development. This prevents connections growing exponentially
// during API Route usage.
const cached: MongooseCache = global.mongoose || { conn: null, promise: null };
global.mongoose = cached;

// For Mongoose ORM connection (used by models)
export async function dbConnect() {
  if (cached.conn) {
    console.log("Using cached Mongoose connection");
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      ...options,
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(uri, opts).then((mongoose) => {
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

// Create a cached MongoDB connection
if (process.env.NODE_ENV === "development") {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  const globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>;
  };

  if (!globalWithMongo._mongoClientPromise) {
    client = new MongoClient(uri, options);
    globalWithMongo._mongoClientPromise = client.connect().catch((err) => {
      console.error("MongoDB client connection error:", err);
      throw err;
    });
  }
  clientPromise = globalWithMongo._mongoClientPromise;
} else {
  // In production mode, it's best to not use a global variable.
  client = new MongoClient(uri, options);
  clientPromise = client.connect().catch((err) => {
    console.error("MongoDB client connection error:", err);
    throw err;
  });
}

// Add retry mechanism for serverless environments
export async function getMongoClient(
  retries = 3,
  delay = 500
): Promise<MongoClient> {
  try {
    return await clientPromise;
  } catch (err) {
    if (retries <= 0) throw err;
    console.log(
      `MongoDB connection failed, retrying... (${retries} attempts left)`
    );
    await new Promise((resolve) => setTimeout(resolve, delay));
    return getMongoClient(retries - 1, delay * 2);
  }
}

export async function connectToDatabase() {
  try {
    const client = await getMongoClient();
    const db = client.db(DB_NAME);
    console.log(
      "Connected to database:",
      db.databaseName,
      "with pool size:",
      options.maxPoolSize
    );
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
