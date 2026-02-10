import { query, get, run } from "./db";
import { randomBytes } from "crypto";
import type { SQLQueryBindings } from "bun:sqlite";

export type Note = {
  id: string;
  userId: string;
  title: string;
  contentJson: string;
  isPublic: boolean;
  publicSlug: string | null;
  createdAt: string;
  updatedAt: string;
};

type NoteRow = {
  id: string;
  user_id: string;
  title: string;
  content_json: string;
  is_public: number;
  public_slug: string | null;
  created_at: string;
  updated_at: string;
};

function rowToNote(row: NoteRow): Note {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    contentJson: row.content_json,
    isPublic: row.is_public === 1,
    publicSlug: row.public_slug,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function generateId(): string {
  return randomBytes(16).toString("hex");
}

function generateSlug(): string {
  return randomBytes(16).toString("base64url"); // 22 chars for better security
}

const DEFAULT_CONTENT = JSON.stringify({
  type: "doc",
  content: [{ type: "paragraph" }],
});

export function createNote(
  userId: string,
  data: { title?: string; contentJson?: string } = {}
): Note {
  const id = generateId();
  const title = data.title || "Untitled note";
  const contentJson = data.contentJson || DEFAULT_CONTENT;

  run(
    `INSERT INTO notes (id, user_id, title, content_json) VALUES (?, ?, ?, ?)`,
    [id, userId, title, contentJson]
  );

  return getNoteById(userId, id)!;
}

export function getNoteById(userId: string, noteId: string): Note | null {
  const row = get<NoteRow>(
    `SELECT * FROM notes WHERE id = ? AND user_id = ?`,
    [noteId, userId]
  );
  return row ? rowToNote(row) : null;
}

export function getNotesByUser(userId: string): Note[] {
  const rows = query<NoteRow>(
    `SELECT * FROM notes WHERE user_id = ? ORDER BY updated_at DESC`,
    [userId]
  );
  return rows.map(rowToNote);
}

export function updateNote(
  userId: string,
  noteId: string,
  data: Partial<{ title: string; contentJson: string }>
): Note | null {
  const existing = getNoteById(userId, noteId);
  if (!existing) return null;

  const updates: string[] = [];
  const params: SQLQueryBindings[] = [];

  if (data.title !== undefined) {
    updates.push("title = ?");
    params.push(data.title);
  }
  if (data.contentJson !== undefined) {
    updates.push("content_json = ?");
    params.push(data.contentJson);
  }

  if (updates.length > 0) {
    updates.push("updated_at = datetime('now')");
    params.push(noteId, userId);
    run(
      `UPDATE notes SET ${updates.join(", ")} WHERE id = ? AND user_id = ?`,
      params
    );
  }

  return getNoteById(userId, noteId);
}

export function deleteNote(userId: string, noteId: string): boolean {
  const existing = getNoteById(userId, noteId);
  if (!existing) return false;

  run(`DELETE FROM notes WHERE id = ? AND user_id = ?`, [noteId, userId]);
  return true;
}

export function setNotePublic(
  userId: string,
  noteId: string,
  isPublic: boolean
): Note | null {
  const existing = getNoteById(userId, noteId);
  if (!existing) return null;

  if (isPublic) {
    const slug = existing.publicSlug || generateSlug();
    run(
      `UPDATE notes SET is_public = 1, public_slug = ?, updated_at = datetime('now') WHERE id = ? AND user_id = ?`,
      [slug, noteId, userId]
    );
  } else {
    run(
      `UPDATE notes SET is_public = 0, public_slug = NULL, updated_at = datetime('now') WHERE id = ? AND user_id = ?`,
      [noteId, userId]
    );
  }

  return getNoteById(userId, noteId);
}

export function getNoteByPublicSlug(slug: string): Note | null {
  const row = get<NoteRow>(
    `SELECT * FROM notes WHERE public_slug = ? AND is_public = 1`,
    [slug]
  );
  return row ? rowToNote(row) : null;
}
