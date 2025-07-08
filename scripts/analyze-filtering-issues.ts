import { MongoClient, ObjectId } from "mongodb";
import * as dotenv from "dotenv";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB || "motive_archive";
const TEST_CAR_ID = "67d13094dc27b630a36fb449";

if (!MONGODB_URI) {
  throw new Error("Please add your Mongo URI to .env");
}

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

interface MetadataAnalysis {
  totalImages: number;
  imagesWithMetadata: number;
  imagesWithoutMetadata: number;
  metadataFieldCoverage: Record<string, number>;
  nestedMetadataRemaining: number;
  filteringTestResults: Record<string, any>;
  sampleProblematicImages: any[];
}

class FilteringAnalyzer {
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

  async analyzeFilteringIssues(carId?: string): Promise<MetadataAnalysis> {
    console.log("\n🔍 ANALYZING FILTERING ISSUES");

    const query = carId ? { carId: new ObjectId(carId) } : {};
    const images = await this.db.collection("images").find(query).toArray();

    console.log(
      `Analyzing ${images.length} images${carId ? ` (car: ${carId})` : ""}`
    );

    const analysis: MetadataAnalysis = {
      totalImages: images.length,
      imagesWithMetadata: 0,
      imagesWithoutMetadata: 0,
      metadataFieldCoverage: {
        angle: 0,
        view: 0,
        movement: 0,
        tod: 0,
        side: 0,
        description: 0,
        category: 0,
      },
      nestedMetadataRemaining: 0,
      filteringTestResults: {},
      sampleProblematicImages: [],
    };

    const problematicImages: any[] = [];

    for (const image of images) {
      const { metadata } = image;

      // Check if image has any filterable metadata
      const hasFilterableMetadata = [
        "angle",
        "view",
        "movement",
        "tod",
        "side",
      ].some((field) => metadata?.[field]);

      if (hasFilterableMetadata) {
        analysis.imagesWithMetadata++;
      } else {
        analysis.imagesWithoutMetadata++;

        // Sample problematic images
        if (problematicImages.length < 10) {
          problematicImages.push({
            _id: image._id,
            filename: image.filename,
            metadata: metadata,
            hasNestedMetadata: !!metadata?.originalImage?.metadata,
          });
        }
      }

      // Count field coverage
      Object.keys(analysis.metadataFieldCoverage).forEach((field) => {
        if (metadata?.[field]) {
          analysis.metadataFieldCoverage[field]++;
        }
      });

      // Check for remaining nested metadata
      if (metadata?.originalImage?.metadata) {
        analysis.nestedMetadataRemaining++;
      }
    }

    analysis.sampleProblematicImages = problematicImages;

    // Test actual filtering queries
    analysis.filteringTestResults = await this.testFilteringQueries(carId);

    return analysis;
  }

  async testFilteringQueries(carId?: string) {
    console.log("\n🧪 TESTING FILTERING QUERIES");

    const baseQuery = carId ? { carId: new ObjectId(carId) } : {};
    const results: Record<string, any> = {};

    // Test each filter value
    for (const [field, values] of Object.entries(VALID_METADATA)) {
      results[field] = {};

      for (const value of values) {
        const query = { ...baseQuery, [`metadata.${field}`]: value };
        const count = await this.db.collection("images").countDocuments(query);
        results[field][value] = count;

        // Also test case-insensitive
        const caseInsensitiveQuery = {
          ...baseQuery,
          [`metadata.${field}`]: { $regex: new RegExp(`^${value}$`, "i") },
        };
        const caseInsensitiveCount = await this.db
          .collection("images")
          .countDocuments(caseInsensitiveQuery);

        if (caseInsensitiveCount !== count) {
          results[field][`${value}_case_insensitive`] = caseInsensitiveCount;
        }
      }
    }

    // Test nested metadata queries
    console.log("Testing nested metadata queries...");
    for (const [field, values] of Object.entries(VALID_METADATA)) {
      for (const value of values) {
        const nestedQuery = {
          ...baseQuery,
          [`metadata.originalImage.metadata.${field}`]: value,
        };
        const nestedCount = await this.db
          .collection("images")
          .countDocuments(nestedQuery);

        if (nestedCount > 0) {
          if (!results[`nested_${field}`]) results[`nested_${field}`] = {};
          results[`nested_${field}`][value] = nestedCount;
        }
      }
    }

    return results;
  }

  async findMissingMetadataPatterns(carId?: string) {
    console.log("\n🔍 ANALYZING MISSING METADATA PATTERNS");

    const query = carId ? { carId: new ObjectId(carId) } : {};

    // Find images without any metadata
    const noMetadataQuery = {
      ...query,
      $and: [
        { "metadata.angle": { $exists: false } },
        { "metadata.view": { $exists: false } },
        { "metadata.movement": { $exists: false } },
        { "metadata.tod": { $exists: false } },
        { "metadata.side": { $exists: false } },
      ],
    };

    const imagesWithoutMetadata = await this.db
      .collection("images")
      .find(noMetadataQuery)
      .limit(10)
      .toArray();

    console.log(
      `Found ${imagesWithoutMetadata.length} sample images without any filterable metadata`
    );

    // Analyze metadata patterns
    const metadataPatterns: Record<string, number> = {};

    const allImages = await this.db.collection("images").find(query).toArray();

    for (const image of allImages) {
      const pattern =
        Object.keys(VALID_METADATA)
          .filter((field) => image.metadata?.[field])
          .sort()
          .join(",") || "no_metadata";

      metadataPatterns[pattern] = (metadataPatterns[pattern] || 0) + 1;
    }

    console.log("\n📊 Metadata Patterns:");
    Object.entries(metadataPatterns)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 15)
      .forEach(([pattern, count]) => {
        console.log(`   ${pattern}: ${count} images`);
      });

