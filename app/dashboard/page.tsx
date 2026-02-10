"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession, signOut } from "@/lib/auth-client";

type NoteListItem = {
  id: string;
  title: string;
  isPublic: boolean;
  updatedAt: string;
};

export default function DashboardPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [notes, setNotes] = useState<NoteListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotes = useCallback(async () => {
    const res = await fetch("/api/notes");
    if (res.ok) {
      setNotes(await res.json());
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!isPending && !session?.user) {
      router.push("/login");
      return;
    }
    if (session?.user) {
      fetchNotes();
    }
  }, [session, isPending, router, fetchNotes]);

  async function handleCreateNote() {
    const res = await fetch("/api/notes", { method: "POST" });
    if (res.ok) {
      const note = await res.json();
      router.push(`/notes/${note.id}/edit`);
    }
  }

  async function handleLogout() {
    await signOut();
    router.push("/");
  }

  if (isPending || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold">My Notes</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{session?.user?.email}</span>
            <button
              onClick={handleLogout}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold">Notes</h2>
          <button
            onClick={handleCreateNote}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            + New Note
          </button>
        </div>

        {notes.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-500">No notes yet. Create your first note!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notes.map((note) => (
              <Link
                key={note.id}
                href={`/notes/${note.id}`}
                className="block p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium">{note.title}</h3>
                    <p className="text-sm text-gray-500">
                      Updated {new Date(note.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                  {note.isPublic && (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                      Public
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
