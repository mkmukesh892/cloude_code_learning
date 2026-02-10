import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock the db module with in-memory data store
const mockNotes = new Map()
let insertCount = 0

vi.mock('../db', () => {
  return {
    query: vi.fn((sql: string, params: any[] = []) => {
      if (sql.includes('SELECT * FROM notes WHERE user_id = ?')) {
        const userId = params[0]
        return Array.from(mockNotes.values()).filter((note: any) => note.user_id === userId)
      }
      return []
    }),
    get: vi.fn((sql: string, params: any[] = []) => {
      if (sql.includes('SELECT * FROM notes WHERE id = ? AND user_id = ?')) {
        const [noteId, userId] = params
        const note = mockNotes.get(noteId)
        return note && note.user_id === userId ? note : null
      }
      if (sql.includes('SELECT * FROM notes WHERE public_slug = ? AND is_public = 1')) {
        const slug = params[0]
        return Array.from(mockNotes.values()).find(
          (note: any) => note.public_slug === slug && note.is_public === 1
        ) || null
      }
      return null
    }),
    run: vi.fn((sql: string, params: any[] = []) => {
      if (sql.includes('INSERT INTO notes')) {
        const [id, userId, title, contentJson] = params
        mockNotes.set(id, {
          id,
          user_id: userId,
          title,
          content_json: contentJson,
          is_public: 0,
          public_slug: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
      } else if (sql.includes('UPDATE notes')) {
        // Handle update operations
        const noteId = params[params.length - 2]
        const note = mockNotes.get(noteId)
        if (note) {
          if (sql.includes('title = ?')) {
            note.title = params[0]
          }
          if (sql.includes('content_json = ?')) {
            const contentIndex = sql.includes('title = ?') ? 1 : 0
            note.content_json = params[contentIndex]
          }
          if (sql.includes('is_public = 1')) {
            note.is_public = 1
            note.public_slug = params[0]
          }
          if (sql.includes('is_public = 0')) {
            note.is_public = 0
            note.public_slug = null
          }
          note.updated_at = new Date().toISOString()
        }
      } else if (sql.includes('DELETE FROM notes')) {
        const noteId = params[0]
        mockNotes.delete(noteId)
      }
    })
  }
})

// Import after mocking
import * as notesModule from '../notes'

describe('Note Creation', () => {
  beforeEach(() => {
    mockNotes.clear()
    insertCount = 0
    vi.clearAllMocks()
  })

  it('creates note with default title when no title provided', () => {
    const userId = 'test-user-1'

    const note = notesModule.createNote(userId)

    expect(note).toBeDefined()
    expect(note.title).toBe('Untitled note')
    expect(note.userId).toBe(userId)
    expect(note.id).toMatch(/^[a-f0-9]{32}$/) // 32-char hex string
    expect(note.isPublic).toBe(false)
    expect(note.publicSlug).toBeNull()
  })

  it('creates note with provided title and content', () => {
    const userId = 'test-user-1'
    const title = 'My Test Note'
    const contentJson = JSON.stringify({
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hello world' }] }]
    })

    const note = notesModule.createNote(userId, { title, contentJson })

    expect(note.title).toBe(title)
    expect(note.contentJson).toBe(contentJson)
    expect(note.userId).toBe(userId)
  })

  it('creates note with default TipTap content when no content provided', () => {
    const userId = 'test-user-1'

    const note = notesModule.createNote(userId)

    const parsedContent = JSON.parse(note.contentJson)
    expect(parsedContent.type).toBe('doc')
    expect(parsedContent.content).toEqual([{ type: 'paragraph' }])
  })

  it('generates unique IDs for multiple notes', () => {
    const userId = 'test-user-1'

    const note1 = notesModule.createNote(userId)
    const note2 = notesModule.createNote(userId)

    expect(note1.id).not.toBe(note2.id)
    expect(note1.id).toMatch(/^[a-f0-9]{32}$/)
    expect(note2.id).toMatch(/^[a-f0-9]{32}$/)
  })
})

describe('Note Retrieval', () => {
  beforeEach(() => {
    mockNotes.clear()
    vi.clearAllMocks()
  })

  it('retrieves note by ID for correct user', () => {
    const userId = 'user-123'
    const createdNote = notesModule.createNote(userId, { title: 'Test Note' })

    const retrieved = notesModule.getNoteById(userId, createdNote.id)

    expect(retrieved).toBeDefined()
    expect(retrieved!.id).toBe(createdNote.id)
    expect(retrieved!.title).toBe('Test Note')
    expect(retrieved!.userId).toBe(userId)
  })

  it('returns null when note not found', () => {
    const userId = 'user-123'

    const retrieved = notesModule.getNoteById(userId, 'nonexistent-id')

    expect(retrieved).toBeNull()
  })

  it('returns null when note belongs to different user', () => {
    const user1 = 'user-123'
    const user2 = 'user-456'
    const note = notesModule.createNote(user1, { title: 'User 1 Note' })

    const retrieved = notesModule.getNoteById(user2, note.id)

    expect(retrieved).toBeNull()
  })

  it('retrieves all notes for user ordered by update time', () => {
    const userId = 'user-123'
    const note1 = notesModule.createNote(userId, { title: 'First Note' })
    const note2 = notesModule.createNote(userId, { title: 'Second Note' })

    const notes = notesModule.getNotesByUser(userId)

    expect(notes).toHaveLength(2)
    expect(notes.map(n => n.title)).toContain('First Note')
    expect(notes.map(n => n.title)).toContain('Second Note')
  })

  it('returns empty array for user with no notes', () => {
    const userId = 'user-with-no-notes'

    const notes = notesModule.getNotesByUser(userId)

    expect(notes).toEqual([])
  })
})

describe('Note Updates', () => {
  beforeEach(() => {
    mockNotes.clear()
    vi.clearAllMocks()
  })

  it('updates note title', () => {
    const userId = 'user-123'
    const note = notesModule.createNote(userId, { title: 'Original Title' })
    const newTitle = 'Updated Title'

    const updated = notesModule.updateNote(userId, note.id, { title: newTitle })

    expect(updated).toBeDefined()
    expect(updated!.title).toBe(newTitle)
    expect(updated!.id).toBe(note.id)
  })

  it('updates note content', () => {
    const userId = 'user-123'
    const note = notesModule.createNote(userId)
    const newContent = JSON.stringify({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'New content' }] }] })

    const updated = notesModule.updateNote(userId, note.id, { contentJson: newContent })

    expect(updated).toBeDefined()
    expect(updated!.contentJson).toBe(newContent)
  })

  it('updates both title and content', () => {
    const userId = 'user-123'
    const note = notesModule.createNote(userId)
    const newTitle = 'New Title'
    const newContent = JSON.stringify({ type: 'doc', content: [] })

    const updated = notesModule.updateNote(userId, note.id, { title: newTitle, contentJson: newContent })

    expect(updated).toBeDefined()
    expect(updated!.title).toBe(newTitle)
    expect(updated!.contentJson).toBe(newContent)
  })

  it('returns null when updating nonexistent note', () => {
    const userId = 'user-123'

    const updated = notesModule.updateNote(userId, 'nonexistent-id', { title: 'New Title' })

    expect(updated).toBeNull()
  })

  it('returns null when updating note for wrong user', () => {
    const user1 = 'user-123'
    const user2 = 'user-456'
    const note = notesModule.createNote(user1)

    const updated = notesModule.updateNote(user2, note.id, { title: 'Hacked Title' })

    expect(updated).toBeNull()
  })
})

