'use client';

import { type ReactNode, useRef, useState } from 'react';
import { EditorContent, useEditor, useEditorState } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Color, TextStyle } from '@tiptap/extension-text-style';
import Image from '@tiptap/extension-image';
import type { EditorView } from '@tiptap/pm/view';
import { Bold, ImagePlus, Italic, Link2, List, ListOrdered, RemoveFormatting, SquareDashed, Underline } from 'lucide-react';
import { inputClass } from '@/components/ui';
import { plainToHtml } from '@/lib/richTextFormat';

const MAX_WIDTH = 1200; // px; screenshots stay sharp, files stay small
const MAX_BYTES = 900_000; // per image, after shrinking

/** Reads an image file and shrinks it to at most MAX_WIDTH wide; screenshots stay PNG, photos become JPEG. */
async function toDataUrl(file: File): Promise<string | null> {
  if (!/^image\/(png|jpeg|gif|webp)$/.test(file.type)) return null;
  // Read as a data URL: the page's content security policy allows data: images, not blob: ones.
  const original = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new window.Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = original;
    });
    const scale = Math.min(1, MAX_WIDTH / img.naturalWidth);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
    let data = canvas.toDataURL(file.type === 'image/png' ? 'image/png' : 'image/jpeg', 0.85);
    if (data.length * 0.75 > MAX_BYTES) data = canvas.toDataURL('image/jpeg', 0.75);
    return data.length * 0.75 > MAX_BYTES ? null : data;
  } catch {
    return null;
  }
}

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
  const [imageError, setImageError] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);

  async function insertImages(view: EditorView, files: File[], pos?: number) {
    setImageError('');
    for (const file of files) {
      const src = await toDataUrl(file);
      if (!src) {
        setImageError('That image could not be added: use PNG, JPEG, GIF or WebP, and keep it under about 1 MB.');
        continue;
      }
      const node = view.state.schema.nodes.image.create({ src, alt: file.name.replace(/\.[a-z]+$/i, '') });
      const at = pos ?? view.state.selection.from;
      view.dispatch(view.state.tr.insert(at, node));
    }
  }
  const imageFiles = (list: FileList | null | undefined) => Array.from(list ?? []).filter((f) => f.type.startsWith('image/'));

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
      Image.configure({ allowBase64: true }),
    ],
    content: html,
    editorProps: {
      attributes: { class: 'rich-text min-h-48 px-3 py-2.5 text-sm text-slate-800 focus:outline-none' },
      // Pasted or dropped screenshots become images in the text.
      handlePaste: (view, event) => {
        const files = imageFiles(event.clipboardData?.files);
        if (!files.length) return false;
        void insertImages(view, files);
        return true;
      },
      handleDrop: (view, event) => {
        const files = imageFiles(event.dataTransfer?.files);
        if (!files.length) return false;
        const pos = view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos;
        void insertImages(view, files, pos);
        return true;
      },
    },
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
        <ToolButton label="Add an image (or paste a screenshot)" onClick={() => fileInput.current?.click()}>
          <ImagePlus size={15} />
        </ToolButton>
        <input
          ref={fileInput}
          type="file"
          accept="image/png,image/jpeg,image/gif,image/webp"
          multiple
          hidden
          onChange={(e) => {
            if (editor) void insertImages(editor.view, imageFiles(e.target.files));
            e.target.value = '';
          }}
        />
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
      {imageError && <p className="border-b border-slate-200 bg-red-50 px-3 py-1.5 text-xs text-red-700">{imageError}</p>}
      <div className="max-h-[60vh] overflow-y-auto">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
