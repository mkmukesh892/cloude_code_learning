import { NextRequest, NextResponse } from "next/server";

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

// Simple in-memory store for rate limiting
// In production, consider using Redis or a database
const requestCounts = new Map<string, { count: number; resetTime: number }>();

function getClientIp(request: NextRequest): string {
  // Get IP from various headers (for proxies/load balancers)
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');

  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  if (realIp) {
    return realIp;
  }

  // Fallback to a default value for local development
  return 'unknown';
}

export function rateLimit(config: RateLimitConfig) {
  return (request: NextRequest): NextResponse | null => {
    const clientIp = getClientIp(request);
    const now = Date.now();
    const windowStart = now - config.windowMs;

    // Clean up old entries
    for (const [ip, data] of requestCounts.entries()) {
      if (data.resetTime < windowStart) {
        requestCounts.delete(ip);
      }
    }

    const clientData = requestCounts.get(clientIp);

    if (!clientData) {
      // First request from this IP
      requestCounts.set(clientIp, {
        count: 1,
        resetTime: now + config.windowMs
      });
      return null; // Allow request
    }

    if (clientData.resetTime < now) {
      // Window has expired, reset counter
      requestCounts.set(clientIp, {
        count: 1,
        resetTime: now + config.windowMs
      });
      return null; // Allow request
    }

    if (clientData.count >= config.maxRequests) {
      // Rate limit exceeded
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': config.maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': Math.ceil(clientData.resetTime / 1000).toString(),
          }
        }
      );
    }

    // Increment counter
    clientData.count++;

    return null; // Allow request
  };
}

// Predefined rate limiting configurations
export const rateLimiters = {
  // For authentication endpoints - stricter limits
  auth: rateLimit({ maxRequests: 20, windowMs: 15 * 60 * 1000 }), // 20 requests per 15 minutes

  // For regular API endpoints
  api: rateLimit({ maxRequests: 100, windowMs: 15 * 60 * 1000 }), // 100 requests per 15 minutes

  // For creation/update endpoints - manual saves only
  create: rateLimit({ maxRequests: 30, windowMs: 60 * 1000 }), // 30 requests per minute (manual saves)
};