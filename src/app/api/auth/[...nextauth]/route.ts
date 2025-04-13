import { NextRequest, NextResponse } from "next/server";
import { handlers } from "@/auth";

export const dynamic = "force-dynamic";

// Ensure NEXTAUTH_URL is set correctly
function setNextAuthUrl(req: NextRequest) {
  if (!process.env.NEXTAUTH_URL && process.env.VERCEL_URL) {
    // For Vercel deployments
    process.env.NEXTAUTH_URL = `https://${process.env.VERCEL_URL}`;
  } else if (
    !process.env.NEXTAUTH_URL &&
    process.env.NODE_ENV === "development"
  ) {
    // For local development
    process.env.NEXTAUTH_URL = "http://localhost:3000";
  }
}

export async function GET(req: NextRequest) {
  setNextAuthUrl(req);
  return handlers.GET(req);
}

export async function POST(req: NextRequest) {
  setNextAuthUrl(req);
  return handlers.POST(req);
}
