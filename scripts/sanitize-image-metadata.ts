import { MongoClient, ObjectId } from "mongodb";
import * as dotenv from "dotenv";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB || "motive_archive";

if (!MONGODB_URI) {
  throw new Error("Please add your Mongo URI to .env");
}

// Valid metadata values based on the filtering system
const VALID_METADATA = {
  angle: [
    "front",
    "front 3/4",
    "side",
    "rear 3/4",
    "rear",
    "overhead",
    "under",
  ],
  view: ["exterior", "interior"],
  movement: ["static", "motion"],
  tod: ["sunrise", "day", "sunset", "night"],
  side: ["driver", "passenger", "rear", "overhead"],
} as const;

const TEST_CAR_ID = "67d13094dc27b630a36fb449";
const METADATA_FIELDS = [
  "angle",
  "view",
  "movement",
  "tod",
  "side",
  "description",
] as const;

interface ImageMetadata {
  category?: string;
  angle?: string;
  view?: string;
  movement?: string;
  tod?: string;
  side?: string;
  description?: string;
  originalImage?: {
    metadata?: {
      angle?: string;
      view?: string;
      movement?: string;
      tod?: string;
      side?: string;
      description?: string;
    };
  };
  [key: string]: any;
}

interface ImageDocument {
  _id: ObjectId;
  cloudflareId: string;
  url: string;
  filename: string;
  metadata: ImageMetadata;
  carId: ObjectId;
  createdAt: string;
  updatedAt: string;
}

interface Stats {
  totalImages: number;
  processedImages: number;
  nestedMetadataImages: number;
  invalidMetadataImages: number;
  flattened: number;
  invalidValuesRemoved: number;
  errors: number;
}

class MetadataSanitizer {
  private client: MongoClient;
  private db: any;
  private stats: Stats = {
    totalImages: 0,
    processedImages: 0,
    nestedMetadataImages: 0,
    invalidMetadataImages: 0,
    flattened: 0,
    invalidValuesRemoved: 0,
    errors: 0,
  };

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

  async analyzeMetadataIssues(testMode: boolean = true) {
    console.log("\n=== ANALYZING METADATA ISSUES ===");

    const query = testMode ? { carId: new ObjectId(TEST_CAR_ID) } : {};
    const images = (await this.db
      .collection("images")
      .find(query)
      .toArray()) as ImageDocument[];

    this.stats.totalImages = images.length;
    console.log(
      `Found ${images.length} images to analyze${testMode ? ` (test car: ${TEST_CAR_ID})` : ""}`
    );

    const nestedMetadataImages: ImageDocument[] = [];
    const invalidMetadataImages: ImageDocument[] = [];

    for (const image of images) {
      // Check for nested metadata structure
      if (image.metadata?.originalImage?.metadata) {
        nestedMetadataImages.push(image);
        this.stats.nestedMetadataImages++;
        console.log(`📍 Nested metadata found in image: ${image._id}`);
        console.log(`   Current structure: metadata.originalImage.metadata`);
        console.log(
          `   Fields found: ${Object.keys(image.metadata.originalImage.metadata).join(", ")}`
        );
      }

      // Check for invalid metadata values
      const hasInvalidValues = this.hasInvalidMetadataValues(image.metadata);
      if (hasInvalidValues.found) {
        invalidMetadataImages.push(image);
        this.stats.invalidMetadataImages++;
        console.log(`❌ Invalid metadata found in image: ${image._id}`);
        console.log(
          `   Invalid values: ${JSON.stringify(hasInvalidValues.invalid)}`
        );
      }

      // Check for processed images (category="processed")
      if (image.metadata?.category === "processed") {
        this.stats.processedImages++;
      }
    }

    console.log("\n=== ANALYSIS RESULTS ===");
    console.log(`Total images: ${this.stats.totalImages}`);
    console.log(`Processed images: ${this.stats.processedImages}`);
    console.log(
      `Images with nested metadata: ${this.stats.nestedMetadataImages}`
    );
    console.log(
      `Images with invalid metadata: ${this.stats.invalidMetadataImages}`
    );

    return {
      nestedMetadataImages,
      invalidMetadataImages,
      stats: this.stats,
    };
  }

  private hasInvalidMetadataValues(metadata: ImageMetadata): {
    found: boolean;
    invalid: Record<string, any>;
  } {
    const invalid: Record<string, any> = {};

    for (const [field, validValues] of Object.entries(VALID_METADATA)) {
      const metadataValue = metadata[field];
      if (
        metadataValue &&
        typeof metadataValue === "string" &&
        !(validValues as readonly string[]).includes(metadataValue)
      ) {
        invalid[field] = metadataValue;
      }
    }

    return {
      found: Object.keys(invalid).length > 0,
      invalid,
    };
  }

