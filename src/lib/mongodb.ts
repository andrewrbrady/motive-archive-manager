import { MongoClient, ServerApiVersion } from "mongodb";

if (!process.env.MONGODB_URI) {
  throw new Error("Please add your Mongo URI to .env.local");
}

// Convert srv connection string to direct connection
const uri = process.env.MONGODB_URI.replace(
  "mongodb+srv://",
  "mongodb://"
).replace(
  "/?",
  ",motivearchive-shard-00-01.aaqps.mongodb.net:27017,motivearchive-shard-00-02.aaqps.mongodb.net:27017/?"
);

const options = {
  ssl: true,
  tls: true,
  tlsAllowInvalidCertificates: false,
  tlsCAFile: undefined,
  replicaSet: "atlas-5aqjui-shard-0",
  authSource: "admin",
  directConnection: false,
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
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
