import { MongoClient, ObjectId } from "mongodb";
import * as dotenv from "dotenv";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB || "motive_archive";
const TEST_CAR_ID = "67d13094dc27b630a36fb449";

if (!MONGODB_URI) {
  throw new Error("Please add your Mongo URI to .env");
}

interface ImageDocument {
  _id: ObjectId;
  cloudflareId: string;
  url: string;
  filename: string;
  metadata: any;
  carId: ObjectId;
  createdAt: string;
  updatedAt: string;
}

class ProcessedImagesFixer {
  private client: MongoClient;
  private db: any;

  constructor() {
    this.client = new MongoClient(MONGODB_URI as string);
  }

  async connect() {
    await this.client.connect();
    this.db = this.client.db(DB_NAME);
    console.log("✅ Connected to MongoDB");
  }

  async disconnect() {
    await this.client.close();
    console.log("✅ Disconnected from MongoDB");
  }

  async findProcessedImagesWithoutMetadata(carId?: string) {
    console.log("\n🔍 FINDING PROCESSED IMAGES WITHOUT FILTERABLE METADATA");

    const query: any = {
      "metadata.category": "processed",
      $and: [
        { "metadata.angle": { $exists: false } },
        { "metadata.view": { $exists: false } },
        { "metadata.movement": { $exists: false } },
        { "metadata.tod": { $exists: false } },
        { "metadata.side": { $exists: false } },
      ],
    };

    if (carId) {
      query.carId = new ObjectId(carId);
    }

    const processedImagesWithoutMetadata = (await this.db
      .collection("images")
      .find(query)
      .toArray()) as ImageDocument[];

    console.log(
      `Found ${processedImagesWithoutMetadata.length} processed images without filterable metadata`
    );

    return processedImagesWithoutMetadata;
  }

