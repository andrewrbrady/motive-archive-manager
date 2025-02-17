// MongoDB configuration v1.0.5
import mongoose from "mongoose";
import { MongoClient } from "mongodb";

if (!process.env.MONGODB_URI) {
  throw new Error('Invalid/Missing environment variable: "MONGODB_URI"');
}

const uri = process.env.MONGODB_URI;
const options = {
  bufferCommands: true,
  dbName: "motive_archive",
  autoCreate: true,
};

// Global is used here to maintain a cached connection across hot reloads
// in development. This prevents connections growing exponentially
// during API Route usage.
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

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
      console.log("New Mongoose connection established");
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

// Initialize Mongoose connection
dbConnect().catch(console.error);

// For native MongoDB client connection (used by direct collection access)
if (!global._mongoClientPromise) {
  const client = new MongoClient(uri);
  global._mongoClientPromise = client.connect();
}

export const clientPromise = global._mongoClientPromise;

export async function connectToDatabase() {
  try {
    const client = await clientPromise;
    const db = client.db("motive_archive");

    console.log("Connected to database:", {
      name: db.databaseName,
      uri: client.options.hosts?.join(","),
    });

    return { client, db };
  } catch (error) {
    console.error("Error connecting to database:", error);
    throw error;
  }
}

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
