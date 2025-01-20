const { MongoClient } = require("mongodb");
const dotenv = require("dotenv");

// Load environment variables from .env.local
dotenv.config({ path: ".env.local" });

async function testConnection() {
  if (!process.env.MONGODB_URI) {
    console.error("Error: MONGODB_URI is not defined in .env.local");
    process.exit(1);
  }

  const client = new MongoClient(process.env.MONGODB_URI);

  try {
    console.log("Connecting to MongoDB Atlas...");
    await client.connect();
    console.log("Successfully connected to MongoDB Atlas!");

    const dbName = "motive_archive";
    const db = client.db(dbName);

    // Get total count of cars
    const totalCars = await db.collection("cars").countDocuments();
    console.log(`\nTotal cars in database: ${totalCars}`);

    // Get sample of 3 cars
    const sampleCars = await db.collection("cars").find().limit(3).toArray();
    console.log("\nSample cars:");
    sampleCars.forEach((car: any, index: number) => {
      console.log(`\nCar ${index + 1}:`);
      console.log(`- Make: ${car.make || "N/A"}`);
      console.log(`- Model: ${car.model || "N/A"}`);
      console.log(`- Year: ${car.year || "N/A"}`);
      console.log(`- VIN: ${car.vin || "N/A"}`);
    });

    // Get total count of inventory items
    const totalInventory = await db.collection("inventory").countDocuments();
    console.log(`\nTotal inventory items: ${totalInventory}`);

    // Get sample of 3 inventory items
    const sampleInventory = await db
      .collection("inventory")
      .find()
      .limit(3)
      .toArray();
    console.log("\nSample inventory items:");
    sampleInventory.forEach((item: any, index: number) => {
      console.log(`\nItem ${index + 1}:`);
      console.log(`- Make: ${item.make || "N/A"}`);
      console.log(`- Model: ${item.model || "N/A"}`);
      console.log(`- Price: ${item.price || "N/A"}`);
      console.log(`- URL: ${item.url || "N/A"}`);
    });
  } catch (error) {
    console.error("Error connecting to MongoDB Atlas:", error);
  } finally {
    await client.close();
  }
}

testConnection();
