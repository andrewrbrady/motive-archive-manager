import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("🧪 Test API route called");
  return NextResponse.json({
    status: "working",
    timestamp: new Date().toISOString(),
    url: request.url,
  });
}
