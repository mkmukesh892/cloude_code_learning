import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { rateLimit, rateLimiters } from '../rate-limiter'

// Mock NextRequest
function createMockRequest(headers: Record<string, string> = {}): NextRequest {
  const mockRequest = {
    headers: new Map(Object.entries(headers))
  } as unknown as NextRequest

  // Mock the get method
  mockRequest.headers.get = vi.fn((name: string) => {
    return headers[name] || null
  })

  return mockRequest
}

describe('Rate Limiter - IP Extraction', () => {
  it('extracts IP from x-forwarded-for header', () => {
    const limiter = rateLimit({ maxRequests: 5, windowMs: 60000 })
    const request = createMockRequest({
      'x-forwarded-for': '192.168.1.1, 10.0.0.1'
    })

    // Should use first IP from forwarded header
    const result = limiter(request)
    expect(result).toBeNull() // First request allowed
  })

  it('extracts IP from x-real-ip when no forwarded header', () => {
    const limiter = rateLimit({ maxRequests: 5, windowMs: 60000 })
    const request = createMockRequest({
      'x-real-ip': '203.0.113.1'
    })

    const result = limiter(request)
    expect(result).toBeNull() // First request allowed
  })

  it('uses fallback IP when no headers present', () => {
    const limiter = rateLimit({ maxRequests: 5, windowMs: 60000 })
    const request = createMockRequest({})

    const result = limiter(request)
    expect(result).toBeNull() // First request allowed
  })

  it('prefers x-forwarded-for over x-real-ip', () => {
    const limiter = rateLimit({ maxRequests: 1, windowMs: 60000 })
    const request1 = createMockRequest({
      'x-forwarded-for': '192.168.1.1',
      'x-real-ip': '203.0.113.1'
    })
    const request2 = createMockRequest({
      'x-forwarded-for': '192.168.1.1',
      'x-real-ip': '203.0.113.1'
    })

    limiter(request1) // First request allowed
    const result = limiter(request2) // Should be rate limited

    expect(result).not.toBeNull()
    expect(result!.status).toBe(429)
  })
})

describe('Rate Limiter - Basic Functionality', () => {
  let originalDateNow: typeof Date.now

  beforeEach(() => {
    // Mock Date.now for predictable time-based testing
    originalDateNow = Date.now
    Date.now = vi.fn(() => 1000000) // Fixed timestamp
  })

  afterEach(() => {
    Date.now = originalDateNow
    // Clear the internal request counts map
    const limiter = rateLimit({ maxRequests: 1, windowMs: 1000 })
    // Access the private requestCounts to clear it
    // We'll rely on window expiration in tests instead
  })

  it('allows first request from new IP', () => {
    const limiter = rateLimit({ maxRequests: 5, windowMs: 60000 })
    const request = createMockRequest({ 'x-real-ip': '192.168.1.1' })

    const result = limiter(request)

    expect(result).toBeNull() // null means request is allowed
  })

  it('allows requests within limit', () => {
    const limiter = rateLimit({ maxRequests: 3, windowMs: 60000 })
    const request = createMockRequest({ 'x-real-ip': '192.168.1.2' })

    expect(limiter(request)).toBeNull() // Request 1
    expect(limiter(request)).toBeNull() // Request 2
    expect(limiter(request)).toBeNull() // Request 3
  })

  it('blocks requests exceeding limit', () => {
    const limiter = rateLimit({ maxRequests: 2, windowMs: 60000 })
    const request = createMockRequest({ 'x-real-ip': '192.168.1.3' })

    expect(limiter(request)).toBeNull() // Request 1 - allowed
    expect(limiter(request)).toBeNull() // Request 2 - allowed

    const blockedResponse = limiter(request) // Request 3 - should be blocked

    expect(blockedResponse).not.toBeNull()
    expect(blockedResponse!.status).toBe(429)
  })

  it('includes correct rate limit headers in 429 response', async () => {
    const limiter = rateLimit({ maxRequests: 1, windowMs: 60000 })
    const request = createMockRequest({ 'x-real-ip': '192.168.1.4' })

    limiter(request) // First request allowed
    const blockedResponse = limiter(request) // Second request blocked

    expect(blockedResponse!.headers.get('X-RateLimit-Limit')).toBe('1')
    expect(blockedResponse!.headers.get('X-RateLimit-Remaining')).toBe('0')
    expect(blockedResponse!.headers.get('X-RateLimit-Reset')).toBeDefined()

    // Parse and verify response body
    const responseData = await blockedResponse!.json()
    expect(responseData.error).toBe('Too many requests. Please try again later.')
  })
})

