import { MongoClient, ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { ImageMetadata, getFormattedImageUrl } from "@/lib/cloudflare";

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

// Add these types at the top of the file after the imports
type PipelineStage = {
  $match?: Record<string, any>;
  $lookup?: {
    from: string;
    let?: Record<string, any>;
    pipeline?: any[];
    as: string;
  };
  $project?: Record<string, any>;
  $addFields?: Record<string, any>;
  $unwind?: string | { path: string; preserveNullAndEmptyArrays?: boolean };
};

// Helper function to get MongoDB client
async function getMongoClient() {
  const client = new MongoClient(MONGODB_URI as string, {
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

    // Parse query parameters for field selection
    const url = new URL(request.url);
    const fieldsParam = url.searchParams.get("fields");
    const includeImages = url.searchParams.get("includeImages");
    const imageCategory = url.searchParams.get("imageCategory");

    client = await getMongoClient();
    const db = client.db(DB_NAME);

    // Create a projection object based on requested fields
    let projection: Record<string, number> = {};

    if (fieldsParam) {
      const fields = fieldsParam.split(",");
      fields.forEach((field) => {
        projection[field.trim()] = 1;
      });

      // Always include _id unless explicitly excluded
      if (!fields.includes("-_id")) {
        projection["_id"] = 1;
      }

      // Always include imageIds for fallback
      projection["imageIds"] = 1;
    }

    // Use aggregation to fetch car with selected fields and image strategy
    const pipeline: PipelineStage[] = [
      {
        $match: { _id: objectId },
      },
    ];

    // If showing images, handle them appropriately
    if (includeImages === "true") {
      // Convert string imageIds to ObjectIds for proper lookup
      pipeline.push({
        $addFields: {
          imageObjectIds: {
            $map: {
              input: { $ifNull: ["$imageIds", []] },
              as: "id",
              in: { $toObjectId: "$$id" },
            },
          },
        },
      });

      // Lookup images using the converted ObjectIds
      pipeline.push({
        $lookup: {
          from: "images",
          let: { imageIds: "$imageObjectIds" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $in: ["$_id", "$$imageIds"],
                },
              },
            },
            // Filter by category if specified
            ...(imageCategory
              ? [
                  {
                    $match: {
                      $or: [
                        { "metadata.category": imageCategory },
                        {
                          $and: [
                            { "metadata.category": { $exists: false } },
                            {
                              [`metadata.${imageCategory}`]: { $exists: true },
                            },
                          ],
                        },
                      ],
                    },
                  },
                ]
              : []),
          ],
          as: "images",
        },
      });

      // Clean up temporary field
      pipeline.push({
        $project: {
          imageObjectIds: 0,
          ...Object.keys(projection).reduce((acc, key) => {
            acc[key] = 1;
            return acc;
          }, {} as Record<string, number>),
        },
      });
    }

    // Add projection if fields were specified
    if (Object.keys(projection).length > 0 && includeImages !== "true") {
      pipeline.push({ $project: projection });
    }

    // Execute the aggregation
    const car = await db.collection("cars").aggregate(pipeline).next();

    if (!car) {
      return NextResponse.json({ error: "Car not found" }, { status: 404 });
    }

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
        .filter((img) => img != null && img.url)
        .map((img) => ({
          ...img,
          _id: img._id?.toString() || "",
          car_id: img.carId?.toString() || img.car_id?.toString() || "",
          url: getFormattedImageUrl(img.url), // Use our new utility function
          metadata: {
            ...img.metadata,
            // Set isPrimary flag based on primaryImageId
            isPrimary:
              car.primaryImageId &&
              img._id.toString() === car.primaryImageId.toString(),
          },
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

    // Generate a unique ETag based on updatedAt timestamp
    const etag = `"${standardizedCar.updatedAt || new Date().toISOString()}"`;

    return new NextResponse(JSON.stringify(standardizedCar), {
      headers: {
        "Content-Type": "application/json",
        ETag: etag,
        "Cache-Control": "private, max-age=10",
      },
    });
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

    // Remove _id from updates to prevent MongoDB error
    const { _id, ...updatesWithoutId } = updates;

    // Clean up the updates object
    const cleanedUpdates = Object.entries(updatesWithoutId).reduce<
      Record<string, any>
    >((acc, [key, value]) => {
      // Skip null or undefined values, but allow empty strings and zero values
      if (value === null || value === undefined) {
        // Special case: preserve images and imageIds even if not in update
        if (
          (key === "images" || key === "imageIds") &&
          existingCar &&
          existingCar[key]
        ) {
          acc[key] = existingCar[key];
        }
        return acc;
      }

      // Handle client field specifically
      if (key === "client") {
        if (!value) {
          acc[key] = null;
        } else {
          try {
            // Validate the client ID format
            if (!ObjectId.isValid(value.toString())) {
              throw new Error(`Invalid client ID format: ${value}`);
            }
            // Store client ID as ObjectId for consistency
            acc[key] = new ObjectId(value.toString());
          } catch (error) {
            console.error("Error converting client ID:", error);
            throw new Error(`Invalid client ID format: ${value}`);
          }
        }
        return acc;
      }

      // Handle nested objects (including measurements and complex structures)
      if (typeof value === "object" && !Array.isArray(value)) {
        const cleaned = Object.entries(value).reduce<Record<string, any>>(
          (nested, [nestedKey, nestedValue]) => {
            // Skip null or undefined nested values, but allow empty strings and zero values
            if (nestedValue === null || nestedValue === undefined) {
              return nested;
            }

            // Handle measurement values
            if (
              typeof nestedValue === "object" &&
              "value" in nestedValue &&
              "unit" in nestedValue
            ) {
              // Allow zero values for measurements
              nested[nestedKey] = nestedValue;
              return nested;
            }

            // Handle other nested objects
            if (
              typeof nestedValue === "object" &&
              !Array.isArray(nestedValue)
            ) {
              const deepCleaned = Object.entries(nestedValue).reduce<
                Record<string, any>
              >((deep, [deepKey, deepValue]) => {
                if (deepValue === null || deepValue === undefined) {
                  return deep;
                }
                return { ...deep, [deepKey]: deepValue };
              }, {});
              if (Object.keys(deepCleaned).length > 0) {
                nested[nestedKey] = deepCleaned;
              }
              return nested;
            }

            nested[nestedKey] = nestedValue;
            return nested;
          },
          {}
        );
        if (Object.keys(cleaned).length > 0) {
          acc[key] = cleaned;
        }
        return acc;
      }

      // Handle arrays
      if (Array.isArray(value)) {
        acc[key] = value.filter((item) => item !== null && item !== undefined);
        return acc;
      }

      acc[key] = value;
      return acc;
    }, {});

    console.log("\nCleaned Updates:", JSON.stringify(cleanedUpdates, null, 2));

    client = await getMongoClient();
    const db = client.db(DB_NAME);

    // Validate car ID
    if (!ObjectId.isValid(params.id)) {
      throw new Error(`Invalid car ID format: ${params.id}`);
    }
    const objectId = new ObjectId(params.id);

    // First verify the car exists
    const existingCar = await db.collection("cars").findOne({ _id: objectId });
    if (!existingCar) {
      console.error(`Car not found with ID: ${params.id}`);
      return NextResponse.json({ error: "Car not found" }, { status: 404 });
    }

    // Update the updatedAt timestamp
    cleanedUpdates.updatedAt = new Date();

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
    console.error(
      "Stack trace:",
      error instanceof Error ? error.stack : "No stack trace available"
    );
    console.error("\n=========================\n");

    return NextResponse.json(
      {
        error: "Failed to update car",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  } finally {
    if (client) {
      await client.close();
    }
  }
}
