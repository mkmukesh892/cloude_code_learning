import '@testing-library/jest-dom'
import { beforeEach, vi } from 'vitest'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn()
  }),
  useParams: () => ({}),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '',
  redirect: vi.fn(),
  notFound: vi.fn()
}))

// Mock better-auth
vi.mock('./lib/auth', () => ({
  auth: {
    api: {
      getSession: vi.fn()
    }
  }
}))

// Clean up after each test
beforeEach(() => {
  vi.clearAllMocks()
})