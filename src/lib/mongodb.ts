// MongoDB configuration v1.0.5
import mongoose from "mongoose";

if (!process.env.MONGODB_URI) {
  throw new Error('Invalid/Missing environment variable: "MONGODB_URI"');
}

const uri = process.env.MONGODB_URI;
const options = {
  bufferCommands: true,
  dbName: "motive_archive",
  autoCreate: true,
};

let clientPromise: Promise<typeof mongoose>;

if (process.env.NODE_ENV === "development") {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  let globalWithMongoose = global as typeof globalThis & {
    mongoose: Promise<typeof mongoose>;
  };
  if (!globalWithMongoose.mongoose) {
    globalWithMongoose.mongoose = mongoose.connect(uri, options);
  }
  clientPromise = globalWithMongoose.mongoose;
} else {
  // In production mode, it's best to not use a global variable.
  clientPromise = mongoose.connect(uri, options);
}

// Graceful shutdown handlers
["SIGINT", "SIGTERM", "SIGQUIT"].forEach((signal) => {
  process.on(signal, async () => {
    try {
      const client = await clientPromise;
      await client.connection.close();
      console.log("MongoDB connection closed.");
      process.exit(0);
    } catch (err) {
      console.error("Error closing MongoDB connection:", err);
      process.exit(1);
    }
  });
});

export async function connectToDatabase() {
  try {
    const client = await clientPromise;
    console.log("Connected to database:", {
      name: client.connection.name,
      uri: client.connection.host,
    });
    return client;
  } catch (error) {
    console.error("Error connecting to database:", error);
    throw error;
  }
}
