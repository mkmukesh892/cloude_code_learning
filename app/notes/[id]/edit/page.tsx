"use client";

import { useEffect, useState, useCallback, use } from "react";
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

export default function NoteEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [note, setNote] = useState<Note | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState<JSONContent>({ type: "doc", content: [] });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  useEffect(() => {
    if (!isPending && !session?.user) {
      router.push("/login");
      return;
    }
    if (session?.user) {
      fetchNote();
    }
  }, [session, isPending, id, router]);

  // No cleanup needed for manual-only saves

  // Warn before page unload if there are unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  async function fetchNote() {
    const res = await fetch(`/api/notes/${id}`);
    if (res.ok) {
      const data = await res.json();
      setNote(data);
      setTitle(data.title);

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

      // Mark as saved when initially loaded
      setHasUnsavedChanges(false);
      setLastSaved(new Date());
    } else {
      router.push("/dashboard");
    }
  }

  const saveNote = useCallback(
    async (newTitle: string, newContent: JSONContent) => {
      setSaving(true);
      try {
        const res = await fetch(`/api/notes/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: newTitle, contentJson: newContent }),
        });
        if (res.ok) {
          setHasUnsavedChanges(false);
          setLastSaved(new Date());
        }
      } catch (error) {
        console.error("Failed to save note:", error);
      } finally {
        setSaving(false);
      }
    },
    [id]
  );

  // No auto-save - user controls when to save

  // Manual save function
  const handleManualSave = useCallback(() => {
    saveNote(title, content);
  }, [saveNote, title, content]);

  // Keyboard shortcut for manual save (Ctrl+S / Cmd+S)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (hasUnsavedChanges && !saving) {
          handleManualSave();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasUnsavedChanges, saving, handleManualSave]);

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this note?")) return;
    setDeleting(true);
    const res = await fetch(`/api/notes/${id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/dashboard");
    }
    setDeleting(false);
  }

  async function handleToggleShare() {
    const res = await fetch(`/api/notes/${id}/share`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPublic: !note?.isPublic }),
    });
    if (res.ok) {
      const data = await res.json();
      setNote((prev) => (prev ? { ...prev, isPublic: data.isPublic, publicSlug: data.publicSlug } : null));
    }
  }

  function handleTitleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newTitle = e.target.value;
    setTitle(newTitle);
    setHasUnsavedChanges(true); // Just mark as changed, don't auto-save
  }

  function handleContentChange(newContent: JSONContent) {
    setContent(newContent);
    setHasUnsavedChanges(true); // Just mark as changed, don't auto-save
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
            {/* Save Status Indicator */}
            <div className="flex items-center gap-2 text-sm">
              {saving && (
                <span className="text-blue-600">
                  <svg className="animate-spin -ml-1 mr-1 h-4 w-4 text-blue-600 inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </span>
              )}
              {!saving && hasUnsavedChanges && (
                <span className="text-orange-600">Unsaved changes - Click Save</span>
              )}
              {!saving && !hasUnsavedChanges && lastSaved && (
                <span className="text-green-600">
                  Saved {lastSaved.toLocaleTimeString()}
                </span>
              )}
            </div>

            {/* Manual Save Button */}
            <button
              onClick={handleManualSave}
              disabled={saving || !hasUnsavedChanges}
              className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
              title={hasUnsavedChanges ? "Save changes manually (Ctrl/Cmd+S)" : "No changes to save"}
            >
              Save
            </button>

            <button
              onClick={handleToggleShare}
              className={`px-3 py-1 text-sm rounded ${
                note.isPublic
                  ? "bg-green-100 text-green-700 hover:bg-green-200"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {note.isPublic ? "Public" : "Private"}
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 disabled:opacity-50"
            >
              Delete
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <input
          type="text"
          value={title}
          onChange={handleTitleChange}
          placeholder="Note title"
          className="w-full text-2xl font-bold mb-4 px-0 py-2 border-0 border-b-2 border-gray-200 focus:border-blue-500 focus:outline-none bg-transparent"
        />

        {note.isPublic && publicUrl && (
          <div className="mb-4 p-3 bg-green-50 rounded text-sm">
            <span className="text-gray-600">Public URL: </span>
            <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
              {publicUrl}
            </a>
          </div>
        )}

        <NoteEditor content={content} onChange={handleContentChange} />
      </main>
    </div>
  );
}
