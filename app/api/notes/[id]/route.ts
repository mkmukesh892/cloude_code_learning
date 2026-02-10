import { NextResponse, NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { getNoteById, updateNote, deleteNote, setNotePublic } from "@/lib/notes";
import { rateLimiters } from "@/lib/rate-limiter";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const note = getNoteById(session.user.id, id);
  if (!note) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(note);
}

export async function PUT(request: NextRequest, { params }: Params) {
  // Apply rate limiting for note updates
  const rateLimitResponse = rateLimiters.create(request);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
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

  const note = updateNote(session.user.id, id, {
    title: body.title,
    contentJson: body.contentJson ? JSON.stringify(body.contentJson) : undefined,
  });

  if (!note) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(note);
}

export async function DELETE(_request: Request, { params }: Params) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const deleted = deleteNote(session.user.id, id);
  if (!deleted) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return new NextResponse(null, { status: 204 });
}
