// MongoDB configuration v1.0.5
import { MongoClient, MongoClientOptions } from "mongodb";

if (!process.env.MONGODB_URI) {
  throw new Error("Please add your Mongo URI to .env.local");
}

// Parse the MongoDB URI to get direct connection details if SRV lookup fails
function getDirectConnectionUri(uri: string): string {
  try {
    if (!uri.includes("mongodb+srv://")) {
      return uri; // Already a direct connection
    }

    const matches = uri.match(/mongodb\+srv:\/\/(.*?)@(.*?)\/(.*?)(\?.*)?$/);
    if (!matches) return uri;

    const [_, auth, host] = matches;
    const baseHost = host.split(".").slice(1).join(".");
    const shards = [
      `${host.split(".")[0]}-shard-00-00.${baseHost}:27017`,
      `${host.split(".")[0]}-shard-00-01.${baseHost}:27017`,
      `${host.split(".")[0]}-shard-00-02.${baseHost}:27017`,
    ];

    return `mongodb://${auth}@${shards.join(",")}/?ssl=true&replicaSet=atlas-${
      host.split("-")[0]
    }&authSource=admin`;
  } catch (error) {
    console.error("Error converting SRV URI to direct:", error);
    return uri;
  }
}

// Safely get the MongoDB URI from environment variables
const uri = process.env.MONGODB_URI;
const directUri = getDirectConnectionUri(uri);

// MongoDB client options
const options: MongoClientOptions = {
  maxPoolSize: 10,
  minPoolSize: 5,
  maxIdleTimeMS: 60000,
  connectTimeoutMS: 30000,
  socketTimeoutMS: 45000,
  serverSelectionTimeoutMS: 30000,
  retryWrites: true,
  retryReads: true,
  w: "majority",
  directConnection: false,
};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

// Development mode uses global variable to preserve connection across HMR
if (process.env.NODE_ENV === "development") {
  let globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>;
  };

  if (!globalWithMongo._mongoClientPromise) {
    client = new MongoClient(uri, options);
    globalWithMongo._mongoClientPromise = client.connect();
  }
  clientPromise = globalWithMongo._mongoClientPromise;
} else {
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

// Graceful shutdown handlers
["SIGINT", "SIGTERM", "SIGQUIT"].forEach((signal) => {
  process.on(signal, async () => {
    if (client) {
      console.log(
        "Gracefully closing MongoDB connection due to process termination"
      );
      try {
        await client.close(true);
        console.log("MongoDB connection closed successfully");
      } catch (error) {
        console.error("Error closing MongoDB connection:", error);
      }
    }
    process.exit(0);
  });
});

// Create a new connection with optional direct connection setting
async function createConnection(
  connectionUri: string,
  useDirectConnection: boolean = false
): Promise<MongoClient> {
  const connectionOptions = {
    ...options,
    directConnection: useDirectConnection,
  };

  const newClient = new MongoClient(connectionUri, connectionOptions);
  return newClient.connect();
}

// Connection caching interface and implementation
interface CachedConnection {
  conn: { client: MongoClient; db: any } | null;
  promise: Promise<{ client: MongoClient; db: any }> | null;
}

const cached: CachedConnection = {
  conn: null,
  promise: null,
};

const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000;

// Main database connection function with improved error handling
export async function connectToDatabase() {
  try {
    console.log("MongoDB - Attempting connection...");

    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI is not defined");
    }

    if (cached.conn) {
      try {
        await cached.conn.client.db().admin().ping();
        console.log("MongoDB - Using cached connection (verified)");
        return cached.conn;
      } catch (error) {
        console.log(
          "MongoDB - Cached connection dead, creating new connection"
        );
        cached.conn = null;
        cached.promise = null;
      }
    }

    if (!cached.promise) {
      console.log("MongoDB - Creating new connection");
      let lastError: Error | null = null;

      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
          const client = await clientPromise;
          cached.promise = Promise.resolve({
            client,
            db: client.db(process.env.MONGODB_DB || "motive_archive"),
          });
          console.log("MongoDB - Connected successfully using SRV");
          break;
        } catch (error: any) {
          lastError = error;
          if (error.code === "ETIMEOUT" && error.syscall === "querySrv") {
            console.log(
              "MongoDB - SRV lookup failed, trying direct connection"
            );
            try {
              const client = await createConnection(directUri, true);
              cached.promise = Promise.resolve({
                client,
                db: client.db(process.env.MONGODB_DB || "motive_archive"),
              });
              console.log(
                "MongoDB - Connected successfully using direct connection"
              );
              break;
            } catch (directError) {
              console.error("MongoDB - Direct connection failed:", directError);
              lastError = directError;
            }
          }

          if (attempt < MAX_RETRIES - 1) {
            const delay = INITIAL_RETRY_DELAY * Math.pow(2, attempt);
            console.log(
              `MongoDB - Connection attempt ${
                attempt + 1
              } failed, retrying in ${delay}ms`
            );
            await new Promise((resolve) => setTimeout(resolve, delay));
          }
        }
      }

      if (lastError) {
        throw lastError;
      }
    }

    cached.conn = await cached.promise;
    return cached.conn;
  } catch (error) {
    console.error("MongoDB - Connection error:", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      // Safely log URI without credentials
      uri: process.env.MONGODB_URI ? "mongodb+srv://[redacted]" : "undefined",
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

export default clientPromise;
