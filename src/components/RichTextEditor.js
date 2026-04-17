import { useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import Link from '@tiptap/extension-link';
import { TextStyle, Color, FontFamily } from '@tiptap/extension-text-style';
import Placeholder from '@tiptap/extension-placeholder';
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, Code,
  Heading1, Heading2, Heading3, List, ListOrdered, ListChecks,
  Quote, Minus, Undo2, Redo2, Link as LinkIcon, Unlink,
  AlignLeft, AlignCenter, AlignRight, AlignJustify, Highlighter,
  Palette, Type, ChevronDown,
} from 'lucide-react';

const FONTS = [
  { label: 'Sans', value: 'Inter, -apple-system, sans-serif' },
  { label: 'Serif', value: '"Instrument Serif", "Times New Roman", serif' },
  { label: 'Mono', value: 'ui-monospace, SFMono-Regular, Menlo, monospace' },
  { label: 'Rounded', value: '"SF Pro Rounded", system-ui, sans-serif' },
];

const COLORS = [
  '#f5f5f7', '#a855f7', '#ec4899', '#f59e0b', '#10b981',
  '#06b6d4', '#3b82f6', '#ef4444', '#a3a3a3',
];

const HIGHLIGHTS = [
  'rgba(168, 85, 247, 0.25)',
  'rgba(236, 72, 153, 0.25)',
  'rgba(245, 158, 11, 0.28)',
  'rgba(16, 185, 129, 0.25)',
  'rgba(59, 130, 246, 0.25)',
];

