import { notFound } from "next/navigation";
import { getNoteByPublicSlug } from "@/lib/notes";
import PublicNoteViewer from "@/components/PublicNoteViewer";

export default async function PublicNotePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const note = getNoteByPublicSlug(slug);

  if (!note) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <span className="text-sm text-gray-500">Shared Note</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">{note.title}</h1>
        <PublicNoteViewer contentJson={note.contentJson} />
      </main>
    </div>
  );
}
