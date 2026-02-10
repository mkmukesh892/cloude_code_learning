"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

type Props = {
  contentJson: string;
};

export default function PublicNoteViewer({ contentJson }: Props) {
  let content;
  try {
    content = JSON.parse(contentJson);
    // Basic validation of TipTap document structure
    if (!content || typeof content !== 'object' || content.type !== 'doc') {
      content = { type: "doc", content: [{ type: "paragraph" }] };
    }
  } catch {
    // Fallback to empty document if JSON is invalid
    content = { type: "doc", content: [{ type: "paragraph" }] };
  }

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
    ],
    content,
    editable: false,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "p-4",
      },
    },
  });

  if (!editor) return null;

  return (
    <div className="bg-white rounded-lg shadow">
      <EditorContent editor={editor} />
    </div>
  );
}
