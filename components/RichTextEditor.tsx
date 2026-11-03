'use client';

import { type ReactNode, useState } from 'react';
import { EditorContent, useEditor, useEditorState } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Color, TextStyle } from '@tiptap/extension-text-style';
import { Bold, Italic, Link2, List, ListOrdered, RemoveFormatting, SquareDashed, Underline } from 'lucide-react';
import { inputClass } from '@/components/ui';
import { plainToHtml } from '@/lib/richTextFormat';

function ToolButton({ active, label, onClick, children }: { active?: boolean; label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`rounded-md p-1.5 transition ${active ? 'bg-brand-100 text-brand-800' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'}`}
    >
      {children}
    </button>
  );
}

/**
 * A small rich-text editor for step explanations. Paste from Word or Outlook keeps bold, italics, underline,
 * links, lists and text colours. "Box" puts a border around a block, e.g. an e-mail signature template.
 * The HTML goes to the server in a hidden input; the server cleans it before saving.
 */
export function RichTextEditor({ name, defaultValue = '' }: { name: string; defaultValue?: string }) {
  const [html, setHtml] = useState(() => plainToHtml(defaultValue));
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [3, 4] },
        codeBlock: false,
        link: { openOnClick: false, autolink: true, defaultProtocol: 'https', protocols: ['mailto', 'tel'] },
      }),
      TextStyle,
      Color,
    ],
    content: html,
    editorProps: { attributes: { class: 'rich-text min-h-48 px-3 py-2.5 text-sm text-slate-800 focus:outline-none' } },
    onUpdate: ({ editor }) => setHtml(editor.isEmpty ? '' : editor.getHTML()),
  });

  const state = useEditorState({
    editor,
    selector: ({ editor }) =>
      editor
        ? {
            bold: editor.isActive('bold'),
            italic: editor.isActive('italic'),
            underline: editor.isActive('underline'),
            link: editor.isActive('link'),
            bullet: editor.isActive('bulletList'),
            ordered: editor.isActive('orderedList'),
            box: editor.isActive('blockquote'),
          }
        : null,
  });

  function applyLink() {
    if (!editor) return;
    const url = linkUrl.trim();
    if (!url) editor.chain().focus().extendMarkRange('link').unsetLink().run();
    else
      editor
        .chain()
        .focus()
        .extendMarkRange('link')
        .setLink({ href: /^(https?:|mailto:|tel:)/i.test(url) ? url : `https://${url}` })
        .run();
    setLinkOpen(false);
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-300 bg-white shadow-sm focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20">
      <input type="hidden" name={name} value={html} />
      <div className="flex flex-wrap items-center gap-0.5 border-b border-slate-200 bg-slate-50 px-1.5 py-1">
        <ToolButton label="Bold" active={state?.bold} onClick={() => editor?.chain().focus().toggleBold().run()}>
          <Bold size={15} />
        </ToolButton>
        <ToolButton label="Italic" active={state?.italic} onClick={() => editor?.chain().focus().toggleItalic().run()}>
          <Italic size={15} />
        </ToolButton>
        <ToolButton label="Underline" active={state?.underline} onClick={() => editor?.chain().focus().toggleUnderline().run()}>
          <Underline size={15} />
        </ToolButton>
        <ToolButton
          label="Link"
          active={state?.link}
          onClick={() => {
            setLinkUrl(editor?.getAttributes('link').href ?? '');
            setLinkOpen((open) => !open);
          }}
        >
          <Link2 size={15} />
        </ToolButton>
        <span className="mx-1 h-5 w-px bg-slate-200" />
        <ToolButton label="Bulleted list" active={state?.bullet} onClick={() => editor?.chain().focus().toggleBulletList().run()}>
          <List size={15} />
        </ToolButton>
        <ToolButton label="Numbered list" active={state?.ordered} onClick={() => editor?.chain().focus().toggleOrderedList().run()}>
          <ListOrdered size={15} />
        </ToolButton>
        <ToolButton label="Box (e.g. a signature template)" active={state?.box} onClick={() => editor?.chain().focus().toggleBlockquote().run()}>
          <SquareDashed size={15} />
        </ToolButton>
        <span className="mx-1 h-5 w-px bg-slate-200" />
        <ToolButton label="Clear formatting" onClick={() => editor?.chain().focus().unsetAllMarks().clearNodes().run()}>
          <RemoveFormatting size={15} />
        </ToolButton>
      </div>
      {linkOpen && (
        <div className="flex gap-2 border-b border-slate-200 bg-white p-2">
          <input
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                applyLink();
              }
            }}
            placeholder="https://… or mailto:…  (empty removes the link)"
            aria-label="Link address"
            className={inputClass}
            autoFocus
          />
          <button
            type="button"
            onClick={applyLink}
            className="shrink-0 rounded-lg bg-brand-600 px-3 text-sm font-semibold text-white hover:bg-brand-700"
          >
            Apply
          </button>
        </div>
      )}
      <div className="max-h-[50vh] overflow-y-auto">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
