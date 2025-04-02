import { NextResponse } from "next/server";
import { handlers } from "@/auth";

export const dynamic = "force-dynamic";

// Re-export the providers handler from NextAuth.js
export const GET = handlers.GET;