    return { imagesWithoutMetadata, metadataPatterns };
  }

  async generateFixRecommendations(analysis: MetadataAnalysis) {
    console.log("\n💡 GENERATING FIX RECOMMENDATIONS");

    const recommendations: string[] = [];

    // Missing metadata
    if (analysis.imagesWithoutMetadata > 0) {
      const percentage = (
        (analysis.imagesWithoutMetadata / analysis.totalImages) *
        100
      ).toFixed(1);
      recommendations.push(
        `🎯 PRIORITY 1: ${analysis.imagesWithoutMetadata} images (${percentage}%) lack filterable metadata`
      );
    }

    // Nested metadata remaining
    if (analysis.nestedMetadataRemaining > 0) {
      recommendations.push(
        `🔧 PRIORITY 2: ${analysis.nestedMetadataRemaining} images still have nested metadata structure`
      );
    }

    // Case sensitivity issues
    const hasCaseIssues = Object.values(analysis.filteringTestResults).some(
      (fieldResults: any) =>
        Object.keys(fieldResults).some((key) =>
          key.includes("_case_insensitive")
        )
    );

    if (hasCaseIssues) {
      recommendations.push(
        `📝 PRIORITY 3: Case sensitivity issues detected in filtering`
      );
    }

    // Low coverage fields
    Object.entries(analysis.metadataFieldCoverage).forEach(([field, count]) => {
      const percentage = (count / analysis.totalImages) * 100;
      if (percentage < 50) {
        recommendations.push(
          `📊 LOW COVERAGE: '${field}' field only has ${percentage.toFixed(1)}% coverage (${count}/${analysis.totalImages})`
        );
      }
    });

    return recommendations;
  }

  printAnalysis(analysis: MetadataAnalysis, recommendations: string[]) {
    console.log("\n📊 FILTERING ANALYSIS RESULTS");
    console.log("=".repeat(50));

    console.log(`\n📈 Overall Coverage:`);
    console.log(`   Total images: ${analysis.totalImages}`);
    console.log(
      `   Images with filterable metadata: ${analysis.imagesWithMetadata}`
    );
    console.log(
      `   Images without filterable metadata: ${analysis.imagesWithoutMetadata}`
    );
    console.log(
      `   Nested metadata remaining: ${analysis.nestedMetadataRemaining}`
    );

    console.log(`\n📋 Field Coverage:`);
    Object.entries(analysis.metadataFieldCoverage).forEach(([field, count]) => {
      const percentage = ((count / analysis.totalImages) * 100).toFixed(1);
      console.log(
        `   ${field}: ${count}/${analysis.totalImages} (${percentage}%)`
      );
    });

    console.log(`\n🧪 Filter Query Results:`);
    Object.entries(analysis.filteringTestResults).forEach(
      ([field, results]) => {
        if (typeof results === "object" && Object.keys(results).length > 0) {
          console.log(`   ${field}:`);
          Object.entries(results).forEach(([value, count]) => {
            console.log(`      ${value}: ${count} images`);
          });
        }
      }
    );

    console.log(`\n🚨 Problematic Images (sample):`);
    analysis.sampleProblematicImages.slice(0, 5).forEach((img) => {
      console.log(`   ${img._id}: ${img.filename}`);
      console.log(`      Metadata: ${JSON.stringify(img.metadata, null, 2)}`);
      console.log(`      Has nested: ${img.hasNestedMetadata}`);
    });

    console.log(`\n💡 RECOMMENDATIONS:`);
    recommendations.forEach((rec) => console.log(`   ${rec}`));
  }
}

async function main() {
  const args = process.argv.slice(2);
  const testMode = !args.includes("--full");
  const carId = testMode ? TEST_CAR_ID : undefined;

  console.log("🔍 Filtering Issues Analysis");
  console.log(
    `Scope: ${testMode ? `Test car (${TEST_CAR_ID})` : "Full collection"}`
  );

  const analyzer = new FilteringAnalyzer();

  try {
    await analyzer.connect();

    // Main analysis
    const analysis = await analyzer.analyzeFilteringIssues(carId);

    // Missing metadata patterns
    await analyzer.findMissingMetadataPatterns(carId);

    // Generate recommendations
    const recommendations = await analyzer.generateFixRecommendations(analysis);

    // Print results
    analyzer.printAnalysis(analysis, recommendations);
  } catch (error) {
    console.error("❌ Analysis failed:", error);
    process.exit(1);
  } finally {
    await analyzer.disconnect();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(`
📖 USAGE EXAMPLES:

# 1. Analyze test car filtering issues
npx tsx scripts/analyze-filtering-issues.ts

# 2. Analyze full collection filtering issues  
npx tsx scripts/analyze-filtering-issues.ts --full
  `);

  main().catch(console.error);
}

export { FilteringAnalyzer };
