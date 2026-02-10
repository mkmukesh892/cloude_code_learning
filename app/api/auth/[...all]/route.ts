import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";
import { rateLimiters } from "@/lib/rate-limiter";
import { NextRequest } from "next/server";

const originalHandlers = toNextJsHandler(auth);

// Apply rate limiting to auth endpoints
export async function GET(request: NextRequest, context: any) {
  const rateLimitResponse = rateLimiters.auth(request);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }
  return originalHandlers.GET(request, context);
}

export async function POST(request: NextRequest, context: any) {
  const rateLimitResponse = rateLimiters.auth(request);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }
  return originalHandlers.POST(request, context);
}
