#!/usr/bin/env tsx

/**
 * OAuth Configuration Validation Script
 *
 * This script validates the OAuth configuration and environment variables
 * to help troubleshoot authentication issues.
 */

import { config } from "dotenv";

// Load environment variables
config();

interface ValidationResult {
  valid: boolean;
  message: string;
  value?: string;
}

interface ConfigCheck {
  name: string;
  required: boolean;
  validator?: (value: string) => boolean;
  description: string;
}

const CONFIG_CHECKS: ConfigCheck[] = [
  {
    name: "NEXTAUTH_URL",
    required: true,
    validator: (value) => value.startsWith("http"),
    description: "Base URL for NextAuth.js callbacks",
  },
  {
    name: "NEXTAUTH_SECRET",
    required: false, // Can use AUTH_SECRET instead
    validator: (value) => value.length >= 32,
    description: "Secret for NextAuth.js JWT signing",
  },
  {
    name: "AUTH_SECRET",
    required: false, // Alternative to NEXTAUTH_SECRET
    validator: (value) => value.length >= 32,
    description: "Secret for NextAuth.js JWT signing (v5)",
  },
  {
    name: "GOOGLE_CLIENT_ID",
    required: true,
    validator: (value) => value.includes(".googleusercontent.com"),
    description: "Google OAuth Client ID",
  },
  {
    name: "GOOGLE_CLIENT_SECRET",
    required: true,
    validator: (value) => value.length > 20,
    description: "Google OAuth Client Secret",
  },
  {
    name: "FIREBASE_CLIENT_EMAIL",
    required: true,
    validator: (value) =>
      value.includes("@") && value.includes(".iam.gserviceaccount.com"),
    description: "Firebase service account email",
  },
  {
    name: "FIREBASE_PRIVATE_KEY",
    required: true,
    validator: (value) => value.includes("BEGIN PRIVATE KEY"),
    description: "Firebase service account private key",
  },
  {
    name: "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
    required: true,
    validator: (value) => value.length > 0,
    description: "Firebase project ID",
  },
  {
    name: "VERCEL_URL",
    required: false,
    description: "Vercel deployment URL (auto-set by Vercel)",
  },
  {
    name: "NODE_ENV",
    required: false,
    description: "Node environment",
  },
];

function validateConfig(check: ConfigCheck): ValidationResult {
  const value = process.env[check.name];

  if (!value) {
    if (check.required) {
      return {
        valid: false,
        message: `❌ Missing required environment variable: ${check.name}`,
      };
    } else {
      return {
        valid: true,
        message: `⚠️  Optional environment variable not set: ${check.name}`,
      };
    }
  }

  if (check.validator && !check.validator(value)) {
    return {
      valid: false,
      message: `❌ Invalid format for ${check.name}`,
      value: value.substring(0, 20) + "...",
    };
  }

  return {
    valid: true,
    message: `✅ ${check.name} is properly configured`,
    value:
      check.name.includes("SECRET") || check.name.includes("KEY")
        ? "[HIDDEN]"
        : value.substring(0, 50) + (value.length > 50 ? "..." : ""),
  };
}

function generateOAuthCallbackUrl(): string {
  const baseUrl =
    process.env.NEXTAUTH_URL ||
    (process.env.NODE_ENV === "development"
      ? "http://localhost:3000"
      : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "UNKNOWN");

  return `${baseUrl}/api/auth/callback/google`;
}

function main() {
  try {
    if (process.env.NODE_ENV !== "production") {
      console.log("Validating OAuth configuration...");
    }

    // Check required environment variables
    const requiredVars = [
      "GOOGLE_CLIENT_ID",
      "GOOGLE_CLIENT_SECRET",
      "NEXTAUTH_SECRET",
      "NEXTAUTH_URL",
    ];

    const missingVars = requiredVars.filter((varName) => !process.env[varName]);

    if (missingVars.length > 0) {
      console.error("Missing required environment variables:");
      missingVars.forEach((varName) => {
        console.error(`  - ${varName}`);
      });
      process.exit(1);
    }

    if (process.env.NODE_ENV !== "production") {
      console.log("✅ All required environment variables are present");
      console.log("OAuth configuration validation completed successfully");
    }

    // Validate Google OAuth configuration format
    const googleClientId = process.env.GOOGLE_CLIENT_ID;
    const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!googleClientId?.endsWith(".googleusercontent.com")) {
      console.error("❌ GOOGLE_CLIENT_ID format appears invalid");
      process.exit(1);
    }

    if (googleClientSecret && googleClientSecret.length < 20) {
      console.error("❌ GOOGLE_CLIENT_SECRET appears too short");
      process.exit(1);
    }

    if (process.env.NODE_ENV !== "production") {
      console.log("✅ Google OAuth configuration format validation passed");
    }

    // Validate NextAuth configuration
    const nextAuthSecret = process.env.NEXTAUTH_SECRET;
    const nextAuthUrl = process.env.NEXTAUTH_URL;

    if (nextAuthSecret && nextAuthSecret.length < 32) {
      console.error("❌ NEXTAUTH_SECRET should be at least 32 characters long");
      process.exit(1);
    }

    if (nextAuthUrl && !nextAuthUrl.startsWith("http")) {
      console.error("❌ NEXTAUTH_URL should start with http:// or https://");
      process.exit(1);
    }

    if (process.env.NODE_ENV !== "production") {
      console.log("✅ NextAuth configuration validation passed");
      console.log(
        "🎉 All OAuth configuration validations completed successfully!"
      );
    }
  } catch (error) {
    console.error("Error validating OAuth configuration:", error);
    process.exit(1);
  }
}

// Run the validation
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { validateConfig, generateOAuthCallbackUrl };
