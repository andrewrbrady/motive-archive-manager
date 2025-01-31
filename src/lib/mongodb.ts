// MongoDB configuration v2.0.0
import { MongoClient, MongoClientOptions, Db } from "mongodb";

// Vercel deployment configuration - triggers rebuild
if (!process.env.MONGODB_URI) {
  throw new Error("Please add your MongoDB URI to .env.local");
}

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "motive_archive";

// Connection options with optimal settings for web applications
const options: MongoClientOptions = {
  maxPoolSize: 10, // Maximum number of connections in the pool
  minPoolSize: 5, // Minimum number of connections in the pool
  maxIdleTimeMS: 60000, // Close inactive connections after 60 seconds
  connectTimeoutMS: 10000, // Timeout for initial connection
  socketTimeoutMS: 45000, // Timeout for operations
  waitQueueTimeoutMS: 10000, // How long to wait for a connection from the pool
  retryWrites: true, // Retry failed writes
};

interface CachedConnection {
  conn: { client: MongoClient; db: Db } | null;
  promise: Promise<{ client: MongoClient; db: Db }> | null;
}

// Global connection cache
const globalCache: { mongoClientPromise?: Promise<MongoClient> } = {};
const cached: CachedConnection = {
  conn: null,
  promise: null,
};

// Monitor connection events
function monitorConnection(client: MongoClient) {
  client.on("connectionPoolCreated", () => {
    console.log("MongoDB - Connection pool created");
  });

  client.on("connectionPoolClosed", () => {
    console.log("MongoDB - Connection pool closed");
  });

  client.on("connectionPoolCleared", () => {
    console.log("MongoDB - Connection pool cleared");
  });

  client.on("connectionCreated", () => {
    console.log("MongoDB - New connection created");
  });

  client.on("connectionClosed", () => {
    console.log("MongoDB - Connection closed");
  });

  client.on("error", (error) => {
    console.error("MongoDB - Connection error:", error);
  });
}

// Get a database connection
export async function connectToDatabase() {
  try {
    // If we have a cached connection, return it
    if (cached.conn) {
      return cached.conn;
    }

    // If we have a promise for a connection in progress, return it
    if (cached.promise) {
      return await cached.promise;
    }

    // Create a new connection
    const client = new MongoClient(uri, options);
    monitorConnection(client);

    // Cache the connection promise
    cached.promise = client
      .connect()
      .then((client) => {
        console.log("MongoDB - Connected successfully");
        return {
          client,
          db: client.db(dbName),
        };
      })
      .catch((error) => {
        console.error("MongoDB - Connection error:", {
          error: error instanceof Error ? error.message : "Unknown error",
          stack: error instanceof Error ? error.stack : undefined,
        });
        cached.promise = null;
        throw error;
      });

    // Wait for connection
    cached.conn = await cached.promise;
    return cached.conn;
  } catch (error) {
    console.error("MongoDB - Connection error:", error);
    // Clear cache on error
    cached.conn = null;
    cached.promise = null;
    throw error;
  }
}

// Development-specific client promise handling
let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === "development") {
  if (!globalCache.mongoClientPromise) {
    const client = new MongoClient(uri, options);
    monitorConnection(client);
    globalCache.mongoClientPromise = client.connect();
  }
  clientPromise = globalCache.mongoClientPromise;
} else {
  const client = new MongoClient(uri, options);
  monitorConnection(client);
  clientPromise = client.connect();
}

export default clientPromise;

// Graceful shutdown helper
export async function closeConnection() {
  if (cached.conn) {
    await cached.conn.client.close();
    cached.conn = null;
    cached.promise = null;
    console.log("MongoDB - Connection closed gracefully");
  }
}

// Helper to get current connection stats
export async function getConnectionStats() {
  if (cached.conn) {
    const stats = await cached.conn.client.db().admin().serverStatus();
    return {
      connections: stats.connections,
      poolSize: options.maxPoolSize,
      activeConnections: stats.connections.current,
      availableConnections: stats.connections.available,
    };
  }
  return null;
}