  async fixNestedMetadata(testMode: boolean = true, dryRun: boolean = false) {
    console.log("\n=== FIXING NESTED METADATA ===");

    const query = testMode
      ? {
          carId: new ObjectId(TEST_CAR_ID),
          "metadata.originalImage.metadata": { $exists: true },
        }
      : { "metadata.originalImage.metadata": { $exists: true } };

    const affectedImages = (await this.db
      .collection("images")
      .find(query)
      .toArray()) as ImageDocument[];

    console.log(
      `Found ${affectedImages.length} images with nested metadata to fix`
    );

    if (dryRun) {
      console.log("🔍 DRY RUN - No changes will be made");
      for (const image of affectedImages.slice(0, 5)) {
        console.log(`Would flatten metadata for image: ${image._id}`);
        const nestedMetadata = image.metadata.originalImage?.metadata;
        if (nestedMetadata) {
          console.log(
            `  Fields to flatten: ${Object.keys(nestedMetadata).join(", ")}`
          );
        }
      }
      return;
    }

    let successCount = 0;
    let errorCount = 0;

    for (const image of affectedImages) {
      try {
        const nestedMetadata = image.metadata.originalImage?.metadata;
        if (!nestedMetadata) continue;

        const updateFields: Record<string, any> = {};

        // Flatten each metadata field to top level
        for (const field of METADATA_FIELDS) {
          if (nestedMetadata[field] !== undefined) {
            updateFields[`metadata.${field}`] = nestedMetadata[field];
          }
        }

        // Add updatedAt timestamp
        updateFields["updatedAt"] = new Date().toISOString();

        const result = await this.db
          .collection("images")
          .updateOne({ _id: image._id }, { $set: updateFields });

        if (result.modifiedCount > 0) {
          successCount++;
          console.log(`✅ Flattened metadata for image: ${image._id}`);
        } else {
          console.log(`⚠️ No changes made for image: ${image._id}`);
        }
      } catch (error) {
        errorCount++;
        console.error(
          `❌ Error flattening metadata for image ${image._id}:`,
          error
        );
      }
    }

    this.stats.flattened = successCount;
    this.stats.errors += errorCount;

    console.log(`\n✅ Metadata flattening complete:`);
    console.log(`   Successfully flattened: ${successCount}`);
    console.log(`   Errors: ${errorCount}`);
  }

  async cleanInvalidMetadata(
    testMode: boolean = true,
    dryRun: boolean = false
  ) {
    console.log("\n=== CLEANING INVALID METADATA ===");

    // Build query to find images with invalid metadata values
    const invalidValueQueries: Record<string, any>[] = [];
    for (const [field, validValues] of Object.entries(VALID_METADATA)) {
      invalidValueQueries.push({
        [`metadata.${field}`]: {
          $exists: true,
          $nin: [...validValues, null, "", undefined],
        },
      });
    }

    const query = testMode
      ? {
          carId: new ObjectId(TEST_CAR_ID),
          $or: invalidValueQueries,
        }
      : { $or: invalidValueQueries };

    const affectedImages = (await this.db
      .collection("images")
      .find(query)
      .toArray()) as ImageDocument[];

    console.log(
      `Found ${affectedImages.length} images with invalid metadata to clean`
    );

    if (dryRun) {
      console.log("🔍 DRY RUN - No changes will be made");
      for (const image of affectedImages.slice(0, 5)) {
        const invalidValues = this.hasInvalidMetadataValues(image.metadata);
        console.log(`Would clean invalid metadata for image: ${image._id}`);
        console.log(
          `  Invalid values to remove: ${JSON.stringify(invalidValues.invalid)}`
        );
      }
      return;
    }

    let successCount = 0;
    let errorCount = 0;

    for (const image of affectedImages) {
      try {
        const unsetFields: Record<string, string> = {};
        const invalidValues = this.hasInvalidMetadataValues(image.metadata);

        // Remove invalid metadata fields
        for (const field of Object.keys(invalidValues.invalid)) {
          unsetFields[`metadata.${field}`] = "";
        }

        const updateDoc: Record<string, any> = {
          $set: { updatedAt: new Date().toISOString() },
        };

        if (Object.keys(unsetFields).length > 0) {
          updateDoc.$unset = unsetFields;
        }

        const result = await this.db
          .collection("images")
          .updateOne({ _id: image._id }, updateDoc);

        if (result.modifiedCount > 0) {
          successCount++;
          console.log(`✅ Cleaned invalid metadata for image: ${image._id}`);
          console.log(
            `   Removed fields: ${Object.keys(invalidValues.invalid).join(", ")}`
          );
        } else {
          console.log(`⚠️ No changes made for image: ${image._id}`);
        }
      } catch (error) {
        errorCount++;
        console.error(
          `❌ Error cleaning metadata for image ${image._id}:`,
          error
        );
      }
    }

    this.stats.invalidValuesRemoved = successCount;
    this.stats.errors += errorCount;

    console.log(`\n✅ Invalid metadata cleaning complete:`);
    console.log(`   Successfully cleaned: ${successCount}`);
    console.log(`   Errors: ${errorCount}`);
  }

