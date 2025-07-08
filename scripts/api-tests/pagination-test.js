// API Pagination Test
// Tests pagination consistency and functionality across all APIs
// Based on successful patterns from existing pagination implementations

const API_ENDPOINTS = [
  {
    name: "Projects",
    path: "/api/projects",
    hasPagination: true,
    hasTotal: true,
    defaultLimit: 20,
  },
  {
    name: "Cars List",
    path: "/api/cars/list",
    hasPagination: true,
    hasTotal: true,
    defaultLimit: 20,
  },
  {
    name: "Cars Main",
    path: "/api/cars",
    hasPagination: false,
    hasTotal: false,
    defaultLimit: null,
  },
  {
    name: "Events",
    path: "/api/events",
    hasPagination: false, // BUG: No pagination
    hasTotal: false,
    defaultLimit: null,
  },
  {
    name: "Deliverables",
    path: "/api/deliverables",
    hasPagination: true,
    hasTotal: true,
    defaultLimit: 20,
  },
];

const TEST_CONFIG = {
  baseUrl: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  timeoutMs: 10000,
  testToken: process.env.TEST_AUTH_TOKEN || "test-token",

  // Pagination test parameters
  testPages: [1, 2, 3],
  testLimits: [5, 10, 50],
  maxPageTest: 10, // Don't test beyond this page number
};

async function testAPIPagination() {
  console.log("📄 API PAGINATION TEST");
  console.log("=======================\n");

  let passedTests = 0;
  let failedTests = 0;
  let paginationIssues = [];

  console.log(
    `Testing ${API_ENDPOINTS.length} API endpoints for pagination...\n`
  );

  for (const endpoint of API_ENDPOINTS) {
    console.log(`🔍 Testing: ${endpoint.name} (${endpoint.path})`);
    console.log(
      `   Expected pagination: ${endpoint.hasPagination ? "YES" : "NO"}`
    );

    try {
      const testResult = await testEndpointPagination(endpoint);

      if (testResult.passed) {
        console.log(`   ✅ PASSED: ${testResult.message}`);
        passedTests++;
      } else {
        console.log(`   ❌ FAILED: ${testResult.message}`);
        failedTests++;

        if (testResult.issue) {
          paginationIssues.push({
            endpoint: endpoint.name,
            path: endpoint.path,
            issue: testResult.issue,
            details: testResult.details,
            priority: testResult.priority || "MEDIUM",
          });
        }
      }
    } catch (error) {
      console.log(`   💥 ERROR: ${error.message}`);
      failedTests++;

      paginationIssues.push({
        endpoint: endpoint.name,
        path: endpoint.path,
        issue: `Test execution failed: ${error.message}`,
        details: error.stack,
        priority: "HIGH",
      });
    }

    console.log(""); // Empty line for readability
  }

  // Summary Report
  console.log("📊 PAGINATION TEST SUMMARY");
  console.log("===========================");
  console.log(`✅ Passed: ${passedTests}`);
  console.log(`❌ Failed: ${failedTests}`);
  console.log(
    `📈 Success Rate: ${((passedTests / (passedTests + failedTests)) * 100).toFixed(1)}%`
  );

  // Issues Report
  if (paginationIssues.length > 0) {
    console.log("\n🚨 PAGINATION ISSUES DETECTED");
    console.log("==============================");

    const criticalIssues = paginationIssues.filter(
      (i) => i.priority === "CRITICAL"
    );
    const highIssues = paginationIssues.filter((i) => i.priority === "HIGH");
    const mediumIssues = paginationIssues.filter(
      (i) => i.priority === "MEDIUM"
    );

    if (criticalIssues.length > 0) {
      console.log("\n🔴 CRITICAL ISSUES:");
      for (const issue of criticalIssues) {
        console.log(`\n❌ ${issue.endpoint}:`);
        console.log(`   Issue: ${issue.issue}`);
        console.log(`   Path: ${issue.path}`);
        if (issue.details) console.log(`   Details: ${issue.details}`);
      }
    }

    if (highIssues.length > 0) {
      console.log("\n🟡 HIGH PRIORITY ISSUES:");
      for (const issue of highIssues) {
        console.log(`\n⚠️ ${issue.endpoint}:`);
        console.log(`   Issue: ${issue.issue}`);
        console.log(`   Path: ${issue.path}`);
        if (issue.details) console.log(`   Details: ${issue.details}`);
      }
    }

    if (mediumIssues.length > 0) {
      console.log("\n🟢 MEDIUM PRIORITY ISSUES:");
      for (const issue of mediumIssues) {
        console.log(`\n⚪ ${issue.endpoint}:`);
        console.log(`   Issue: ${issue.issue}`);
        if (issue.details) console.log(`   Details: ${issue.details}`);
      }
    }

    // Recommendations
    console.log("\n🔧 RECOMMENDED FIXES:");

    const noPaginationEndpoints = paginationIssues.filter(
      (i) =>
        i.issue.includes("No pagination") ||
        i.issue.includes("Missing pagination")
    );

    if (noPaginationEndpoints.length > 0) {
      console.log("\n1. Add pagination to these endpoints:");
      for (const issue of noPaginationEndpoints) {
        console.log(`   - ${issue.endpoint}: Implement page/limit parameters`);
      }
      console.log("   Reference: /src/app/api/projects/route.ts lines 333-345");
    }

    const inconsistentFormat = paginationIssues.filter(
      (i) => i.issue.includes("Inconsistent") || i.issue.includes("format")
    );

    if (inconsistentFormat.length > 0) {
      console.log("\n2. Standardize pagination response format:");
      for (const issue of inconsistentFormat) {
        console.log(`   - ${issue.endpoint}: ${issue.details}`);
      }
    }
  }

  // Best Practices Report
  console.log("\n📋 PAGINATION BEST PRACTICES ANALYSIS");
  console.log("=====================================");

  const workingEndpoints = API_ENDPOINTS.filter((e) => e.hasPagination);
  const brokenEndpoints = API_ENDPOINTS.filter((e) => !e.hasPagination);

  console.log(`✅ Endpoints with pagination: ${workingEndpoints.length}`);
  console.log(`❌ Endpoints without pagination: ${brokenEndpoints.length}`);

  if (brokenEndpoints.length > 0) {
    console.log("\n⚠️ Missing pagination (scalability risk):");
    for (const endpoint of brokenEndpoints) {
      console.log(`   - ${endpoint.name}: ${endpoint.path}`);
    }
  }

  // Final result
  const criticalIssuesCount = paginationIssues.filter(
    (i) => i.priority === "CRITICAL"
  ).length;
  if (failedTests === 0 && criticalIssuesCount === 0) {
    console.log("\n🎉 PAGINATION TESTS PASSED");
    return true;
  } else {
    console.log("\n❌ PAGINATION TESTS FAILED");
    console.log(`Critical issues: ${criticalIssuesCount}`);
    console.log(`Total failures: ${failedTests}`);
    return false;
  }
}