function ToolButton({ onClick, active, title, children, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all disabled:opacity-30 ${
        active
          ? 'bg-purple-500/20 text-purple-300 shadow-sm shadow-purple-500/10'
          : 'text-[var(--color-text-secondary)] hover:bg-white/5 hover:text-[var(--color-text-primary)]'
      }`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className="mx-1 h-5 w-px bg-[var(--color-border)]" />;
}

function Popover({ open, onClose, children, className = '' }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    setTimeout(() => document.addEventListener('mousedown', handler), 0);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div
      ref={ref}
      className={`absolute z-30 mt-2 rounded-xl border border-[var(--color-border)] glass-card p-2 shadow-2xl ${className}`}
    >
      {children}
    </div>
  );
}

export default function RichTextEditor({ content, onChange, placeholder = 'Start writing…' }) {
  const [openPopover, setOpenPopover] = useState(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        bulletList: { keepMarks: true, keepAttributes: true },
        orderedList: { keepMarks: true, keepAttributes: true },
      }),
      TextStyle,
      Color,
      FontFamily,
      Highlight.configure({ multicolor: true }),
      TaskList,
      TaskItem.configure({ nested: true }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Link.configure({ openOnClick: false, autolink: true, HTMLAttributes: { class: 'tiptap-link' } }),
      Placeholder.configure({ placeholder }),
    ],
    content: content || '',
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'tiptap-editor prose-notes focus:outline-none min-h-[400px]',
      },
    },
  });

  // Keep editor synced if `content` prop changes from outside (e.g. switching notes)
  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (content !== current && (content || '') !== '') {
      editor.commands.setContent(content || '', false);
    } else if (!content && current !== '<p></p>') {
      editor.commands.setContent('', false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content]);

  if (!editor) return null;

  const setLink = () => {
    const previous = editor.getAttributes('link').href;
    const url = window.prompt('URL', previous || 'https://');
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  const togglePopover = (name) => setOpenPopover(p => (p === name ? null : name));

  return (
    <div className="tiptap-wrapper">
      {/* Toolbar */}
      <div className="sticky top-0 z-20 mb-3 flex flex-wrap items-center gap-0.5 rounded-xl border border-[var(--color-border)] glass-card px-2 py-1.5 backdrop-blur-2xl">
        <ToolButton title="Undo (⌘Z)" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()}>
          <Undo2 size={15} />
        </ToolButton>
        <ToolButton title="Redo (⌘⇧Z)" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()}>
          <Redo2 size={15} />
        </ToolButton>

        <Divider />

        {/* Font family */}
        <div className="relative">
          <ToolButton title="Font family" onClick={() => togglePopover('font')} active={openPopover === 'font'}>
            <Type size={15} />
          </ToolButton>
          <Popover open={openPopover === 'font'} onClose={() => setOpenPopover(null)} className="min-w-[160px]">
            {FONTS.map(f => (
              <button
                key={f.label}
                type="button"
                onClick={() => { editor.chain().focus().setFontFamily(f.value).run(); setOpenPopover(null); }}
                className="block w-full rounded-lg px-3 py-2 text-left text-sm text-[var(--color-text-secondary)] hover:bg-white/5 hover:text-[var(--color-text-primary)]"
                style={{ fontFamily: f.value }}
              >
                {f.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => { editor.chain().focus().unsetFontFamily().run(); setOpenPopover(null); }}
              className="block w-full rounded-lg px-3 py-2 text-left text-xs text-[var(--color-text-muted)] hover:bg-white/5"
            >
              Reset font
            </button>
          </Popover>
        </div>

        {/* Heading */}
        <div className="relative">
          <button
            type="button"
            onClick={() => togglePopover('heading')}
            className={`flex h-8 items-center gap-1 rounded-lg px-2 text-sm transition-all ${
              openPopover === 'heading' ? 'bg-purple-500/15 text-purple-300' : 'text-[var(--color-text-secondary)] hover:bg-white/5 hover:text-[var(--color-text-primary)]'
            }`}
            title="Text style"
          >
            {editor.isActive('heading', { level: 1 }) ? 'H1'
              : editor.isActive('heading', { level: 2 }) ? 'H2'
              : editor.isActive('heading', { level: 3 }) ? 'H3'
              : 'Text'}
            <ChevronDown size={12} />
          </button>
          <Popover open={openPopover === 'heading'} onClose={() => setOpenPopover(null)} className="min-w-[170px]">
            <button type="button" onClick={() => { editor.chain().focus().setParagraph().run(); setOpenPopover(null); }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-[var(--color-text-secondary)] hover:bg-white/5 hover:text-[var(--color-text-primary)]">
              <span className="text-sm">Text</span>
            </button>
            <button type="button" onClick={() => { editor.chain().focus().toggleHeading({ level: 1 }).run(); setOpenPopover(null); }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-white/5">
              <Heading1 size={14} className="text-purple-300" /><span className="text-lg font-bold">Heading 1</span>
            </button>
            <button type="button" onClick={() => { editor.chain().focus().toggleHeading({ level: 2 }).run(); setOpenPopover(null); }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-white/5">
              <Heading2 size={14} className="text-purple-300" /><span className="text-base font-bold">Heading 2</span>
            </button>
            <button type="button" onClick={() => { editor.chain().focus().toggleHeading({ level: 3 }).run(); setOpenPopover(null); }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-white/5">
              <Heading3 size={14} className="text-purple-300" /><span className="text-sm font-semibold">Heading 3</span>
            </button>
          </Popover>
        </div>

        <Divider />

        <ToolButton title="Bold (⌘B)" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>
          <Bold size={15} />
        </ToolButton>
        <ToolButton title="Italic (⌘I)" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <Italic size={15} />
        </ToolButton>
        <ToolButton title="Underline (⌘U)" active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()}>
          <UnderlineIcon size={15} />
        </ToolButton>
        <ToolButton title="Strikethrough" active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()}>
          <Strikethrough size={15} />
        </ToolButton>
        <ToolButton title="Inline code" active={editor.isActive('code')} onClick={() => editor.chain().focus().toggleCode().run()}>
          <Code size={15} />
        </ToolButton>

        {/* Color */}
        <div className="relative">
          <ToolButton title="Text color" onClick={() => togglePopover('color')} active={openPopover === 'color'}>
            <Palette size={15} />
          </ToolButton>
          <Popover open={openPopover === 'color'} onClose={() => setOpenPopover(null)} className="min-w-[200px]">
            <div className="px-1 pb-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Text</div>
            <div className="grid grid-cols-5 gap-1.5 p-1">
              {COLORS.map(c => (
                <button key={c} type="button"
                  onClick={() => { editor.chain().focus().setColor(c).run(); setOpenPopover(null); }}
                  className="h-6 w-6 rounded-full border border-white/10 transition-transform hover:scale-110"
                  style={{ background: c }} title={c} />
              ))}
            </div>
            <button type="button"
              onClick={() => { editor.chain().focus().unsetColor().run(); setOpenPopover(null); }}
              className="mt-1 block w-full rounded-lg px-2 py-1.5 text-left text-xs text-[var(--color-text-muted)] hover:bg-white/5">
              Reset color
            </button>
            <div className="mt-2 px-1 pb-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Highlight</div>
            <div className="flex gap-1.5 p-1">
              {HIGHLIGHTS.map(c => (
                <button key={c} type="button"
                  onClick={() => { editor.chain().focus().toggleHighlight({ color: c }).run(); setOpenPopover(null); }}
                  className="h-6 w-6 rounded-full border border-white/10 transition-transform hover:scale-110"
                  style={{ background: c }} />
              ))}
              <button type="button"
                onClick={() => { editor.chain().focus().unsetHighlight().run(); setOpenPopover(null); }}
                className="flex h-6 w-6 items-center justify-center rounded-full border border-white/10 text-[10px] text-[var(--color-text-muted)] hover:bg-white/5"
                title="Clear highlight">✕</button>
            </div>
          </Popover>
        </div>

        <ToolButton title="Highlight" active={editor.isActive('highlight')} onClick={() => editor.chain().focus().toggleHighlight().run()}>
          <Highlighter size={15} />
        </ToolButton>

        <Divider />

        <ToolButton title="Bullet list" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}>
          <List size={15} />
        </ToolButton>
        <ToolButton title="Numbered list" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          <ListOrdered size={15} />
        </ToolButton>
        <ToolButton title="Checklist" active={editor.isActive('taskList')} onClick={() => editor.chain().focus().toggleTaskList().run()}>
          <ListChecks size={15} />
        </ToolButton>
        <ToolButton title="Blockquote" active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
          <Quote size={15} />
        </ToolButton>
        <ToolButton title="Divider" onClick={() => editor.chain().focus().setHorizontalRule().run()}>
          <Minus size={15} />
        </ToolButton>

        <Divider />

        <ToolButton title="Align left" active={editor.isActive({ textAlign: 'left' })} onClick={() => editor.chain().focus().setTextAlign('left').run()}>
          <AlignLeft size={15} />
        </ToolButton>
        <ToolButton title="Align center" active={editor.isActive({ textAlign: 'center' })} onClick={() => editor.chain().focus().setTextAlign('center').run()}>
          <AlignCenter size={15} />
        </ToolButton>
        <ToolButton title="Align right" active={editor.isActive({ textAlign: 'right' })} onClick={() => editor.chain().focus().setTextAlign('right').run()}>
          <AlignRight size={15} />
        </ToolButton>
        <ToolButton title="Justify" active={editor.isActive({ textAlign: 'justify' })} onClick={() => editor.chain().focus().setTextAlign('justify').run()}>
          <AlignJustify size={15} />
        </ToolButton>

        <Divider />

        <ToolButton title={editor.isActive('link') ? 'Edit link' : 'Add link'} active={editor.isActive('link')} onClick={setLink}>
          <LinkIcon size={15} />
        </ToolButton>
        {editor.isActive('link') && (
          <ToolButton title="Remove link" onClick={() => editor.chain().focus().unsetLink().run()}>
            <Unlink size={15} />
          </ToolButton>
        )}
      </div>

      <EditorContent editor={editor} />
    </div>
  );
}