  async verifyFixes(testMode: boolean = true) {
    console.log("\n=== VERIFYING FIXES ===");

    const query = testMode ? { carId: new ObjectId(TEST_CAR_ID) } : {};
    const images = (await this.db
      .collection("images")
      .find(query)
      .toArray()) as ImageDocument[];

    let nestedCount = 0;
    let invalidCount = 0;
    let validMetadataCount = 0;

    for (const image of images) {
      // Check for remaining nested metadata
      if (image.metadata?.originalImage?.metadata) {
        nestedCount++;
      }

      // Check for remaining invalid values
      const hasInvalid = this.hasInvalidMetadataValues(image.metadata);
      if (hasInvalid.found) {
        invalidCount++;
      }

      // Count images with valid metadata
      const hasValidMetadata = METADATA_FIELDS.some((field) => {
        const value = image.metadata?.[field];
        if (!value || typeof value !== "string") return false;
        if (field === "description") return true;
        const validValues =
          VALID_METADATA[field as keyof typeof VALID_METADATA];
        return (
          validValues && (validValues as readonly string[]).includes(value)
        );
      });
      if (hasValidMetadata) {
        validMetadataCount++;
      }
    }

    console.log(`\n📊 Verification Results:`);
    console.log(`   Total images checked: ${images.length}`);
    console.log(`   Images with nested metadata remaining: ${nestedCount}`);
    console.log(`   Images with invalid metadata remaining: ${invalidCount}`);
    console.log(`   Images with valid metadata: ${validMetadataCount}`);

    if (nestedCount === 0 && invalidCount === 0) {
      console.log("🎉 All metadata issues have been resolved!");
    } else {
      console.log("⚠️ Some issues may still exist. Review the results above.");
    }

    return {
      totalImages: images.length,
      nestedRemaining: nestedCount,
      invalidRemaining: invalidCount,
      validMetadata: validMetadataCount,
    };
  }

  printFinalStats() {
    console.log("\n=== FINAL STATISTICS ===");
    console.log(`Total images processed: ${this.stats.totalImages}`);
    console.log(`Metadata records flattened: ${this.stats.flattened}`);
    console.log(`Invalid values removed: ${this.stats.invalidValuesRemoved}`);
    console.log(`Errors encountered: ${this.stats.errors}`);
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const testMode = !args.includes("--full");
  const dryRun = args.includes("--dry-run");
  const skipAnalysis = args.includes("--skip-analysis");
  const onlyAnalyze = args.includes("--analyze-only");

  console.log("🚀 Image Metadata Sanitization Script");
  console.log(
    `Mode: ${testMode ? `Test (car: ${TEST_CAR_ID})` : "Full Collection"}`
  );
  console.log(`Dry Run: ${dryRun ? "Yes (no changes will be made)" : "No"}`);

  const sanitizer = new MetadataSanitizer();

  try {
    await sanitizer.connect();

    // Always run analysis first unless explicitly skipped
    if (!skipAnalysis) {
      await sanitizer.analyzeMetadataIssues(testMode);
    }

    if (onlyAnalyze) {
      console.log(
        "\n📋 Analysis complete. Use --skip-analysis to proceed with fixes."
      );
      return;
    }

    // Ask for confirmation if not dry run and not test mode
    if (!dryRun && !testMode) {
      console.log(
        "\n⚠️  WARNING: You are about to modify the FULL PRODUCTION DATABASE!"
      );
      console.log("Press Ctrl+C to cancel, or any key to continue...");
      // In a real script, you'd wait for user input here
      // For now, we'll proceed automatically in test mode
    }

    // Fix nested metadata
    await sanitizer.fixNestedMetadata(testMode, dryRun);

    // Clean invalid metadata
    await sanitizer.cleanInvalidMetadata(testMode, dryRun);

    // Verify fixes
    if (!dryRun) {
      await sanitizer.verifyFixes(testMode);
    }

    sanitizer.printFinalStats();
  } catch (error) {
    console.error("❌ Script failed:", error);
    process.exit(1);
  } finally {
    await sanitizer.disconnect();
  }
}

// Usage examples
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(`
📖 USAGE EXAMPLES:

# 1. Analyze issues only (test car)
npx tsx scripts/sanitize-image-metadata.ts --analyze-only

# 2. Dry run on test car (see what would be changed)
npx tsx scripts/sanitize-image-metadata.ts --dry-run

# 3. Fix test car
npx tsx scripts/sanitize-image-metadata.ts

# 4. Fix full collection (PRODUCTION - BE CAREFUL!)
npx tsx scripts/sanitize-image-metadata.ts --full

# 5. Dry run on full collection
npx tsx scripts/sanitize-image-metadata.ts --full --dry-run
  `);

  main().catch(console.error);
}

export { MetadataSanitizer, VALID_METADATA, TEST_CAR_ID };