async function testEndpointPagination(endpoint) {
  const results = {
    passed: false,
    message: "",
    issue: null,
    details: null,
    priority: "MEDIUM",
  };

  if (!endpoint.hasPagination) {
    // Test if endpoint that should have pagination actually supports it
    const testUrl = `${endpoint.path}?page=1&limit=5`;
    const response = await makeAPIRequest(testUrl);

    if (response.status >= 400) {
      results.issue = "No pagination support";
      results.details = "Returns error when pagination parameters provided";
      results.priority = "HIGH";
      results.message = "Missing pagination implementation";
      return results;
    }

    // Check if response looks like it has too much data (indication pagination needed)
    if (response.data && Array.isArray(response.data)) {
      if (response.data.length > 50) {
        results.issue = "Missing pagination - large dataset";
        results.details = `Returns ${response.data.length} items without pagination`;
        results.priority = "CRITICAL";
        results.message =
          "Scalability risk: large data returned without pagination";
        return results;
      }
    }

    results.passed = true;
    results.message =
      "No pagination expected and none implemented (acceptable for small datasets)";
    return results;
  }

  // Test pagination functionality for endpoints that should have it
  const paginationTests = await runPaginationTests(endpoint);

  if (paginationTests.allPassed) {
    results.passed = true;
    results.message = "All pagination tests passed";
  } else {
    results.passed = false;
    results.issue = paginationTests.issues.join("; ");
    results.details = paginationTests.details;
    results.priority = paginationTests.priority;
    results.message = `Pagination issues: ${paginationTests.issues[0]}`;
  }

  return results;
}

