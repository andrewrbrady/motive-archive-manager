// MongoDB configuration v1.0.1
import { MongoClient, ServerApiVersion } from "mongodb";

// Vercel deployment configuration - triggers rebuild
if (!process.env.MONGODB_URI) {
  throw new Error("Please add your Mongo URI to .env.local");
}

const uri = process.env.MONGODB_URI;

const options = {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
  // Only use TLS in production
  ...(process.env.NODE_ENV === "production"
    ? {
        tls: true,
        tlsAllowInvalidCertificates: false,
      }
    : {}),
  connectTimeoutMS: 10000,
  socketTimeoutMS: 45000,
  maxPoolSize: 50,
  minPoolSize: 5,
  maxIdleTimeMS: 120000,
};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === "development") {
  const globalWithMongo = global as typeof globalThis & {
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

export default clientPromise;
