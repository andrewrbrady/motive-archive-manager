import { NextRequest } from "next/server";
import { handlers } from "@/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return handlers.GET(req);
}

export async function POST(req: NextRequest) {
  return handlers.POST(req);
}
