#!/usr/bin/env tsx

import { MongoClient } from "mongodb";
import { config } from "dotenv";
import { performance } from "perf_hooks";

// Load environment variables
config();

interface ImageDocument {
  _id: string;
  url: string;
  filename?: string;
  metadata?: {
    [key: string]: any;
  };
  cloudflareId?: string;
  originalUrl?: string;
  migratedAt?: Date;
}

interface MigrationStats {
  total: number;
  processed: number;
  migrated: number;
  skipped: number;
  errors: number;
  startTime: number;
}

class CloudflareImageMigration {
  private client: MongoClient;
  private db: any;
  private dryRun: boolean;
  private batchSize: number;
  private stats: MigrationStats;

  constructor(dryRun = false, batchSize = 100) {
    this.dryRun = dryRun;
    this.batchSize = batchSize;
    this.stats = {
      total: 0,
      processed: 0,
      migrated: 0,
      skipped: 0,
      errors: 0,
      startTime: performance.now(),
    };

    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error("MONGODB_URI environment variable is required");
    }

    this.client = new MongoClient(mongoUri);
  }

  async connect() {
    await this.client.connect();
    this.db = this.client.db();
    console.log("✅ Connected to MongoDB");
  }

  async disconnect() {
    await this.client.close();
    console.log("✅ Disconnected from MongoDB");
  }

  private isCloudflareImageUrl(url: string): boolean {
    return (
      url.includes("imagedelivery.net") || url.includes("cloudflareimages.com")
    );
  }

  private extractCloudflareImageId(url: string): string | null {
    const patterns = [
      /imagedelivery\.net\/[^\/]+\/([^\/]+)/,
      /cloudflareimages\.com\/[^\/]+\/([^\/]+)/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        // Remove any variant suffix (e.g., /public, /thumbnail)
        const imageId = match[1].split("/")[0];
        return imageId;
      }
    }

    return null;
  }

  private shouldMigrateImage(image: ImageDocument): boolean {
    // Skip if already migrated
    if (image.cloudflareId || image.migratedAt) {
      return false;
    }

    // Skip if URL is already a Cloudflare Images URL
    if (this.isCloudflareImageUrl(image.url)) {
      return false;
    }

    // Skip if no valid URL
    if (!image.url || image.url.trim() === "") {
      return false;
    }

    return true;
  }

  private async migrateImageDocument(image: ImageDocument): Promise<boolean> {
    try {
      // Check if this is already a Cloudflare Images URL
      if (this.isCloudflareImageUrl(image.url)) {
        const cloudflareId = this.extractCloudflareImageId(image.url);
        if (cloudflareId) {
          // Update document to include cloudflareId for consistency
          if (!this.dryRun) {
            await this.db.collection("images").updateOne(
              { _id: image._id },
              {
                $set: {
                  cloudflareId,
                  migratedAt: new Date(),
                },
              }
            );
          }
          console.log(
            `  ✅ Updated Cloudflare ID for ${image.filename || image._id}`
          );
          return true;
        }
      }

      // For non-Cloudflare URLs, we would typically upload to Cloudflare Images here
      // For now, we'll just mark them as needing migration
      if (!this.dryRun) {
        await this.db.collection("images").updateOne(
          { _id: image._id },
          {
            $set: {
              originalUrl: image.url,
              needsCloudflareUpload: true,
              migratedAt: new Date(),
            },
          }
        );
      }

      console.log(`  📝 Marked for upload: ${image.filename || image._id}`);
      return true;
    } catch (error) {
      console.error(
        `  ❌ Error migrating ${image.filename || image._id}:`,
        error
      );
      return false;
    }
  }

  async migrateImages() {
    console.log(
      `🚀 Starting Cloudflare Images migration (${this.dryRun ? "DRY RUN" : "LIVE"})`
    );
    console.log(`📊 Batch size: ${this.batchSize}`);

    // Get total count
    this.stats.total = await this.db.collection("images").countDocuments();
    console.log(`📈 Total images to process: ${this.stats.total}`);

    if (this.stats.total === 0) {
      console.log("ℹ️  No images found to migrate");
      return;
    }

    // Process in batches
    let skip = 0;
    while (skip < this.stats.total) {
      console.log(
        `\n📦 Processing batch ${Math.floor(skip / this.batchSize) + 1}...`
      );

      const images = await this.db
        .collection("images")
        .find({})
        .skip(skip)
        .limit(this.batchSize)
        .toArray();

      for (const image of images) {
        this.stats.processed++;

        if (!this.shouldMigrateImage(image)) {
          this.stats.skipped++;
          console.log(
            `  ⏭️  Skipped: ${image.filename || image._id} (already migrated or invalid)`
          );
          continue;
        }

        const success = await this.migrateImageDocument(image);
        if (success) {
          this.stats.migrated++;
        } else {
          this.stats.errors++;
        }

        // Progress indicator
        if (this.stats.processed % 10 === 0) {
          const progress = (
            (this.stats.processed / this.stats.total) *
            100
          ).toFixed(1);
          console.log(
            `  📊 Progress: ${progress}% (${this.stats.processed}/${this.stats.total})`
          );
        }
      }

      skip += this.batchSize;
    }

    this.printSummary();
  }

  private printSummary() {
    const duration = (
      (performance.now() - this.stats.startTime) /
      1000
    ).toFixed(2);

    console.log("\n" + "=".repeat(50));
    console.log("📊 MIGRATION SUMMARY");
    console.log("=".repeat(50));
    console.log(`⏱️  Duration: ${duration}s`);
    console.log(`📈 Total images: ${this.stats.total}`);
    console.log(`✅ Processed: ${this.stats.processed}`);
    console.log(`🔄 Migrated: ${this.stats.migrated}`);
    console.log(`⏭️  Skipped: ${this.stats.skipped}`);
    console.log(`❌ Errors: ${this.stats.errors}`);

    if (this.dryRun) {
      console.log("\n🔍 This was a DRY RUN - no changes were made");
      console.log("💡 Run without --dry-run to apply changes");
    } else {
      console.log("\n✅ Migration completed successfully!");
    }
  }

  async rollback() {
    console.log("🔄 Starting rollback of Cloudflare Images migration...");

    const result = await this.db.collection("images").updateMany(
      { migratedAt: { $exists: true } },
      {
        $unset: {
          cloudflareId: "",
          migratedAt: "",
          needsCloudflareUpload: "",
        },
        $rename: {
          originalUrl: "url",
        },
      }
    );

    console.log(
      `✅ Rollback completed. Updated ${result.modifiedCount} documents.`
    );
  }
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const rollback = args.includes("--rollback");
  const batchSize = parseInt(
    args.find((arg) => arg.startsWith("--batch-size="))?.split("=")[1] || "100"
  );

  if (args.includes("--help")) {
    console.log(`
Cloudflare Images Migration Script

Usage:
  npm run migrate:cloudflare-images [options]

Options:
  --dry-run              Run without making changes (default: false)
  --rollback             Rollback previous migration
  --batch-size=N         Process N images at a time (default: 100)
  --help                 Show this help message

Examples:
  npm run migrate:cloudflare-images -- --dry-run
  npm run migrate:cloudflare-images -- --batch-size=50
  npm run migrate:cloudflare-images -- --rollback
    `);
    return;
  }

  const migration = new CloudflareImageMigration(dryRun, batchSize);

  try {
    await migration.connect();

    if (rollback) {
      await migration.rollback();
    } else {
      await migration.migrateImages();
    }
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  } finally {
    await migration.disconnect();
  }
}

// Run the migration
if (require.main === module) {
  main().catch(console.error);
}
