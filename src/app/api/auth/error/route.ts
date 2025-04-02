import { NextResponse } from "next/server";
import { handlers } from "@/auth";

export const dynamic = "force-dynamic";

// Re-export the error handler from NextAuth.js
export const GET = handlers.GET;
