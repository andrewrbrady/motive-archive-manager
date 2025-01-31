// MongoDB configuration v2.0.0
import { MongoClient, MongoClientOptions, Db } from "mongodb";
import { ensureIndexes } from "./db/indexes";

// Vercel deployment configuration - triggers rebuild
if (!process.env.MONGODB_URI) {
  throw new Error("Please add your MongoDB URI to .env.local");
}

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "motive_archive";

// Strict connection options for development
const options: MongoClientOptions = {
  maxPoolSize: 1, // Strict limit to single connection
  minPoolSize: 0, // Don't maintain idle connections
  maxIdleTimeMS: 5000, // Close idle connections after 5 seconds
  connectTimeoutMS: 10000,
  socketTimeoutMS: 45000,
  waitQueueTimeoutMS: 10000,
  retryWrites: true,
  compressors: ["snappy", "zlib"],
  maxConnecting: 1, // Limit concurrent connection attempts
  heartbeatFrequencyMS: 5000, // Check connection health more frequently
};

interface CachedConnection {
  client: MongoClient | null;
  db: Db | null;
  promise: Promise<{ client: MongoClient; db: Db }> | null;
  lastUsed: number;
}

// Single global connection cache
const cached: CachedConnection = {
  client: null,
  db: null,
  promise: null,
  lastUsed: 0,
};

// Monitor connection events
function monitorConnection(client: MongoClient) {
  client.on("connectionPoolCreated", (event) => {
    console.log("MongoDB - Connection pool created", {
      maxSize: event.options?.maxPoolSize,
      minSize: event.options?.minPoolSize,
    });
  });

  client.on("connectionPoolClosed", () => {
    console.log("MongoDB - Connection pool closed");
    cached.client = null;
    cached.db = null;
    cached.promise = null;
    cached.lastUsed = 0;
  });

  client.on("connectionPoolCleared", () => {
    console.log("MongoDB - Connection pool cleared");
  });

  client.on("connectionCreated", () => {
    console.log("MongoDB - New connection created");
    cached.lastUsed = Date.now();
  });

  client.on("connectionClosed", () => {
    console.log("MongoDB - Connection closed");
  });

  client.on("error", (error) => {
    console.error("MongoDB - Connection error:", error);
    // Clear cache on error
    cached.client = null;
    cached.db = null;
    cached.promise = null;
    cached.lastUsed = 0;
  });
}

// Auto-close idle connections
const IDLE_TIMEOUT = 30000; // 30 seconds
setInterval(() => {
  const now = Date.now();
  if (cached.client && now - cached.lastUsed > IDLE_TIMEOUT) {
    console.log("MongoDB - Closing idle connection");
    closeConnection().catch(console.error);
  }
}, 5000);

// Single connection function for the entire application
export async function connectToDatabase(): Promise<{
  client: MongoClient;
  db: Db;
}> {
  const now = Date.now();

  // If we have a cached connection and it's not too old, return it
  if (cached.client && cached.db && now - cached.lastUsed < IDLE_TIMEOUT) {
    cached.lastUsed = now;
    return { client: cached.client, db: cached.db };
  }

  // If connection is too old, close it
  if (cached.client && now - cached.lastUsed >= IDLE_TIMEOUT) {
    await closeConnection();
  }

  // If we have a promise for a connection in progress, return it
  if (cached.promise) {
    cached.lastUsed = now;
    return cached.promise;
  }

  // Create a new connection
  const client = new MongoClient(uri, options);
  monitorConnection(client);

  // Cache the connection promise
  cached.promise = client
    .connect()
    .then(async (client) => {
      const db = client.db(dbName);

      // Ensure indexes exist
      await ensureIndexes(db);

      // Cache the successful connection
      cached.client = client;
      cached.db = db;
      cached.lastUsed = Date.now();

      return { client, db };
    })
    .catch((error) => {
      // Clear cache on error
      cached.promise = null;
      cached.client = null;
      cached.db = null;
      cached.lastUsed = 0;
      throw error;
    });

  return cached.promise;
}

// Graceful shutdown helper
export async function closeConnection() {
  if (cached.client) {
    try {
      await cached.client.close(true); // Force close all connections
    } catch (error) {
      console.error("Error closing MongoDB connection:", error);
    } finally {
      cached.client = null;
      cached.db = null;
      cached.promise = null;
      cached.lastUsed = 0;
      console.log("MongoDB - All connections closed");
    }
  }
}

// Helper to get current connection stats
export async function getConnectionStats() {
  if (cached.client) {
    const stats = await cached.client.db().admin().serverStatus();
    return {
      connections: stats.connections,
      poolSize: options.maxPoolSize,
      activeConnections: stats.connections.current,
      availableConnections: stats.connections.available,
      totalConnectionsCreated: stats.connections.totalCreated,
      lastUsed: cached.lastUsed
        ? new Date(cached.lastUsed).toISOString()
        : null,
      idleTime: cached.lastUsed ? Date.now() - cached.lastUsed : null,
    };
  }
  return null;
}
