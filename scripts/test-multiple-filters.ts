import { MongoClient, ObjectId } from "mongodb";
import * as dotenv from "dotenv";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB || "motive_archive";
const TEST_CAR_ID = "67d13094dc27b630a36fb449";

if (!MONGODB_URI) {
  throw new Error("Please add your Mongo URI to .env");
}

class MultipleFiltersTest {
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

  async testMultipleFilters() {
    console.log("\n🧪 TESTING MULTIPLE FILTER COMBINATIONS");

    const baseQuery = { carId: new ObjectId(TEST_CAR_ID) };

    // Test individual filters first
    console.log("\n📊 Individual Filter Tests:");

    const sideOnlyQuery = {
      ...baseQuery,
      $and: [
        {
          $or: [
            { "metadata.angle": "side" },
            { "metadata.originalImage.metadata.angle": "side" },
          ],
        },
      ],
    };
    const sideOnlyCount = await this.db
      .collection("images")
      .countDocuments(sideOnlyQuery);
    console.log(`   angle=side: ${sideOnlyCount} images`);

    const exteriorOnlyQuery = {
      ...baseQuery,
      $and: [
        {
          $or: [
            { "metadata.view": "exterior" },
            { "metadata.originalImage.metadata.view": "exterior" },
          ],
        },
      ],
    };
    const exteriorOnlyCount = await this.db
      .collection("images")
      .countDocuments(exteriorOnlyQuery);
    console.log(`   view=exterior: ${exteriorOnlyCount} images`);

    const staticOnlyQuery = {
      ...baseQuery,
      $and: [
        {
          $or: [
            { "metadata.movement": "static" },
            { "metadata.originalImage.metadata.movement": "static" },
          ],
        },
      ],
    };
    const staticOnlyCount = await this.db
      .collection("images")
      .countDocuments(staticOnlyQuery);
    console.log(`   movement=static: ${staticOnlyCount} images`);

    // Test multiple filter combinations
    console.log("\n🎯 Multiple Filter Combination Tests:");

    // Test: side + exterior
    const sideExteriorQuery = {
      ...baseQuery,
      $and: [
        {
          $or: [
            { "metadata.angle": "side" },
            { "metadata.originalImage.metadata.angle": "side" },
          ],
        },
        {
          $or: [
            { "metadata.view": "exterior" },
            { "metadata.originalImage.metadata.view": "exterior" },
          ],
        },
      ],
    };
    const sideExteriorCount = await this.db
      .collection("images")
      .countDocuments(sideExteriorQuery);
    console.log(`   angle=side AND view=exterior: ${sideExteriorCount} images`);

    // Test: side + exterior + static
    const sideExteriorStaticQuery = {
      ...baseQuery,
      $and: [
        {
          $or: [
            { "metadata.angle": "side" },
            { "metadata.originalImage.metadata.angle": "side" },
          ],
        },
        {
          $or: [
            { "metadata.view": "exterior" },
            { "metadata.originalImage.metadata.view": "exterior" },
          ],
        },
        {
          $or: [
            { "metadata.movement": "static" },
            { "metadata.originalImage.metadata.movement": "static" },
          ],
        },
      ],
    };
    const sideExteriorStaticCount = await this.db
      .collection("images")
      .countDocuments(sideExteriorStaticQuery);
    console.log(
      `   angle=side AND view=exterior AND movement=static: ${sideExteriorStaticCount} images`
    );

    // Test: front + interior (should be 0 or very few)
    const frontInteriorQuery = {
      ...baseQuery,
      $and: [
        {
          $or: [
            { "metadata.angle": "front" },
            { "metadata.originalImage.metadata.angle": "front" },
          ],
        },
        {
          $or: [
            { "metadata.view": "interior" },
            { "metadata.originalImage.metadata.view": "interior" },
          ],
        },
      ],
    };
    const frontInteriorCount = await this.db
      .collection("images")
      .countDocuments(frontInteriorQuery);
    console.log(
      `   angle=front AND view=interior: ${frontInteriorCount} images`
    );

    console.log("\n✅ Multiple Filter Logic Validation:");
    console.log(
      `   ✓ side (${sideOnlyCount}) + exterior (${exteriorOnlyCount}) = ${sideExteriorCount} (intersection)`
    );
    console.log(
      `   ✓ Multiple filter results should be <= individual filter results`
    );

    if (
      sideExteriorCount <= sideOnlyCount &&
      sideExteriorCount <= exteriorOnlyCount
    ) {
      console.log(
        `   ✅ Logic is correct: ${sideExteriorCount} ≤ ${Math.min(sideOnlyCount, exteriorOnlyCount)}`
      );
    } else {
      console.log(
        `   ❌ Logic is broken: intersection shouldn't exceed individual counts`
      );
    }

    if (sideExteriorStaticCount <= sideExteriorCount) {
      console.log(
        `   ✅ Adding more filters reduces results: ${sideExteriorStaticCount} ≤ ${sideExteriorCount}`
      );
    } else {
      console.log(
        `   ❌ Adding more filters should reduce results, not increase them`
      );
    }
  }

  async testQueryStructures() {
    console.log("\n🔍 QUERY STRUCTURE EXAMPLES");

    // Show what the actual queries look like
    const exampleQuery = {
      carId: new ObjectId(TEST_CAR_ID),
      $and: [
        {
          $or: [
            { "metadata.angle": "side" },
            { "metadata.originalImage.metadata.angle": "side" },
          ],
        },
        {
          $or: [
            { "metadata.view": "exterior" },
            { "metadata.originalImage.metadata.view": "exterior" },
          ],
        },
      ],
    };

    console.log("Example Query (angle=side AND view=exterior):");
    console.log(JSON.stringify(exampleQuery, null, 2));
  }
}

async function main() {
  console.log("🧪 Multiple Filter Test Suite");

  const tester = new MultipleFiltersTest();

  try {
    await tester.connect();
    await tester.testMultipleFilters();
    await tester.testQueryStructures();
  } catch (error) {
    console.error("❌ Test failed:", error);
    process.exit(1);
  } finally {
    await tester.disconnect();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { MultipleFiltersTest };
