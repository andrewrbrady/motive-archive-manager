import { MongoClient, ObjectId } from "mongodb";
import * as fs from "fs";
import * as path from "path";
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

class ImageCollectionBackup {
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

  async createBackup(testMode: boolean = true) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const scope = testMode ? `test-car-${TEST_CAR_ID}` : "full-collection";
    const backupDir = path.join(process.cwd(), "temp", "backups");
    const backupFile = path.join(
      backupDir,
      `images-backup-${scope}-${timestamp}.json`
    );

    // Ensure backup directory exists
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    console.log(`\n🔄 Creating backup...`);
    console.log(
      `Scope: ${testMode ? `Test car (${TEST_CAR_ID})` : "Full collection"}`
    );
    console.log(`File: ${backupFile}`);

    try {
      const query = testMode ? { carId: new ObjectId(TEST_CAR_ID) } : {};
      const images = (await this.db
        .collection("images")
        .find(query)
        .toArray()) as ImageDocument[];

      console.log(`Found ${images.length} images to backup`);

      // Convert ObjectIds to strings for JSON serialization
      const serializedImages = images.map((image: ImageDocument) => ({
        ...image,
        _id: image._id.toString(),
        carId: image.carId ? image.carId.toString() : null,
      }));

      const backupData = {
        timestamp: new Date().toISOString(),
        scope: testMode ? "test-car" : "full-collection",
        testCarId: testMode ? TEST_CAR_ID : null,
        totalImages: images.length,
        images: serializedImages,
      };

      fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));

      console.log(`✅ Backup created successfully`);
      console.log(`   File: ${backupFile}`);
      console.log(
        `   Size: ${(fs.statSync(backupFile).size / 1024 / 1024).toFixed(2)} MB`
      );

      return backupFile;
    } catch (error) {
      console.error("❌ Backup failed:", error);
      throw error;
    }
  }

  async restoreFromBackup(backupFile: string, confirmRestore: boolean = false) {
    if (!fs.existsSync(backupFile)) {
      throw new Error(`Backup file not found: ${backupFile}`);
    }

    console.log(`\n🔄 Reading backup file: ${backupFile}`);

    const backupData = JSON.parse(fs.readFileSync(backupFile, "utf8"));
    const { scope, totalImages, images } = backupData;

    console.log(`Backup info:`);
    console.log(`   Created: ${backupData.timestamp}`);
    console.log(`   Scope: ${scope}`);
    console.log(`   Images: ${totalImages}`);

    if (!confirmRestore) {
      console.log(`\n⚠️  This would restore ${totalImages} images from backup`);
      console.log(`   Add --confirm-restore flag to proceed`);
      return;
    }

    console.log(`\n🔄 Restoring ${totalImages} images...`);

    try {
      // Convert string IDs back to ObjectIds
      const restoredImages = images.map((image: any) => ({
        ...image,
        _id: new ObjectId(image._id),
        carId: image.carId ? new ObjectId(image.carId) : null,
      }));

      // Delete existing images (be very careful here!)
      const query =
        scope === "test-car"
          ? { carId: new ObjectId(backupData.testCarId) }
          : {};
      const deleteResult = await this.db.collection("images").deleteMany(query);
      console.log(`   Deleted ${deleteResult.deletedCount} existing images`);

      // Insert restored images
      if (restoredImages.length > 0) {
        const insertResult = await this.db
          .collection("images")
          .insertMany(restoredImages);
        console.log(`   Restored ${insertResult.insertedCount} images`);
      }

      console.log(`✅ Restore completed successfully`);
    } catch (error) {
      console.error("❌ Restore failed:", error);
      throw error;
    }
  }

  async listBackups() {
    const backupDir = path.join(process.cwd(), "temp", "backups");

    if (!fs.existsSync(backupDir)) {
      console.log("No backup directory found");
      return [];
    }

    const files = fs
      .readdirSync(backupDir)
      .filter(
        (file) => file.startsWith("images-backup-") && file.endsWith(".json")
      )
      .map((file) => {
        const filePath = path.join(backupDir, file);
        const stats = fs.statSync(filePath);
        return {
          file,
          path: filePath,
          size: (stats.size / 1024 / 1024).toFixed(2) + " MB",
          created: stats.birthtime.toISOString(),
        };
      })
      .sort(
        (a, b) => new Date(b.created).getTime() - new Date(a.created).getTime()
      );

    console.log(`\n📋 Available backups (${files.length}):`);
    files.forEach((backup, index) => {
      console.log(`   ${index + 1}. ${backup.file}`);
      console.log(`      Size: ${backup.size}, Created: ${backup.created}`);
    });

    return files;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const testMode = !args.includes("--full");
  const restoreMode = args.includes("--restore");
  const listMode = args.includes("--list");
  const confirmRestore = args.includes("--confirm-restore");
  const backupFile = args
    .find((arg) => arg.startsWith("--file="))
    ?.split("=")[1];

  const backup = new ImageCollectionBackup();

  try {
    await backup.connect();

    if (listMode) {
      await backup.listBackups();
      return;
    }

    if (restoreMode) {
      if (!backupFile) {
        console.error(
          "❌ Please specify backup file with --file=path/to/backup.json"
        );
        process.exit(1);
      }
      await backup.restoreFromBackup(backupFile, confirmRestore);
      return;
    }

    // Default: create backup
    await backup.createBackup(testMode);
  } catch (error) {
    console.error("❌ Operation failed:", error);
    process.exit(1);
  } finally {
    await backup.disconnect();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(`
📖 USAGE EXAMPLES:

# 1. Create backup of test car images
npx tsx scripts/backup-images-collection.ts

# 2. Create backup of full collection
npx tsx scripts/backup-images-collection.ts --full

# 3. List available backups
npx tsx scripts/backup-images-collection.ts --list

# 4. Restore from backup (dry run)
npx tsx scripts/backup-images-collection.ts --restore --file=temp/backups/backup-file.json

# 5. Restore from backup (actual restore)
npx tsx scripts/backup-images-collection.ts --restore --file=temp/backups/backup-file.json --confirm-restore
  `);

  main().catch(console.error);
}

export { ImageCollectionBackup };