  async analyzeOriginalImageReference(processedImage: ImageDocument) {
    // Try to extract original image ID from various possible locations
    const originalImageRef =
      processedImage.metadata?.originalImage ||
      processedImage.metadata?.originalImageId ||
      processedImage.metadata?.originalImageUrl;

    if (!originalImageRef) {
      return null;
    }

    // If it's a URL, try to extract the Cloudflare ID
    if (
      typeof originalImageRef === "string" &&
      originalImageRef.includes("imagedelivery.net")
    ) {
      const match = originalImageRef.match(/\/([a-f0-9\-]{36})\//);
      if (match) {
        const cloudflareId = match[1];

        // Find the original image by cloudflareId
        const originalImage = await this.db.collection("images").findOne({
          cloudflareId: cloudflareId,
          carId: processedImage.carId,
        });

        return originalImage;
      }
    }

    return null;
  }

  async fixProcessedImageMetadata(
    processedImage: ImageDocument,
    dryRun: boolean = false
  ) {
    console.log(`\n🔧 Processing image: ${processedImage._id}`);
    console.log(`   Filename: ${processedImage.filename}`);
    console.log(
      `   Current metadata: ${JSON.stringify(processedImage.metadata, null, 2)}`
    );

    // Try to find the original image
    const originalImage =
      await this.analyzeOriginalImageReference(processedImage);

    if (!originalImage) {
      console.log(`   ❌ Could not find original image reference`);
      return false;
    }

    console.log(`   ✅ Found original image: ${originalImage._id}`);
    console.log(
      `   Original metadata: ${JSON.stringify(originalImage.metadata, null, 2)}`
    );

    // Extract filterable metadata from original image
    const filterableFields = [
      "angle",
      "view",
      "movement",
      "tod",
      "side",
      "description",
    ];
    const metadataToInherit: any = {};

    let inheritedFields = 0;
    for (const field of filterableFields) {
      if (originalImage.metadata?.[field]) {
        metadataToInherit[`metadata.${field}`] = originalImage.metadata[field];
        inheritedFields++;
      }
    }

    if (inheritedFields === 0) {
      console.log(`   ⚠️ Original image has no filterable metadata to inherit`);
      return false;
    }

    console.log(
      `   📋 Will inherit ${inheritedFields} metadata fields: ${Object.keys(
        metadataToInherit
      )
        .map((k) => k.replace("metadata.", ""))
        .join(", ")}`
    );

    if (dryRun) {
      console.log(
        `   🔍 DRY RUN - Would update with: ${JSON.stringify(metadataToInherit)}`
      );
      return true;
    }

    // Update the processed image with inherited metadata
    metadataToInherit.updatedAt = new Date().toISOString();

    const result = await this.db
      .collection("images")
      .updateOne({ _id: processedImage._id }, { $set: metadataToInherit });

    if (result.modifiedCount > 0) {
      console.log(`   ✅ Successfully inherited metadata`);
      return true;
    } else {
      console.log(`   ❌ Failed to update metadata`);
      return false;
    }
  }

  async addDefaultMetadataForUnreferencedImages(
    carId?: string,
    dryRun: boolean = false
  ) {
    console.log("\n🎯 ADDING DEFAULT METADATA FOR UNREFERENCED IMAGES");

    // Find processed images that still have no filterable metadata
    const query: any = {
      "metadata.category": "processed",
      $and: [
        { "metadata.angle": { $exists: false } },
        { "metadata.view": { $exists: false } },
        { "metadata.movement": { $exists: false } },
        { "metadata.tod": { $exists: false } },
        { "metadata.side": { $exists: false } },
      ],
    };

    if (carId) {
      query.carId = new ObjectId(carId);
    }

    const remainingImages = (await this.db
      .collection("images")
      .find(query)
      .toArray()) as ImageDocument[];

    console.log(
      `Found ${remainingImages.length} processed images still without metadata`
    );

    if (remainingImages.length === 0) {
      return 0;
    }

    // Add sensible defaults based on processing type
    let updated = 0;

    for (const image of remainingImages) {
      const processingType = image.metadata?.processing;
      let defaultMetadata: any = {
        movement: "static",
        tod: "day",
      };

      // Determine defaults based on processing type
      if (processingType === "canvas_extension") {
        defaultMetadata.view = "exterior";
        defaultMetadata.angle = "side"; // Most canvas extensions are for side shots
      } else if (processingType === "image_crop") {
        defaultMetadata.view = "exterior";
        defaultMetadata.angle = "front"; // Most crops are detail shots
      } else {
        // Generic processed image
        defaultMetadata.view = "exterior";
        defaultMetadata.angle = "side";
      }

      console.log(`   Processing ${image._id} (${processingType})`);
      console.log(`   Will add defaults: ${JSON.stringify(defaultMetadata)}`);

      if (!dryRun) {
        const updateFields: any = {};
        Object.entries(defaultMetadata).forEach(([key, value]) => {
          updateFields[`metadata.${key}`] = value;
        });
        updateFields.updatedAt = new Date().toISOString();

        const result = await this.db
          .collection("images")
          .updateOne({ _id: image._id }, { $set: updateFields });

        if (result.modifiedCount > 0) {
          updated++;
          console.log(`   ✅ Added default metadata`);
        }
      } else {
        console.log(`   🔍 DRY RUN - Would add default metadata`);
        updated++;
      }
    }

    return updated;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const testMode = !args.includes("--full");
  const dryRun = args.includes("--dry-run");
  const onlyDefaults = args.includes("--only-defaults");

  const carId = testMode ? TEST_CAR_ID : undefined;

  console.log("🔧 Processed Images Metadata Fixer");
  console.log(
    `Mode: ${testMode ? `Test car (${TEST_CAR_ID})` : "Full collection"}`
  );
  console.log(`Dry Run: ${dryRun ? "Yes" : "No"}`);

  const fixer = new ProcessedImagesFixer();

  try {
    await fixer.connect();

    if (!onlyDefaults) {
      // Step 1: Find processed images without metadata
      const processedImages =
        await fixer.findProcessedImagesWithoutMetadata(carId);

      console.log("\n🔄 INHERITING METADATA FROM ORIGINAL IMAGES");
      let inherited = 0;

      for (const processedImage of processedImages) {
        const success = await fixer.fixProcessedImageMetadata(
          processedImage,
          dryRun
        );
        if (success) inherited++;
      }

      console.log(
        `\n✅ Metadata inheritance complete: ${inherited}/${processedImages.length} images updated`
      );
    }

    // Step 2: Add defaults for remaining images
    const defaultsAdded = await fixer.addDefaultMetadataForUnreferencedImages(
      carId,
      dryRun
    );

    console.log(
      `\n✅ Default metadata addition complete: ${defaultsAdded} images updated`
    );
  } catch (error) {
    console.error("❌ Fix failed:", error);
    process.exit(1);
  } finally {
    await fixer.disconnect();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(`
📖 USAGE EXAMPLES:

# 1. Dry run on test car (see what would be changed)
npx tsx scripts/fix-processed-images-metadata.ts --dry-run

# 2. Fix test car processed images
npx tsx scripts/fix-processed-images-metadata.ts

# 3. Only add defaults (skip inheritance step)
npx tsx scripts/fix-processed-images-metadata.ts --only-defaults

# 4. Fix full collection (PRODUCTION)
npx tsx scripts/fix-processed-images-metadata.ts --full
  `);

  main().catch(console.error);
}

export { ProcessedImagesFixer };
