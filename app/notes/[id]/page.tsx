"use client";

import { useEffect, useState, use, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "@/lib/auth-client";
import NoteEditor from "@/components/NoteEditor";
import type { JSONContent } from "@tiptap/react";

type Note = {
  id: string;
  title: string;
  contentJson: string;
  isPublic: boolean;
  publicSlug: string | null;
};

export default function NoteViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [note, setNote] = useState<Note | null>(null);
  const [content, setContent] = useState<JSONContent>({ type: "doc", content: [] });
  const [deleting, setDeleting] = useState(false);

  const fetchNote = useCallback(async () => {
    const res = await fetch(`/api/notes/${id}`);
    if (res.ok) {
      const data = await res.json();
      setNote(data);

      // Safely parse content JSON with validation
      try {
        const parsedContent = JSON.parse(data.contentJson);
        if (parsedContent && typeof parsedContent === 'object' && parsedContent.type === 'doc') {
          setContent(parsedContent);
        } else {
          setContent({ type: "doc", content: [{ type: "paragraph" }] });
        }
      } catch {
        setContent({ type: "doc", content: [{ type: "paragraph" }] });
      }
    } else {
      router.push("/dashboard");
    }
  }, [id, router]);

  useEffect(() => {
    if (!isPending && !session?.user) {
      router.push("/login");
      return;
    }
    if (session?.user) {
      fetchNote();
    }
  }, [session, isPending, fetchNote]);

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this note? This action cannot be undone.")) return;
    setDeleting(true);
    const res = await fetch(`/api/notes/${id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/dashboard");
    }
    setDeleting(false);
  }

  if (isPending || !note) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  const publicUrl = note.publicSlug ? `${window.location.origin}/p/${note.publicSlug}` : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/dashboard" className="text-blue-600 hover:underline">
            &larr; Back to notes
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href={`/notes/${id}/edit`}
              className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
            >
              Edit
            </Link>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 disabled:opacity-50"
            >
              {deleting ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6 text-gray-900">{note.title}</h1>

        {note.isPublic && publicUrl && (
          <div className="mb-6 p-3 bg-green-50 border border-green-200 rounded text-sm">
            <span className="text-gray-600">This note is public. Share URL: </span>
            <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
              {publicUrl}
            </a>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <NoteEditor content={content} editable={false} />
        </div>
      </main>
    </div>
  );
}