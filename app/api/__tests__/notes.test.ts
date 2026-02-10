import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

// Mock modules before imports
vi.mock('@/lib/notes')
vi.mock('@/lib/auth')
vi.mock('@/lib/rate-limiter')

// Import handlers after mocking
import { GET as getNotesHandler, POST as createNoteHandler } from '../notes/route'

// Mock implementations
const mockNotes = new Map()

describe('Notes API', () => {
  beforeEach(async () => {
    mockNotes.clear()
    vi.clearAllMocks()

    // Reset mocks
    const { createNote, getNotesByUser } = await vi.importMock('@/lib/notes')
    const { getSession } = await vi.importMock('@/lib/auth')
    const { rateLimiters } = await vi.importMock('@/lib/rate-limiter')

    vi.mocked(createNote).mockImplementation((userId: string, data: any = {}) => {
      const id = `note-${Math.random().toString(36).substr(2, 9)}`
      const note = {
        id,
        userId,
        title: data.title || 'Untitled note',
        contentJson: data.contentJson || '{"type":"doc","content":[{"type":"paragraph"}]}',
        isPublic: false,
        publicSlug: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      mockNotes.set(id, note)
      return note
    })

    vi.mocked(getNotesByUser).mockImplementation((userId: string) => {
      return Array.from(mockNotes.values()).filter((note: any) => note.userId === userId)
    })

    vi.mocked(getSession).mockResolvedValue({
      user: { id: 'user-123', name: 'Test User', email: 'test@example.com' },
      session: { id: 'session-123' }
    })

    vi.mocked(rateLimiters.create).mockReturnValue(null)
  })

  function createMockRequest(body: any = {}): NextRequest {
    return {
      json: vi.fn().mockResolvedValue(body),
      headers: { get: vi.fn() }
    } as unknown as NextRequest
  }

  it('GET returns authenticated user notes', async () => {
    const { createNote } = await vi.importMock('@/lib/notes')
    vi.mocked(createNote)('user-123', { title: 'Test Note' })

    const response = await getNotesHandler()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(Array.isArray(data)).toBe(true)
  })

  it('POST creates note with defaults', async () => {
    const request = createMockRequest({})
    const response = await createNoteHandler(request)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.title).toBe('Untitled note')
    expect(data.userId).toBe('user-123')
  })

  it('POST validates input types', async () => {
    const request = createMockRequest({ title: 123 })
    const response = await createNoteHandler(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid input: title must be a string')
  })
})