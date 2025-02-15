// MongoDB configuration v1.0.5
import { MongoClient, MongoClientOptions } from "mongodb";

if (!process.env.MONGODB_URI) {
  throw new Error("Please add your Mongo URI to .env.local");
}

if (!process.env.MONGODB_DB) {
  throw new Error("Please add MONGODB_DB to .env.local");
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
const dbName = process.env.MONGODB_DB || "motive_archive";

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
    try {
      await client.close();
      console.log("MongoDB connection closed.");
      process.exit(0);
    } catch (err) {
      console.error("Error closing MongoDB connection:", err);
      process.exit(1);
    }
  });
});

export default clientPromise;

export async function connectToDatabase() {
  try {
    const client = await clientPromise;
    const db = client.db(dbName);
    console.log("Connected to database:", {
      name: db.databaseName,
      uri:
        process.env.MONGODB_URI?.split("@")[1]?.split("/")[0] ||
        "URI not found",
    });
    return { db, client };
  } catch (error) {
    console.error("Failed to connect to database:", error);
    throw error;
  }
}
