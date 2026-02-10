import { NextResponse, NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { createNote, getNotesByUser } from "@/lib/notes";
import { rateLimiters } from "@/lib/rate-limiter";

export async function GET() {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const notes = getNotesByUser(session.user.id);
  return NextResponse.json(
    notes.map((n) => ({
      id: n.id,
      title: n.title,
      isPublic: n.isPublic,
      updatedAt: n.updatedAt,
    }))
  );
}

export async function POST(request: NextRequest) {
  // Apply rate limiting for note creation
  const rateLimitResponse = rateLimiters.create(request);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  // Validate input types if provided
  if (body.title !== undefined && typeof body.title !== 'string') {
    return NextResponse.json({
      error: "Invalid input: title must be a string"
    }, { status: 400 });
  }

  if (body.contentJson !== undefined && typeof body.contentJson !== 'object') {
    return NextResponse.json({
      error: "Invalid input: contentJson must be an object"
    }, { status: 400 });
  }

  const note = createNote(session.user.id, {
    title: body.title,
    contentJson: body.contentJson ? JSON.stringify(body.contentJson) : undefined,
  });

  return NextResponse.json(note, { status: 201 });
}
