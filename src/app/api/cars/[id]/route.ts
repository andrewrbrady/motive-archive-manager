import { MongoClient, ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { ImageMetadata } from "@/lib/cloudflare";

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB || "motive_archive";

if (!MONGODB_URI) {
  throw new Error("Please add your Mongo URI to .env.local");
}

interface StandardizedCar {
  _id: string;
  price: {
    listPrice: number | null;
    soldPrice?: number | null;
    priceHistory: Array<{
      type: "list" | "sold";
      price: number | null;
      date: string;
      notes?: string;
    }>;
  };
  year: number;
  mileage: {
    value: number;
    unit: string;
  };
  status: string;
  imageIds: string[];
  images: Array<{
    _id: string;
    car_id: string;
    [key: string]: any;
  }>;
  client: string | null;
  clientInfo: {
    _id: string;
    [key: string]: any;
  } | null;
  createdAt: string;
  updatedAt: string;
  [key: string]: any;
}

interface Car {
  _id: ObjectId;
  documents: string[];
  imageIds: ObjectId[];
  client?: string;
  clientInfo?: {
    _id: string;
    name: string;
    email: string;
    phone: string;
    address: {
      street: string;
      city: string;
      state: string;
      zipCode: string;
      country: string;
    };
    businessType: string;
  };
}

interface Image {
  _id: ObjectId;
  cloudflareId: string;
  url: string;
  filename: string;
  metadata: ImageMetadata;
  carId: ObjectId;
  createdAt: string;
  updatedAt: string;
}

interface UpdateBody {
  documentId?: string;
  images?: any[];
  [key: string]: any;
}

// Helper function to get MongoDB client
async function getMongoClient() {
  const client = new MongoClient(MONGODB_URI, {
    connectTimeoutMS: 10000,
    socketTimeoutMS: 45000,
  });
  await client.connect();
  return client;
}

// GET car by ID
export async function GET(
  request: Request,
  context: { params: { id: string } }
) {
  let client;
  try {
    const { id } = await Promise.resolve(context.params);
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid car ID format" },
        { status: 400 }
      );
    }
    const objectId = new ObjectId(id);

    client = await getMongoClient();
    const db = client.db(DB_NAME);

    // Log the request for debugging
    console.log("Fetching car with ID:", id);

    // Use aggregation to populate images
    const car = await db
      .collection("cars")
      .aggregate([
        { $match: { _id: objectId } },
        {
          $lookup: {
            from: "images",
            localField: "imageIds",
            foreignField: "_id",
            as: "images",
          },
        },
      ])
      .next();

    // Log raw data for debugging
    console.log("Raw car data:", car);

    if (!car) {
      return NextResponse.json({ error: "Car not found" }, { status: 404 });
    }

    try {
      // Basic car data with defensive checks
      const standardizedCar: StandardizedCar = {
        ...car,
        _id: car._id?.toString() || "unknown",
        price: {
          listPrice:
            typeof car.price === "object"
              ? car.price.listPrice
              : typeof car.price === "string"
              ? parseFloat(car.price)
              : typeof car.price === "number"
              ? car.price
              : null,
          soldPrice: typeof car.price === "object" ? car.price.soldPrice : null,
          priceHistory:
            typeof car.price === "object" ? car.price.priceHistory : [],
        },
        year:
          typeof car.year === "string"
            ? parseInt(car.year, 10)
            : car.year || new Date().getFullYear(),
        mileage: car.mileage
          ? {
              value:
                typeof car.mileage.value === "string"
                  ? parseFloat(car.mileage.value)
                  : car.mileage.value || 0,
              unit: car.mileage.unit || "mi",
            }
          : { value: 0, unit: "mi" },
        status: car.status || "available",
        imageIds: [],
        images: [],
        client: null,
        clientInfo: null,
        createdAt: "",
        updatedAt: "",
      };

      // Handle arrays with defensive checks
      if (Array.isArray(car.imageIds)) {
        standardizedCar.imageIds = car.imageIds
          .filter((id) => id != null)
          .map((id) => id?.toString() || "");
      }

      if (Array.isArray(car.images)) {
        standardizedCar.images = car.images
          .filter((img) => img != null)
          .map((img) => ({
            ...img,
            _id: img._id?.toString() || "",
            car_id: img.car_id?.toString() || "",
          }));
      }

      // Handle client info with defensive checks
      standardizedCar.client = car.client?.toString() || null;
      standardizedCar.clientInfo = car.clientInfo
        ? {
            ...car.clientInfo,
            _id: car.clientInfo._id?.toString() || "",
          }
        : null;

      // Handle dates with defensive checks
      standardizedCar.createdAt =
        car.createdAt instanceof Date
          ? car.createdAt.toISOString()
          : car.createdAt || new Date().toISOString();
      standardizedCar.updatedAt =
        car.updatedAt instanceof Date
          ? car.updatedAt.toISOString()
          : car.updatedAt || new Date().toISOString();

      // Log standardized data for debugging
      console.log("Standardized car data:", standardizedCar);

      return NextResponse.json(standardizedCar);
    } catch (error) {
      console.error("Error standardizing car data:", error);
      return NextResponse.json(
        { error: "Failed to process car data" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error fetching car:", error);
    return NextResponse.json({ error: "Failed to fetch car" }, { status: 500 });
  } finally {
    if (client) {
      await client.close();
    }
  }
}

// PUT/PATCH to update car information
export async function PUT(
  request: Request,
  context: { params: { id: string } }
) {
  const client = await getMongoClient();
  try {
    const { id } = await Promise.resolve(context.params);
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid car ID format" },
        { status: 400 }
      );
    }
    const objectId = new ObjectId(id);
    const updates = await request.json();

    // Remove _id from updates if present to prevent MongoDB errors
    delete updates._id;

    const db = client.db(DB_NAME);
    const result = await db
      .collection<Car>("cars")
      .updateOne({ _id: objectId }, { $set: updates });

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Car not found" }, { status: 404 });
    }

    // Fetch and return the updated car
    const updatedCar = await db.collection<Car>("cars").findOne({
      _id: objectId,
    });

    return NextResponse.json(updatedCar);
  } catch (error) {
    console.error("Error updating car:", error);
    return NextResponse.json(
      { error: "Failed to update car" },
      { status: 500 }
    );
  } finally {
    await client.close();
  }
}

