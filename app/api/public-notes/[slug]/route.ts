import { NextResponse } from "next/server";
import { getNoteByPublicSlug } from "@/lib/notes";

type Params = { params: Promise<{ slug: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { slug } = await params;
  const note = getNoteByPublicSlug(slug);

  if (!note) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    title: note.title,
    contentJson: note.contentJson,
  });
}
