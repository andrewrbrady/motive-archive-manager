import { MongoClient, ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { StandardizedCar } from "@/types/routes/cars";
import { cleanAiAnalysis, convertToPlainObject } from "@/utils/car-helpers";
import { fixCloudflareImageUrl } from "@/lib/image-utils";

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB || "motive_archive";

// ✅ PERFORMANCE FIX: Use ISR instead of force-dynamic
export const revalidate = 300; // 5 minutes

if (!MONGODB_URI) {
  throw new Error("Please add your Mongo URI to .env.local");
}

interface Car {
  _id: ObjectId;
  documents: string[];
  imageIds: ObjectId[];
  primaryImageId?: ObjectId;
  galleryIds?: ObjectId[];
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
  make: string;
  model: string;
  year?: number;
  vin?: string;
  color?: string;
  mileage?: {
    value: number;
    unit: string;
  };
  price?: any;
  description?: string;
  status?: string;
  condition?: string;
  location?: string;
  type?: string;
  doors?: number;
  interior_color?: string;
  engine?: {
    type?: string;
    displacement?: {
      value: number;
      unit: string;
    };
    power?: {
      hp: number;
      kW: number;
      ps: number;
    };
    torque?: {
      "lb-ft": number;
      Nm: number;
    };
    features?: string[];
    configuration?: string;
    cylinders?: number;
    fuelType?: string;
    manufacturer?: string;
  };
  transmission?: {
    type: string;
    speeds?: number;
  };
  dimensions?: {
    length?: { value: number; unit: string };
    width?: { value: number; unit: string };
    height?: { value: number; unit: string };
    wheelbase?: { value: number; unit: string };
    trackWidth?: { value: number; unit: string };
    weight?: { value: number; unit: string };
    gvwr?: { value: number; unit: string };
  };
  manufacturing?: {
    plant?: {
      city?: string;
      country?: string;
      company?: string;
    };
    series?: string;
    trim?: string;
    bodyClass?: string;
  };
  performance?: {
    "0_to_60_mph"?: { value: number; unit: string };
    top_speed?: { value: number; unit: string };
  };
  interior_features?: {
    seats?: number;
    upholstery?: string;
    features?: string[];
  };
  safety?: {
    tpms?: {
      type: string;
      present: boolean;
    };
    [key: string]: any;
  };
  aiAnalysis?: {
    [key: string]: {
      value: string;
      confidence: "confirmed" | "inferred" | "suggested";
      source: string;
    };
  };
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

interface Image {
  _id: ObjectId;
  cloudflareId: string;
  url: string;
  filename: string;
  metadata: any;
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
export async function GET(request: Request) {
  let client;
  try {
    const url = new URL(request.url);
    const segments = url.pathname.split("/");
    const id = segments[segments.length - 1]; // -1 because URL is /cars/[id]

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid car ID format" },
        { status: 400 }
      );
    }
    const objectId = new ObjectId(id);

    // Parse query parameters for field selection
    const fieldsParam = url.searchParams.get("fields");
    const includeImages = url.searchParams.get("includeImages");
    const imageCategory = url.searchParams.get("imageCategory");
    const includeGalleries = url.searchParams.get("includeGalleries");

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
      // Always include galleryIds for fallback
      projection["galleryIds"] = 1;
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
              in: {
                $cond: [
                  { $eq: [{ $type: "$$id" }, "objectId"] },
                  "$$id",
                  {
                    $cond: [
                      { $eq: [{ $type: "$$id" }, "string"] },
                      { $toObjectId: "$$id" },
                      null,
                    ],
                  },
                ],
              },
            },
          },
        },
      });
      // Filter out any nulls from conversion
      pipeline.push({
        $addFields: {
          imageObjectIds: {
            $filter: { input: "$imageObjectIds", as: "x", cond: { $ne: ["$$x", null] } },
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
          ...Object.keys(projection).reduce(
            (acc, key) => {
              acc[key] = 1;
              return acc;
            },
            {} as Record<string, number>
          ),
        },
      });
    }

    // If including galleries, handle them appropriately
    if (includeGalleries === "true") {
      // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("[CarAPI] Including galleries in response");

      // Convert string galleryIds to ObjectIds for proper lookup
      pipeline.push({
        $addFields: {
          galleryObjectIds: {
            $map: {
              input: { $ifNull: ["$galleryIds", []] },
              as: "id",
              in: {
                $cond: {
                  if: { $type: "$$id" },
                  then: { $toObjectId: "$$id" },
                  else: null,
                },
              },
            },
          },
        },
      });

      // Clean up null values from the conversion
      pipeline.push({
        $addFields: {
          galleryObjectIds: {
            $filter: {
              input: "$galleryObjectIds",
              cond: { $ne: ["$$this", null] },
            },
          },
        },
      });

      // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("[CarAPI] Added gallery ObjectId conversion to pipeline");

      // Lookup galleries using the converted ObjectIds - simplified and more robust
      pipeline.push({
        $lookup: {
          from: "galleries",
          let: { galleryIds: "$galleryObjectIds" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $in: ["$_id", "$$galleryIds"],
                },
              },
            },
          ],
          as: "galleriesRaw",
        },
      });

      // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("[CarAPI] Added gallery lookup to pipeline");

      // Add thumbnail images in a separate, safer lookup
      pipeline.push({
        $addFields: {
          galleries: {
            $map: {
              input: "$galleriesRaw",
              as: "gallery",
              in: {
                $mergeObjects: [
                  "$$gallery",
                  {
                    thumbnailImage: {
                      $cond: {
                        if: {
                          $gt: [
                            { $size: { $ifNull: ["$$gallery.imageIds", []] } },
                            0,
                          ],
                        },
                        then: {
                          _id: { $arrayElemAt: ["$$gallery.imageIds", 0] },
                          url: null, // We'll populate this later if needed
                        },
                        else: null,
                      },
                    },
                  },
                ],
              },
            },
          },
        },
      });

      // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("[CarAPI] Added thumbnail processing to pipeline");

      // Clean up temporary fields
      pipeline.push({
        $project: {
          galleryObjectIds: 0,
          galleriesRaw: 0,
        },
      });

      // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("[CarAPI] Cleaned up temporary fields from pipeline");
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

    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("[CarAPI] Car found:", car._id);
    if (includeGalleries === "true") {
      console.log(
        "[CarAPI] Raw galleries from aggregation:",
        car.galleries?.length || 0
      );
      console.log(
        "[CarAPI] Gallery IDs in result:",
        car.galleries?.map((g: any) => g._id.toString())
      );

      // Populate thumbnail images for galleries if they exist
      if (car.galleries && car.galleries.length > 0) {
        // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("[CarAPI] Populating thumbnail images for galleries");

        // Get all first image IDs from galleries
        const thumbnailImageIds = car.galleries
          .map((gallery: any) =>
            gallery.imageIds && gallery.imageIds.length > 0
              ? gallery.imageIds[0]
              : null
          )
          .filter((id: any) => id !== null);

        if (thumbnailImageIds.length > 0) {
          console.log(
            "[CarAPI] Looking up thumbnail images:",
            thumbnailImageIds.length
          );

          // Fetch the thumbnail images
          const thumbnailImages = await db
            .collection("images")
            .find({ _id: { $in: thumbnailImageIds } })
            .toArray();

          console.log(
            "[CarAPI] Found thumbnail images:",
            thumbnailImages.length
          );

          // Create a map for quick lookup
          const imageMap = new Map(
            thumbnailImages.map((img) => [img._id.toString(), img])
          );

          // Update galleries with proper thumbnail data
          car.galleries = car.galleries.map((gallery: any) => {
            if (gallery.imageIds && gallery.imageIds.length > 0) {
              const firstImageId = gallery.imageIds[0].toString();
              const thumbnailImage = imageMap.get(firstImageId);

              if (thumbnailImage) {
                gallery.thumbnailImage = {
                  _id: thumbnailImage._id.toString(),
                  url: fixCloudflareImageUrl(thumbnailImage.url),
                };
              }
            }
            return gallery;
          });

          // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("[CarAPI] Updated galleries with thumbnail images");
        }
      }
    }

    // Basic car data with defensive checks
    const standardizedCar: StandardizedCar = {
      ...car,
      _id: car._id?.toString() || "unknown",
      make: car.make || "Unknown",
      model: car.model || "Unknown",
      documents: Array.isArray(car.documents) ? car.documents : [],
      primaryImageId: car.primaryImageId?.toString() || undefined,
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
          : car.year !== null && car.year !== undefined
            ? car.year
            : undefined,
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
      galleryIds: [],
      galleries: [],
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

    if (Array.isArray(car.galleryIds)) {
      standardizedCar.galleryIds = car.galleryIds
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
          url: fixCloudflareImageUrl(img.url),
          metadata: {
            ...img.metadata,
            // Set isPrimary flag based on primaryImageId
            isPrimary:
              car.primaryImageId &&
              img._id.toString() === car.primaryImageId.toString(),
          },
        }));
    }

    if (Array.isArray(car.galleries)) {
      standardizedCar.galleries = car.galleries
        .filter((gallery) => gallery != null)
        .map((gallery) => ({
          _id: gallery._id?.toString() || "",
          name: gallery.name || "",
          description: gallery.description,
          imageIds: Array.isArray(gallery.imageIds)
            ? gallery.imageIds
                .map((id: any) => id?.toString() || "")
                .filter(Boolean)
            : [],
          thumbnailImage: gallery.thumbnailImage
            ? {
                _id: gallery.thumbnailImage._id?.toString() || "",
                url: fixCloudflareImageUrl(gallery.thumbnailImage.url),
              }
            : undefined,
          createdAt: gallery.createdAt || "",
          updatedAt: gallery.updatedAt || "",
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

    // Add detailed specifications that the copywriter needs
    // These fields are used by the copywriter for generating captions
    if (car.engine) {
      (standardizedCar as any).engine = car.engine;
    }

    if (car.transmission) {
      (standardizedCar as any).transmission = car.transmission;
    }

    if (car.dimensions) {
      (standardizedCar as any).dimensions = car.dimensions;
    }

    if (car.manufacturing) {
      (standardizedCar as any).manufacturing = car.manufacturing;
    }

    if (car.performance) {
      (standardizedCar as any).performance = car.performance;
    }

    if (car.interior_features) {
      (standardizedCar as any).interior_features = car.interior_features;
    }

    if (car.interior_color) {
      (standardizedCar as any).interior_color = car.interior_color;
    }

    if (car.condition) {
      (standardizedCar as any).condition = car.condition;
    }

    if (car.location) {
      (standardizedCar as any).location = car.location;
    }

    if (car.doors) {
      (standardizedCar as any).doors = car.doors;
    }

    if (car.safety) {
      (standardizedCar as any).safety = car.safety;
    }

    if (car.type) {
      (standardizedCar as any).type = car.type;
    }

    // Include aiAnalysis if it exists (for enriched data)
    if (car.aiAnalysis) {
      (standardizedCar as any).aiAnalysis = car.aiAnalysis;
    }

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
export async function PUT(request: Request) {
  const client = await getMongoClient();
  try {
    const url = new URL(request.url);
    const segments = url.pathname.split("/");
    const id = segments[segments.length - 1]; // -1 because URL is /cars/[id]

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

    // Normalize IDs and strip embedded images before updating
    const $set: Record<string, any> = { ...updates };

    if ($set.images) {
      delete $set.images;
    }

    if (typeof $set.client === "string" && ObjectId.isValid($set.client)) {
      $set.client = new ObjectId($set.client);
    }

    if (Array.isArray($set.imageIds)) {
      $set.imageIds = $set.imageIds
        .filter((id: any) => typeof id === "string" && ObjectId.isValid(id))
        .map((id: string) => new ObjectId(id));
    }

    if (
      typeof $set.primaryImageId === "string" &&
      ObjectId.isValid($set.primaryImageId)
    ) {
      $set.primaryImageId = new ObjectId($set.primaryImageId);
    }

    const db = client.db(DB_NAME);
    const result = await db
      .collection<Car>("cars")
      .updateOne({ _id: objectId }, { $set });

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
export async function DELETE(request: Request) {
  let client;
  try {
    const url = new URL(request.url);
    const segments = url.pathname.split("/");
    const id = segments[segments.length - 1]; // -1 because URL is /cars/[id]

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid car ID format" },
        { status: 400 }
      );
    }
    const objectId = new ObjectId(id);

    client = await getMongoClient();
    const db = client.db(DB_NAME);

    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log(`Deleting car with ID: ${id}`);
    const result = await db.collection("cars").deleteOne({
      _id: objectId,
    });

    if (result.deletedCount === 0) {
      // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log(`Car not found with ID: ${id}`);
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
      // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log(`Closing MongoDB connection for car`);
      await client.close();
    }
  }
}

// PATCH to update car information
export async function PATCH(request: Request) {
  let client;
  try {
    const url = new URL(request.url);
    const segments = url.pathname.split("/").filter(Boolean);
    const id = segments[segments.length - 1]; // -1 because URL is /cars/[id]

    if (process.env.NODE_ENV !== "production") {
      // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("\n=== CAR UPDATE API CALLED ===");
      // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("Car ID:", id);
    }

    const updates = await request.json();
    if (process.env.NODE_ENV !== "production") {
      console.log("\nReceived Updates:", {
        fieldsCount: Object.keys(updates).length,
        hasGalleryIds: !!updates.galleryIds,
        hasClientData: !!updates.client,
        hasSpecifications: !!updates.specifications,
      });
    }

    // Remove _id from updates to prevent MongoDB error
    const { _id, ...updatesWithoutId } = updates;

    // Clean up the updates object
    const cleanedUpdates = Object.entries(updatesWithoutId).reduce<
      Record<string, any>
    >((acc, [key, value]) => {
      // Skip null or undefined values, but allow empty strings and zero values
      if (value === null || value === undefined) {
        return acc;
      }

      // Handle client field specifically
      if (key === "client") {
        if (!value || value === "") {
          acc[key] = null;
        } else {
          try {
            // Check if the value is a valid ObjectId format
            if (ObjectId.isValid(value.toString())) {
              // Store client ID as ObjectId for consistency
              acc[key] = new ObjectId(value.toString());
            } else {
              // For non-ObjectId client values (like legacy string identifiers),
              // store as string and let the application handle the lookup
              acc[key] = value.toString();
            }
          } catch (error) {
            console.error("Error processing client ID:", error);
            // If there's any error, store as string
            acc[key] = value.toString();
          }
        }
        return acc;
      }

      // Handle galleryIds field specifically
      if (key === "galleryIds") {
        if (process.env.NODE_ENV !== "production") {
          // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log(`\n=== GALLERY IDS UPDATE ===`);
          console.log(
            "Received galleryIds count:",
            Array.isArray(value) ? value.length : "not array"
          );
          // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("Type:", typeof value, "IsArray:", Array.isArray(value));
        }

        if (!Array.isArray(value)) {
          if (process.env.NODE_ENV !== "production") {
            // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("galleryIds is not an array, setting to empty array");
          }
          acc[key] = [];
          return acc;
        }

        try {
          // Validate and convert gallery IDs to ObjectIds
          const validGalleryIds = value
            .filter((id) => {
              const isValid = id && ObjectId.isValid(id.toString());
              if (!isValid && process.env.NODE_ENV !== "production") {
                // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log(`Invalid gallery ID filtered out`);
              }
              return isValid;
            })
            .map((id) => {
              const objectId = new ObjectId(id.toString());
              return objectId;
            });

          if (process.env.NODE_ENV !== "production") {
            // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log(`Final galleryIds count: ${validGalleryIds.length}`);
            // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log(`=== END GALLERY IDS UPDATE ===\n`);
          }
          acc[key] = validGalleryIds;
        } catch (error) {
          console.error(
            "Error converting gallery IDs:",
            (error as Error).message
          );
          throw new Error(`Invalid gallery ID format in array`);
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

    if (process.env.NODE_ENV !== "production") {
      console.log(
        "\nCleaned Updates field count:",
        Object.keys(cleanedUpdates).length
      );
    }

    client = await getMongoClient();
    const db = client.db(DB_NAME);

    // Validate car ID
    if (!ObjectId.isValid(id)) {
      throw new Error(`Invalid car ID format: ${id}`);
    }
    const objectId = new ObjectId(id);

    // First verify the car exists
    const existingCar = await db.collection("cars").findOne({ _id: objectId });
    if (!existingCar) {
      console.error(`Car not found with ID: ${id}`);
      return NextResponse.json({ error: "Car not found" }, { status: 404 });
    }

    // Update the updatedAt timestamp
    cleanedUpdates.updatedAt = new Date();

    if (process.env.NODE_ENV !== "production") {
      // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log(`\n=== DATABASE UPDATE ===`);
      // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("Car ID:", objectId);
      // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("Update fields count:", Object.keys(cleanedUpdates).length);
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

    if (process.env.NODE_ENV !== "production") {
      // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log(`Database update successful`);
      console.log(
        "Updated car galleryIds count:",
        result.galleryIds?.length || 0
      );
      // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log(`=== END DATABASE UPDATE ===\n`);
    }

    // Convert to plain object to ensure it's JSON serializable
    const serializedCar = convertToPlainObject(result);
    if (process.env.NODE_ENV !== "production") {
      console.log("\nUpdated Car State:", {
        id: serializedCar._id,
        make: serializedCar.make,
        model: serializedCar.model,
        hasVin: !!serializedCar.vin,
      });
      // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("\n=== CAR UPDATE COMPLETED ===\n");
    }

    return NextResponse.json(serializedCar);
  } catch (error) {
    console.error("\n=== CAR UPDATE ERROR ===");
    console.error(
      "Error details:",
      (error as Error).message || "Unknown error"
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

export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Methods": "GET, PUT, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
