import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { setNotePublic } from "@/lib/notes";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Validate request body
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Validate required fields and types
  if (typeof body.isPublic !== 'boolean') {
    return NextResponse.json({
      error: "Invalid input: isPublic must be a boolean"
    }, { status: 400 });
  }

  const note = setNotePublic(session.user.id, id, body.isPublic);

  if (!note) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: note.id,
    isPublic: note.isPublic,
    publicSlug: note.publicSlug,
  });
}