describe('Rate Limiter - Time Window Behavior', () => {
  let mockTime: number

  beforeEach(() => {
    mockTime = 1000000
    Date.now = vi.fn(() => mockTime)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('resets counter after window expires', () => {
    const windowMs = 60000 // 1 minute
    const limiter = rateLimit({ maxRequests: 1, windowMs })
    const request = createMockRequest({ 'x-real-ip': '192.168.1.5' })

    // First request allowed
    expect(limiter(request)).toBeNull()

    // Second request blocked (within window)
    expect(limiter(request)).not.toBeNull()

    // Advance time beyond window
    mockTime += windowMs + 1000
    Date.now = vi.fn(() => mockTime)

    // Should allow request again after window expires
    expect(limiter(request)).toBeNull()
  })

  it('cleans up expired entries', () => {
    const windowMs = 30000 // 30 seconds
    const limiter = rateLimit({ maxRequests: 2, windowMs })

    // Create requests from different IPs
    const request1 = createMockRequest({ 'x-real-ip': '192.168.1.6' })
    const request2 = createMockRequest({ 'x-real-ip': '192.168.1.7' })

    // Make requests from both IPs
    limiter(request1)
    limiter(request2)

    // Advance time to trigger cleanup
    mockTime += windowMs + 1000
    Date.now = vi.fn(() => mockTime)

    // Make another request (should trigger cleanup of old entries)
    const request3 = createMockRequest({ 'x-real-ip': '192.168.1.8' })
    expect(limiter(request3)).toBeNull()

    // Original IPs should work again (their entries were cleaned up)
    expect(limiter(request1)).toBeNull()
    expect(limiter(request2)).toBeNull()
  })
})

describe('Rate Limiter - Different IP Isolation', () => {
  beforeEach(() => {
    Date.now = vi.fn(() => 1000000)
  })

  it('tracks different IPs separately', () => {
    const limiter = rateLimit({ maxRequests: 1, windowMs: 60000 })
    const request1 = createMockRequest({ 'x-real-ip': '192.168.1.10' })
    const request2 = createMockRequest({ 'x-real-ip': '192.168.1.11' })

    // First request from IP1 - allowed
    expect(limiter(request1)).toBeNull()

    // First request from IP2 - allowed (different IP)
    expect(limiter(request2)).toBeNull()

    // Second request from IP1 - blocked
    expect(limiter(request1)).not.toBeNull()

    // Second request from IP2 - blocked
    expect(limiter(request2)).not.toBeNull()
  })
})

describe('Predefined Rate Limiters', () => {
  beforeEach(() => {
    Date.now = vi.fn(() => 1000000)
  })

  it('auth limiter has correct configuration', () => {
    const request = createMockRequest({ 'x-real-ip': '192.168.1.20' })

    // Auth limiter should allow up to 20 requests
    for (let i = 0; i < 20; i++) {
      expect(rateLimiters.auth(request)).toBeNull()
    }

    // 21st request should be blocked
    const blocked = rateLimiters.auth(request)
    expect(blocked).not.toBeNull()
    expect(blocked!.status).toBe(429)
  })

  it('api limiter has correct configuration', () => {
    const request = createMockRequest({ 'x-real-ip': '192.168.1.21' })

    // API limiter should allow up to 100 requests
    for (let i = 0; i < 100; i++) {
      expect(rateLimiters.api(request)).toBeNull()
    }

    // 101st request should be blocked
    const blocked = rateLimiters.api(request)
    expect(blocked).not.toBeNull()
    expect(blocked!.status).toBe(429)
  })

  it('create limiter has correct configuration', () => {
    const request = createMockRequest({ 'x-real-ip': '192.168.1.22' })

    // Create limiter should allow up to 30 requests
    for (let i = 0; i < 30; i++) {
      expect(rateLimiters.create(request)).toBeNull()
    }

    // 31st request should be blocked
    const blocked = rateLimiters.create(request)
    expect(blocked).not.toBeNull()
    expect(blocked!.status).toBe(429)
  })
})