import fetch from "node-fetch";
import dotenv from "dotenv";
import { MongoClient } from "mongodb";
import chalk from "chalk";

dotenv.config();

// Test target URLs - both local and deployed
const TEST_ENVIRONMENTS = [
  {
    name: "Local",
    baseUrl: "http://localhost:3000",
    color: chalk.blue,
  },
  {
    name: "Vercel",
    baseUrl: "https://motive-archive-manager.vercel.app",
    color: chalk.green,
  },
];

// Testing which endpoints
const API_ENDPOINTS = [
  {
    name: "Hard Drives",
    path: "/api/hard-drives",
    collection: "hard_drives",
  },
  {
    name: "Raw Assets",
    path: "/api/raw",
    collection: "raw_assets",
  },
  {
    name: "Diagnostic",
    path: "/api/diagnostic",
  },
];

// Configuration options
let options = {
  testLocalMongo: true, // Direct test of MongoDB connection
  testApiEndpoints: true, // Test API endpoints
  verbose: true, // Show detailed output
  includeVercel: true, // Include Vercel environment in tests
};

// Parsing command line arguments
process.argv.slice(2).forEach((arg) => {
  if (arg === "--skip-mongo") options.testLocalMongo = false;
  if (arg === "--skip-api") options.testApiEndpoints = false;
  if (arg === "--quiet") options.verbose = false;
  if (arg === "--local-only") options.includeVercel = false;
});