// DELETE car
export async function DELETE(
  request: Request,
  context: { params: { id: string } }
) {
  let client;
  try {
    const { id } = context.params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid car ID format" },
        { status: 400 }
      );
    }
    const objectId = new ObjectId(id);

    client = await getMongoClient();
    const db = client.db(DB_NAME);

    console.log(`Deleting car with ID: ${id}`);
    const result = await db.collection("cars").deleteOne({
      _id: objectId,
    });

    if (result.deletedCount === 0) {
      console.log(`Car not found with ID: ${id}`);
      return NextResponse.json({ error: "Car not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting car:", error);
    return NextResponse.json(
      { error: "Failed to delete car" },
      { status: 500 }
    );
  } finally {
    if (client) {
      console.log(`Closing MongoDB connection for car ${context.params.id}`);
      await client.close();
    }
  }
}

// Helper function to clean aiAnalysis
function cleanAiAnalysis(car: any) {
  if (!car.aiAnalysis) return car;

  // Remove redundant fields that we already have structured data for
  const cleanedAnalysis = Object.fromEntries(
    Object.entries(car.aiAnalysis).filter(([key]) => {
      return (
        !key.toLowerCase().includes("gvwr") &&
        !key.toLowerCase().includes("weight") &&
        !key.toLowerCase().includes("engine") &&
        !key.toLowerCase().includes("doors") &&
        !key.toLowerCase().includes("displacement") &&
        !key.toLowerCase().includes("horsepower") &&
        !key.toLowerCase().includes("tire")
      );
    })
  );

  // If there are no fields left, remove the aiAnalysis object entirely
  if (Object.keys(cleanedAnalysis).length === 0) {
    delete car.aiAnalysis;
  } else {
    car.aiAnalysis = cleanedAnalysis;
  }

  return car;
}