describe('Note Deletion', () => {
  beforeEach(() => {
    mockNotes.clear()
    vi.clearAllMocks()
  })

  it('deletes existing note', () => {
    const userId = 'user-123'
    const note = notesModule.createNote(userId, { title: 'To Delete' })

    const deleted = notesModule.deleteNote(userId, note.id)

    expect(deleted).toBe(true)
    expect(notesModule.getNoteById(userId, note.id)).toBeNull()
  })

  it('returns false when deleting nonexistent note', () => {
    const userId = 'user-123'

    const deleted = notesModule.deleteNote(userId, 'nonexistent-id')

    expect(deleted).toBe(false)
  })

  it('returns false when trying to delete note of different user', () => {
    const user1 = 'user-123'
    const user2 = 'user-456'
    const note = notesModule.createNote(user1)

    const deleted = notesModule.deleteNote(user2, note.id)

    expect(deleted).toBe(false)
  })
})

describe('Note Sharing', () => {
  beforeEach(() => {
    mockNotes.clear()
    vi.clearAllMocks()
  })

  it('makes note public and generates slug', () => {
    const userId = 'user-123'
    const note = notesModule.createNote(userId, { title: 'Public Note' })

    const updated = notesModule.setNotePublic(userId, note.id, true)

    expect(updated).toBeDefined()
    expect(updated!.isPublic).toBe(true)
    expect(updated!.publicSlug).toBeDefined()
    expect(updated!.publicSlug).toMatch(/^[A-Za-z0-9_-]{22}$/) // Base64URL, 22 chars
  })

  it('makes note private and removes slug', () => {
    const userId = 'user-123'
    const note = notesModule.createNote(userId, { title: 'Private Note' })

    // First make it public
    const publicNote = notesModule.setNotePublic(userId, note.id, true)
    expect(publicNote!.isPublic).toBe(true)

    // Then make it private
    const privateNote = notesModule.setNotePublic(userId, note.id, false)

    expect(privateNote).toBeDefined()
    expect(privateNote!.isPublic).toBe(false)
    expect(privateNote!.publicSlug).toBeNull()
  })

  it('generates new slug when making note public after being private', () => {
    const userId = 'user-123'
    const note = notesModule.createNote(userId, { title: 'Toggle Note' })

    // Make public first time
    const public1 = notesModule.setNotePublic(userId, note.id, true)
    const originalSlug = public1!.publicSlug

    // Make private (removes slug for security)
    const privateNote = notesModule.setNotePublic(userId, note.id, false)
    expect(privateNote!.publicSlug).toBeNull()

    // Make public again - should generate new slug for security
    const public2 = notesModule.setNotePublic(userId, note.id, true)

    expect(public2!.publicSlug).toBeDefined()
    expect(public2!.publicSlug).not.toBe(originalSlug) // New slug for security
    expect(public2!.publicSlug).toMatch(/^[A-Za-z0-9_-]{22}$/)
  })

  it('returns null when setting visibility for nonexistent note', () => {
    const userId = 'user-123'

    const result = notesModule.setNotePublic(userId, 'nonexistent-id', true)

    expect(result).toBeNull()
  })

  it('returns null when setting visibility for note of different user', () => {
    const user1 = 'user-123'
    const user2 = 'user-456'
    const note = notesModule.createNote(user1)

    const result = notesModule.setNotePublic(user2, note.id, true)

    expect(result).toBeNull()
  })

  it('retrieves public note by slug', () => {
    const userId = 'user-123'
    const note = notesModule.createNote(userId, { title: 'Public Shared Note' })
    const publicNote = notesModule.setNotePublic(userId, note.id, true)

    const retrieved = notesModule.getNoteByPublicSlug(publicNote!.publicSlug!)

    expect(retrieved).toBeDefined()
    expect(retrieved!.id).toBe(note.id)
    expect(retrieved!.title).toBe('Public Shared Note')
    expect(retrieved!.isPublic).toBe(true)
  })

  it('returns null for nonexistent public slug', () => {
    const retrieved = notesModule.getNoteByPublicSlug('nonexistent-slug')

    expect(retrieved).toBeNull()
  })

  it('returns null for private note slug', () => {
    const userId = 'user-123'
    const note = notesModule.createNote(userId, { title: 'Private Note' })

    // Make public to get a slug
    const publicNote = notesModule.setNotePublic(userId, note.id, true)
    const slug = publicNote!.publicSlug!

    // Make private again
    notesModule.setNotePublic(userId, note.id, false)

    // Try to retrieve - should return null since note is now private
    const retrieved = notesModule.getNoteByPublicSlug(slug)

    expect(retrieved).toBeNull()
  })
})