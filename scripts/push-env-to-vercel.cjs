#!/usr/bin/env node

const fs = require("fs");
const { execSync } = require("child_process");
const path = require("path");
const readline = require("readline");

// Path to .env.local file
const envFilePath = path.resolve(process.cwd(), ".env.local");

// Function to parse .env file
function parseEnvFile(filePath) {
  try {
    const fileContent = fs.readFileSync(filePath, "utf8");
    const envVars = {};

    // Split by newlines and process each line
    fileContent.split("\n").forEach((line) => {
      // Skip empty lines and comments
      if (!line || line.startsWith("#")) return;

      // Split by first equals sign (to handle values that contain = signs)
      const equalSignIndex = line.indexOf("=");
      if (equalSignIndex !== -1) {
        const key = line.substring(0, equalSignIndex).trim();
        let value = line.substring(equalSignIndex + 1).trim();

        // Remove quotes if they exist
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.substring(1, value.length - 1);
        }

        envVars[key] = value;
      }
    });

    return envVars;
  } catch (error) {
    console.error(`Error reading .env file: ${error.message}`);
    process.exit(1);
  }
}

// Function to push environment variables to Vercel
function pushEnvToVercel(
  envVars,
  environment = "production",
  specificVar = null
) {
  if (specificVar) {
    // Push only specific variable
    if (!envVars[specificVar]) {
      console.error(`Variable ${specificVar} not found in .env.local`);
      process.exit(1);
    }

    try {
      // Create a temporary file to store the value
      const tempFilePath = path.resolve(
        process.cwd(),
        `.temp-env-${Date.now()}`
      );
      fs.writeFileSync(tempFilePath, envVars[specificVar]);

      console.log(`Adding ${specificVar} to ${environment}...`);
      execSync(
        `vercel env add ${specificVar} ${environment} < "${tempFilePath}"`,
        { stdio: "inherit" }
      );

      // Clean up temp file
      fs.unlinkSync(tempFilePath);
      console.log("Done!");
    } catch (error) {
      console.error(
        `Error adding environment variable ${specificVar}: ${error.message}`
      );
    }
    return;
  }

  console.log(
    `Pushing ${
      Object.keys(envVars).length
    } environment variables to Vercel (${environment})...`
  );

  // Loop through each environment variable
  Object.entries(envVars).forEach(([key, value]) => {
    try {
      // Create a temporary file to store the value
      const tempFilePath = path.resolve(
        process.cwd(),
        `.temp-env-${Date.now()}`
      );
      fs.writeFileSync(tempFilePath, value);

      // Push to Vercel using the file to avoid shell escaping issues
      console.log(`Adding ${key}...`);
      execSync(`vercel env add ${key} ${environment} < "${tempFilePath}"`, {
        stdio: "inherit",
      });

      // Clean up temp file
      fs.unlinkSync(tempFilePath);
    } catch (error) {
      console.error(
        `Error adding environment variable ${key}: ${error.message}`
      );
    }
  });

  console.log("Done!");
}

// Main function
async function main() {
  // Parse command line arguments
  const args = process.argv.slice(2);
  let environment = "production";
  let specificVar = null;

  // Handle arguments
  if (args.length >= 1) {
    if (args[0] === "--help" || args[0] === "-h") {
      console.log(`
Usage: node push-env-to-vercel.cjs [environment] [variable_name]

Arguments:
  environment    The Vercel environment to push to (production, preview, development)
  variable_name  Specific environment variable to push (optional)

Examples:
  node push-env-to-vercel.cjs production           # Push all variables to production
  node push-env-to-vercel.cjs preview              # Push all variables to preview
  node push-env-to-vercel.cjs production API_KEY   # Push only API_KEY to production
      `);
      process.exit(0);
    }

    environment = args[0];

    if (!["production", "preview", "development"].includes(environment)) {
      console.error(
        "Invalid environment. Must be one of: production, preview, development"
      );
      process.exit(1);
    }

    if (args.length >= 2) {
      specificVar = args[1];
    }
  }

  // Check if .env.local exists
  if (!fs.existsSync(envFilePath)) {
    console.error(".env.local file not found. Please create it first.");
    process.exit(1);
  }

  const envVars = parseEnvFile(envFilePath);

  if (specificVar) {
    // If specific variable is provided, push just that one
    pushEnvToVercel(envVars, environment, specificVar);
  } else {
    // Create readline interface for user confirmation
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question(
      `Are you sure you want to push ${
        Object.keys(envVars).length
      } variables to ${environment}? (y/n) `,
      (answer) => {
        if (answer.toLowerCase() === "y") {
          pushEnvToVercel(envVars, environment);
        } else {
          console.log("Operation cancelled.");
        }
        rl.close();
      }
    );
  }
}

main();