async function runPaginationTests(endpoint) {
  const issues = [];
  const details = [];
  let priority = "MEDIUM";

  try {
    // Test 1: Basic pagination parameters
    console.log("      → Testing basic pagination (page=1, limit=5)");
    const basicTest = await makeAPIRequest(`${endpoint.path}?page=1&limit=5`);

    if (basicTest.status !== 200) {
      issues.push("Basic pagination returns error");
      details.push(`Status: ${basicTest.status}`);
      priority = "HIGH";
    } else {
      // Check response structure
      const data = basicTest.data;

      if (!data) {
        issues.push("No data in response");
        priority = "HIGH";
      } else {
        // Check for pagination metadata
        const hasTotal = "total" in data || "totalCount" in data;
        const hasPage = "page" in data || "currentPage" in data;
        const hasLimit = "limit" in data || "pageSize" in data;

        if (!hasTotal && endpoint.hasTotal) {
          issues.push("Missing total count in response");
          details.push("Pagination metadata incomplete");
        }

        if (!hasPage) {
          issues.push("Missing current page in response");
        }

        if (!hasLimit) {
          issues.push("Missing limit/pageSize in response");
        }

        // Check data array
        const dataArray = data.data || data.items || data.results || data;
        if (Array.isArray(dataArray)) {
          if (dataArray.length > 5) {
            issues.push("Limit parameter not respected");
            details.push(`Expected max 5 items, got ${dataArray.length}`);
            priority = "HIGH";
          }
        } else {
          issues.push("Response data is not an array");
          priority = "HIGH";
        }
      }
    }

    // Test 2: Page navigation
    if (issues.length === 0) {
      console.log("      → Testing page navigation (page=2)");
      const page2Test = await makeAPIRequest(`${endpoint.path}?page=2&limit=5`);

      if (page2Test.status === 200) {
        const page1Data = basicTest.data;
        const page2Data = page2Test.data;

        // Simple check: page 2 should have different data than page 1
        const page1Array =
          page1Data.data || page1Data.items || page1Data.results || page1Data;
        const page2Array =
          page2Data.data || page2Data.items || page2Data.results || page2Data;

        if (Array.isArray(page1Array) && Array.isArray(page2Array)) {
          if (page1Array.length > 0 && page2Array.length > 0) {
            // Check if first items are different (simple pagination test)
            const page1FirstId = page1Array[0]._id || page1Array[0].id;
            const page2FirstId = page2Array[0]._id || page2Array[0].id;

            if (page1FirstId === page2FirstId) {
              issues.push("Page navigation not working");
              details.push("Page 1 and Page 2 return identical first items");
              priority = "HIGH";
            }
          }
        }
      }
    }

    // Test 3: Limit variations
    if (issues.length === 0) {
      console.log("      → Testing limit variations (limit=10)");
      const limitTest = await makeAPIRequest(
        `${endpoint.path}?page=1&limit=10`
      );

      if (limitTest.status === 200) {
        const limitData = limitTest.data;
        const limitArray =
          limitData.data || limitData.items || limitData.results || limitData;

        if (Array.isArray(limitArray) && limitArray.length > 5) {
          // Good - limit=10 returned more items than limit=5
        } else if (Array.isArray(limitArray) && limitArray.length <= 5) {
          // Could be valid if there aren't enough items, but worth noting
          details.push("Limit test inconclusive - may not have enough data");
        }
      }
    }
  } catch (error) {
    issues.push(`Test execution failed: ${error.message}`);
    priority = "HIGH";
  }

  return {
    allPassed: issues.length === 0,
    issues,
    details: details.join("; "),
    priority,
  };
}

async function makeAPIRequest(path, method = "GET") {
  const url = `${TEST_CONFIG.baseUrl}${path}`;

  const headers = {
    "Content-Type": "application/json",
  };

  // Add auth if available (some endpoints require it)
  if (TEST_CONFIG.testToken && TEST_CONFIG.testToken !== "test-token") {
    headers["Authorization"] = `Bearer ${TEST_CONFIG.testToken}`;
  }

  try {
    const response = await fetch(url, {
      method,
      headers,
      signal: AbortSignal.timeout(TEST_CONFIG.timeoutMs),
    });

    let data = null;
    try {
      data = await response.json();
    } catch (e) {
      // Response might not be JSON
    }

    return {
      status: response.status,
      ok: response.ok,
      url: response.url,
      data,
    };
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error(`Request timeout after ${TEST_CONFIG.timeoutMs}ms`);
    }
    throw error;
  }
}

// Main test runner
async function runPaginationTests() {
  try {
    const success = await testAPIPagination();
    process.exit(success ? 0 : 1);
  } catch (error) {
    console.error("💥 Pagination test runner failed:", error);
    process.exit(1);
  }
}

// Export for use in other test files
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    testAPIPagination,
    testEndpointPagination,
    runPaginationTests,
    makeAPIRequest,
  };
}

// Run if called directly
if (typeof require !== "undefined" && require.main === module) {
  runPaginationTests();
}