async function runTests() {
  const results = {
    mongo: {},
    api: {},
  };

  console.log(chalk.bold.yellow("🔍 API ENDPOINT DIAGNOSTIC TOOL 🔍"));
  console.log(
    chalk.gray(
      "Helps diagnose issues with hard drives and raw assets endpoints"
    )
  );
  console.log(chalk.gray("=".repeat(60)));

  // First directly check MongoDB to verify collections exist
  if (options.testLocalMongo) {
    console.log(chalk.bold.cyan("\n📊 TESTING DIRECT MONGODB CONNECTION"));

    try {
      const client = new MongoClient(process.env.MONGODB_URI, {
        serverSelectionTimeoutMS: 5000,
      });

      await client.connect();
      console.log(chalk.green("✅ MongoDB connection successful"));

      const db = client.db(process.env.MONGODB_DB || "motive_archive");
      console.log(chalk.gray(`Database: ${db.databaseName}`));

      // Check collections
      for (const endpoint of API_ENDPOINTS) {
        if (!endpoint.collection) continue;

        const count = await db.collection(endpoint.collection).countDocuments();
        const result = {
          exists: true,
          count,
          sample:
            count > 0
              ? await db.collection(endpoint.collection).findOne({})
              : null,
        };

        results.mongo[endpoint.collection] = result;

        console.log(
          `${chalk.cyan(endpoint.name)} (${endpoint.collection}): ${
            count > 0
              ? chalk.green(`✅ ${count} documents`)
              : chalk.yellow("⚠️ Collection exists but empty")
          }`
        );

        if (result.sample && options.verbose) {
          console.log(
            chalk.gray(
              `  Sample document keys: ${Object.keys(result.sample).join(", ")}`
            )
          );
        }
      }

      await client.close();
    } catch (err) {
      console.error(chalk.red(`❌ MongoDB connection error: ${err.message}`));
      results.mongo.error = err.message;
    }
  }

  // Now test the API endpoints
  if (options.testApiEndpoints) {
    console.log(chalk.bold.cyan("\n🌐 TESTING API ENDPOINTS"));

    for (const env of TEST_ENVIRONMENTS) {
      // Skip Vercel if not requested
      if (env.name === "Vercel" && !options.includeVercel) continue;

      console.log(
        chalk.bold(`\n${env.color(env.name)} Environment: ${env.baseUrl}`)
      );
      results.api[env.name] = {};

      for (const endpoint of API_ENDPOINTS) {
        const url = `${env.baseUrl}${endpoint.path}`;
        console.log(chalk.gray(`Testing ${endpoint.name}: ${url}`));

        try {
          const startTime = Date.now();
          const response = await fetch(url, {
            headers: {
              Accept: "application/json",
            },
            timeout: 15000, // 15 second timeout
          });
          const duration = Date.now() - startTime;

          const contentType = response.headers.get("content-type");
          let responseData;

          if (contentType && contentType.includes("application/json")) {
            responseData = await response.json();
          } else {
            responseData = await response.text();
          }

          results.api[env.name][endpoint.path] = {
            status: response.status,
            duration,
            data: responseData,
          };

          if (response.ok) {
            console.log(
              `${env.color("✅")} ${endpoint.name}: ${
                response.status
              } (${duration}ms)`
            );

            // Check for expected result shape
            if (responseData && typeof responseData === "object") {
              // Extract important diagnostic information
              if (endpoint.path === "/api/diagnostic") {
                if (responseData.tests && responseData.tests.databaseInfo) {
                  const dbInfo = responseData.tests.databaseInfo;

                  if (dbInfo.status === "completed") {
                    console.log(chalk.gray(`  Database: ${dbInfo.dbName}`));
                    console.log(
                      chalk.gray(`  Collections: ${dbInfo.collections.total}`)
                    );

                    // Hard drives info
                    if (dbInfo.hardDrives) {
                      console.log(
                        `  Hard drives: ${
                          dbInfo.hardDrives.exists
                            ? chalk.green(
                                `✅ Found (${dbInfo.hardDrives.count} documents)`
                              )
                            : chalk.red("❌ Not found")
                        }`
                      );
                    }

                    // Raw assets info
                    if (dbInfo.rawAssets) {
                      console.log(
                        `  Raw assets: ${
                          dbInfo.rawAssets.exists
                            ? chalk.green(
                                `✅ Found (${dbInfo.rawAssets.count} documents)`
                              )
                            : chalk.red("❌ Not found")
                        }`
                      );
                    }
                  } else {
                    console.log(
                      chalk.yellow(
                        `  ⚠️ Database check status: ${dbInfo.status}`
                      )
                    );
                    if (dbInfo.message) {
                      console.log(chalk.yellow(`  Message: ${dbInfo.message}`));
                    }
                  }
                }
              } else {
                // For regular endpoints, show meta information
                if (responseData.meta) {
                  console.log(
                    chalk.gray(`  Total: ${responseData.meta.total}`)
                  );
                  console.log(
                    chalk.gray(
                      `  Page: ${responseData.meta.page} of ${responseData.meta.totalPages}`
                    )
                  );
                }

                // Show item count for data arrays
                if (Array.isArray(responseData.data)) {
                  console.log(
                    chalk.gray(`  Items returned: ${responseData.data.length}`)
                  );

                  // Show first item keys if we have data
                  if (responseData.data.length > 0 && options.verbose) {
                    console.log(
                      chalk.gray(
                        `  First item keys: ${Object.keys(
                          responseData.data[0]
                        ).join(", ")}`
                      )
                    );
                  }
                }

                // Check debug info
                if (responseData.debug) {
                  console.log(
                    chalk.gray(
                      `  Debug info: ${JSON.stringify(
                        responseData.debug,
                        null,
                        2
                      )}`
                    )
                  );
                }
              }
            }
          } else {
            console.log(
              `${chalk.red("❌")} ${endpoint.name}: ${
                response.status
              } (${duration}ms)`
            );

            // Show error details from response if available
            if (typeof responseData === "object" && responseData.error) {
              console.log(chalk.red(`  Error: ${responseData.error}`));
              if (responseData.message) {
                console.log(chalk.red(`  Message: ${responseData.message}`));
              }

              // Show any debug information
              if (responseData.debug) {
                console.log(
                  chalk.gray(
                    `  Debug: ${JSON.stringify(responseData.debug, null, 2)}`
                  )
                );
              }
            }
          }
        } catch (err) {
          console.log(`${chalk.red("❌")} ${endpoint.name}: Connection error`);
          console.log(chalk.red(`  ${err.message}`));

          results.api[env.name][endpoint.path] = {
            error: err.message,
          };
        }
      }
    }
  }

  // Output summary of findings
  console.log(chalk.bold.yellow("\n📋 SUMMARY OF FINDINGS"));
  console.log(chalk.gray("=".repeat(60)));

  if (options.testLocalMongo) {
    const mongoStatus = results.mongo.error
      ? chalk.red("❌ FAILED")
      : chalk.green("✅ SUCCESS");

    console.log(`MongoDB Direct Connection: ${mongoStatus}`);

    if (!results.mongo.error) {
      for (const [collection, data] of Object.entries(results.mongo)) {
        if (typeof data === "object" && !data.error) {
          console.log(
            `  ${collection}: ${
              data.count > 0
                ? chalk.green(`${data.count} documents`)
                : chalk.yellow("Empty")
            }`
          );
        }
      }
    }
  }

  if (options.testApiEndpoints) {
    for (const env of TEST_ENVIRONMENTS) {
      if (env.name === "Vercel" && !options.includeVercel) continue;
      if (!results.api[env.name]) continue;

      console.log(`\n${env.color(env.name)} API Endpoints:`);

      let anyEndpointFailed = false;

      for (const endpoint of API_ENDPOINTS) {
        const result = results.api[env.name][endpoint.path];

        if (!result) {
          console.log(`  ${endpoint.name}: ${chalk.gray("Not tested")}`);
          continue;
        }

        if (result.error) {
          console.log(
            `  ${endpoint.name}: ${chalk.red(
              `❌ Connection error: ${result.error}`
            )}`
          );
          anyEndpointFailed = true;
          continue;
        }

        const status =
          result.status >= 200 && result.status < 300
            ? chalk.green(`✅ ${result.status}`)
            : chalk.red(`❌ ${result.status}`);

        console.log(`  ${endpoint.name}: ${status} (${result.duration}ms)`);

        // Check for data
        if (result.data && typeof result.data === "object") {
          if (Array.isArray(result.data.data)) {
            console.log(
              `    Data items: ${
                result.data.data.length > 0
                  ? chalk.green(result.data.data.length)
                  : chalk.yellow("0")
              }`
            );
          } else if (result.data.meta && result.data.meta.total !== undefined) {
            console.log(
              `    Total items: ${
                result.data.meta.total > 0
                  ? chalk.green(result.data.meta.total)
                  : chalk.yellow("0")
              }`
            );
          }

          // Check for missing collections in diagnostic
          if (
            endpoint.path === "/api/diagnostic" &&
            result.data.tests &&
            result.data.tests.databaseInfo
          ) {
            const dbInfo = result.data.tests.databaseInfo;

            if (
              dbInfo.status === "completed" &&
              (!dbInfo.hardDrives?.exists || !dbInfo.rawAssets?.exists)
            ) {
              console.log(chalk.red("    ⚠️ Missing collections:"));
              if (!dbInfo.hardDrives?.exists) {
                console.log(
                  chalk.red("      - hard_drives collection not found")
                );
              }
              if (!dbInfo.rawAssets?.exists) {
                console.log(
                  chalk.red("      - raw_assets collection not found")
                );
              }
            }
          }
        }

        if (result.status >= 400) {
          anyEndpointFailed = true;
        }
      }

      if (anyEndpointFailed) {
        console.log(
          chalk.red(
            `  ⚠️ Some endpoints in ${env.name} environment returned errors`
          )
        );
      } else {
        console.log(
          chalk.green(`  ✅ All ${env.name} endpoints responded successfully`)
        );
      }
    }
  }

  console.log(chalk.gray("\n=".repeat(60)));

  // Final conclusion and next steps
  let hasIssues = false;

  // Check for MongoDB connection issues
  if (options.testLocalMongo && results.mongo.error) {
    console.log(
      chalk.red(
        "⚠️ Cannot connect to MongoDB directly. Check your connection string."
      )
    );
    hasIssues = true;
  }

  // Check for empty collections
  if (options.testLocalMongo && !results.mongo.error) {
    for (const [collection, data] of Object.entries(results.mongo)) {
      if (typeof data === "object" && data.count === 0) {
        console.log(
          chalk.yellow(`⚠️ Collection '${collection}' exists but is empty.`)
        );
        hasIssues = true;
      }
    }
  }

  // Check for API endpoint issues
  if (options.testApiEndpoints) {
    for (const env of TEST_ENVIRONMENTS) {
      if (env.name === "Vercel" && !options.includeVercel) continue;
      if (!results.api[env.name]) continue;

      for (const endpoint of API_ENDPOINTS) {
        const result = results.api[env.name][endpoint.path];

        if (
          result &&
          (result.error || (result.status && result.status >= 400))
        ) {
          console.log(
            chalk.red(
              `⚠️ ${endpoint.name} endpoint failed in ${env.name} environment.`
            )
          );
          hasIssues = true;
        }
      }
    }

    // Check for mismatch between environments
    if (options.includeVercel && results.api.Local && results.api.Vercel) {
      for (const endpoint of API_ENDPOINTS) {
        const localResult = results.api.Local[endpoint.path];
        const vercelResult = results.api.Vercel[endpoint.path];

        // Skip if either had connection errors
        if (
          !localResult ||
          localResult.error ||
          !vercelResult ||
          vercelResult.error
        )
          continue;

        // Check for major differences in response
        if (localResult.status !== vercelResult.status) {
          console.log(
            chalk.yellow(
              `⚠️ ${endpoint.name} status code differs: Local (${localResult.status}) vs Vercel (${vercelResult.status})`
            )
          );
          hasIssues = true;
        }

        // Compare data lengths for endpoints that return arrays
        if (
          localResult.data &&
          vercelResult.data &&
          localResult.data.data &&
          vercelResult.data.data &&
          Array.isArray(localResult.data.data) &&
          Array.isArray(vercelResult.data.data)
        ) {
          if (
            localResult.data.data.length > 0 &&
            vercelResult.data.data.length === 0
          ) {
            console.log(
              chalk.yellow(
                `⚠️ ${endpoint.name} returns ${localResult.data.data.length} items locally but 0 items on Vercel`
              )
            );
            hasIssues = true;
          }
        }
      }
    }
  }

  if (!hasIssues) {
    console.log(
      chalk.green(
        "✅ No major issues detected. If you are still experiencing problems, check:"
      )
    );
    console.log(chalk.gray("   - Authentication issues with MongoDB Atlas"));
    console.log(chalk.gray("   - IP access restrictions in MongoDB Atlas"));
    console.log(
      chalk.gray("   - Database name and collection case sensitivity")
    );
  } else {
    console.log(chalk.yellow("\nRecommended next steps:"));
    console.log(
      chalk.gray(
        "1. Check MongoDB connection string in Vercel environment variables"
      )
    );
    console.log(
      chalk.gray(
        "2. Verify IP access in MongoDB Atlas (allow access from anywhere for testing)"
      )
    );
    console.log(
      chalk.gray(
        "3. Confirm database name case sensitivity (motive_archive vs motive-archive)"
      )
    );
    console.log(
      chalk.gray(
        "4. Check collection names exactly match what your code is looking for"
      )
    );
    console.log(
      chalk.gray(
        "5. Review API logs on Vercel for additional error information"
      )
    );
  }
}

runTests().catch((err) => {
  console.error(chalk.red(`Unhandled error: ${err.message}`));
  console.error(err.stack);
  process.exit(1);
});
