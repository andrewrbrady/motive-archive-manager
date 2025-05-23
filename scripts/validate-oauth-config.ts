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
  console.log("🔍 OAuth Configuration Validation\n");
  console.log("=".repeat(50));

  let hasErrors = false;
  let hasWarnings = false;

  // Check each configuration item
  for (const check of CONFIG_CHECKS) {
    const result = validateConfig(check);
    console.log(`${result.message}`);

    if (result.value) {
      console.log(`   Value: ${result.value}`);
    }

    console.log(`   Description: ${check.description}\n`);

    if (!result.valid) {
      hasErrors = true;
    } else if (result.message.includes("⚠️")) {
      hasWarnings = true;
    }
  }

  // Special validation for auth secrets
  const hasNextAuthSecret = !!process.env.NEXTAUTH_SECRET;
  const hasAuthSecret = !!process.env.AUTH_SECRET;

  if (!hasNextAuthSecret && !hasAuthSecret) {
    console.log(
      "❌ Missing authentication secret: Set either NEXTAUTH_SECRET or AUTH_SECRET"
    );
    hasErrors = true;
  }

  console.log("=".repeat(50));
  console.log("📋 Configuration Summary\n");

  // Environment info
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`Vercel Environment: ${process.env.VERCEL_ENV || "N/A"}`);
  console.log(`Base URL: ${process.env.NEXTAUTH_URL || "Not set"}`);
  console.log(`OAuth Callback URL: ${generateOAuthCallbackUrl()}\n`);

  // Google OAuth Console Instructions
  console.log("🔧 Google OAuth Console Setup:");
  console.log("1. Go to https://console.cloud.google.com/");
  console.log("2. Navigate to APIs & Services > Credentials");
  console.log("3. Add this redirect URI to your OAuth 2.0 Client:");
  console.log(`   ${generateOAuthCallbackUrl()}\n`);

  // Results
  if (hasErrors) {
    console.log("❌ Configuration has errors that must be fixed");
    process.exit(1);
  } else if (hasWarnings) {
    console.log("⚠️  Configuration has warnings but should work");
    process.exit(0);
  } else {
    console.log("✅ Configuration looks good!");
    process.exit(0);
  }
}

// Run the validation
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { validateConfig, generateOAuthCallbackUrl };
