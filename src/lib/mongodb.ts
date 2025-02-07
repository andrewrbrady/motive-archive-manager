// MongoDB configuration v1.0.1
import { MongoClient, MongoClientOptions } from "mongodb";

// Vercel deployment configuration - triggers rebuild
if (!process.env.MONGODB_URI) {
  throw new Error("Please add your Mongo URI to .env.local");
}

const uri = process.env.MONGODB_URI;
const options: MongoClientOptions = {
  maxPoolSize: 10,
  minPoolSize: 5,
  maxIdleTimeMS: 30000, // Close idle connections after 30 seconds
  connectTimeoutMS: 10000,
  socketTimeoutMS: 45000,
};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === "development") {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  let globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>;
  };

  if (!globalWithMongo._mongoClientPromise) {
    client = new MongoClient(uri, options);
    globalWithMongo._mongoClientPromise = client.connect();
  }
  clientPromise = globalWithMongo._mongoClientPromise;
} else {
  // In production mode, it's best to not use a global variable.
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

// Handle cleanup on process termination
["SIGINT", "SIGTERM", "SIGQUIT"].forEach((signal) => {
  process.on(signal, () => {
    if (client) {
      console.log("Closing MongoDB connection due to process termination");
      client.close(true).catch(console.error);
    }
    process.exit(0);
  });
});

export default clientPromise;

interface CachedConnection {
  conn: { client: MongoClient; db: any } | null;
  promise: Promise<{ client: MongoClient; db: any }> | null;
}

const cached: CachedConnection = {
  conn: null,
  promise: null,
};

export async function connectToDatabase() {
  try {
    console.log("MongoDB - Attempting connection...");

    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI is not defined");
    }

    if (cached.conn) {
      console.log("MongoDB - Using cached connection");
      return cached.conn;
    }

    if (!cached.promise) {
      console.log("MongoDB - Creating new connection");
      cached.promise = MongoClient.connect(
        process.env.MONGODB_URI,
        options
      ).then((client) => {
        console.log("MongoDB - Connected successfully");
        return {
          client,
          db: client.db(process.env.MONGODB_DB || "motive_archive"),
        };
      });
    }

    cached.conn = await cached.promise;
    return cached.conn;
  } catch (error) {
    console.error("MongoDB - Connection error:", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      uri: process.env.MONGODB_URI
        ? `${process.env.MONGODB_URI.split("@")[0].slice(0, 10)}...`
        : "undefined",
    });
    throw error;
  }
}

// Helper function to safely close a connection
export async function closeConnection(client: MongoClient) {
  try {
    await client.close(true);
    console.log("MongoDB - Connection closed successfully");
  } catch (error) {
    console.error("MongoDB - Error closing connection:", error);
  }
}