// Helper function to convert MongoDB document to plain object
function convertToPlainObject(doc: any): any {
  if (doc === null || typeof doc !== "object") {
    return doc;
  }

  if (doc instanceof ObjectId) {
    return doc.toString();
  }

  if (Array.isArray(doc)) {
    return doc.map(convertToPlainObject);
  }

  const plainObj: any = {};
  for (const key in doc) {
    if (Object.prototype.hasOwnProperty.call(doc, key)) {
      plainObj[key] = convertToPlainObject(doc[key]);
    }
  }
  return plainObj;
}

// PATCH to update car information
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  let client;
  try {
    console.log("\n=== CAR UPDATE API CALLED ===");
    console.log("Car ID:", params.id);

    const updates = await request.json();
    console.log("\nReceived Updates:", JSON.stringify(updates, null, 2));

    // Clean up the updates object
    const cleanedUpdates = Object.entries(updates).reduce(
      (acc, [key, value]) => {
        // Skip null, undefined, or empty string values
        if (value === null || value === undefined || value === "") {
          return acc;
        }

        // Handle client field specifically
        if (key === "client" && value) {
          try {
            // Store client ID as ObjectId for consistency
            acc[key] = new ObjectId(value.toString());
          } catch (error) {
            console.error("Error converting client ID:", error);
            throw new Error("Invalid client ID format");
          }
          return acc;
        }

        // Handle nested objects
        if (typeof value === "object" && !Array.isArray(value)) {
          const cleaned = Object.entries(value).reduce(
            (nested, [nestedKey, nestedValue]) => {
              if (
                nestedValue === null ||
                nestedValue === undefined ||
                nestedValue === ""
              ) {
                return nested;
              }
              return { ...nested, [nestedKey]: nestedValue };
            },
            {}
          );
          if (Object.keys(cleaned).length > 0) {
            acc[key] = cleaned;
          }
          return acc;
        }
        acc[key] = value;
        return acc;
      },
      {}
    );

    console.log("\nCleaned Updates:", JSON.stringify(cleanedUpdates, null, 2));

    client = await getMongoClient();
    const db = client.db(DB_NAME);
    const objectId = new ObjectId(params.id);

    // First verify the car exists
    const existingCar = await db.collection("cars").findOne({ _id: objectId });
    if (!existingCar) {
      console.error(`Car not found with ID: ${params.id}`);
      return NextResponse.json({ error: "Car not found" }, { status: 404 });
    }

    // Perform the update with cleaned data
    const result = await db
      .collection("cars")
      .findOneAndUpdate(
        { _id: objectId },
        { $set: cleanedUpdates },
        { returnDocument: "after" }
      );

    if (!result) {
      console.error("Update failed - no document returned");
      throw new Error("Failed to update car");
    }

    // Convert to plain object to ensure it's JSON serializable
    const serializedCar = convertToPlainObject(result);
    console.log("\nUpdated Car State:", JSON.stringify(serializedCar, null, 2));
    console.log("\n=== CAR UPDATE COMPLETED ===\n");

    return NextResponse.json(serializedCar);
  } catch (error) {
    console.error("\n=== CAR UPDATE ERROR ===");
    console.error("Error details:", error);
    console.error("Stack trace:", error.stack);
    console.error("\n=========================\n");

    return NextResponse.json(
      { error: "Failed to update car", details: error.message },
      { status: 500 }
    );
  } finally {
    if (client) {
      await client.close();
    }
  }
}
