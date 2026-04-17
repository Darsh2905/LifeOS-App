import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNotes } from '../context/NotesContext';
import RichTextEditor from '../components/RichTextEditor';
import { api } from '../utils/api';
import {
  Plus, Search, Tag, Trash2, X, Pin, PinOff,
  Copy, ChevronLeft, Save, Palette, StickyNote,
  Clock, FileText, ArrowUpDown, Hash, Sparkles, Loader2
} from 'lucide-react';

function htmlToText(html) {
  if (!html) return '';
  if (!/<[a-z][\s\S]*>/i.test(html)) return html;
  const div = document.createElement('div');
  div.innerHTML = html;
  return (div.textContent || div.innerText || '').trim();
}

const TAG_COLORS = [
  'bg-indigo-500/20 text-indigo-300 border-indigo-500/20',
  'bg-pink-500/20 text-pink-300 border-pink-500/20',
  'bg-emerald-500/20 text-emerald-300 border-emerald-500/20',
  'bg-amber-500/20 text-amber-300 border-amber-500/20',
  'bg-cyan-500/20 text-cyan-300 border-cyan-500/20',
  'bg-purple-500/20 text-purple-300 border-purple-500/20',
  'bg-red-500/20 text-red-300 border-red-500/20',
  'bg-teal-500/20 text-teal-300 border-teal-500/20',
];

const NOTE_COLORS = [
  null,
  'rgba(147, 51, 234, 0.08)',
  'rgba(236, 72, 153, 0.08)',
  'rgba(59, 130, 246, 0.08)',
  'rgba(16, 185, 129, 0.08)',
  'rgba(245, 158, 11, 0.08)',
  'rgba(239, 68, 68, 0.08)',
];

const NOTE_BORDER_COLORS = [
  null,
  'rgba(147, 51, 234, 0.2)',
  'rgba(236, 72, 153, 0.2)',
  'rgba(59, 130, 246, 0.2)',
  'rgba(16, 185, 129, 0.2)',
  'rgba(245, 158, 11, 0.2)',
  'rgba(239, 68, 68, 0.2)',
];

const SORT_OPTIONS = [
  { id: 'updated', label: 'Last edited' },
  { id: 'created', label: 'Date created' },
  { id: 'alpha', label: 'Alphabetical' },
];

function formatRelativeTime(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function wordCount(text) {
  const plain = htmlToText(text || '');
  if (!plain.trim()) return 0;
  return plain.trim().split(/\s+/).length;
}

/* ── Note Editor (split pane right side) ── */
function NoteEditor({ note, onSave, onClose, isNew }) {
  const [title, setTitle] = useState(note?.title || '');
  const [content, setContent] = useState(note?.content || '');
  const [tags, setTags] = useState(note?.tags || []);
  const [tagInput, setTagInput] = useState('');
  const [color, setColor] = useState(note?.color || null);
  const [showColors, setShowColors] = useState(false);
  const titleRef = useRef(null);
  const [hasUnsaved, setHasUnsaved] = useState(false);
  const [aiSummary, setAiSummary] = useState(null);
  const [aiSummarizing, setAiSummarizing] = useState(false);

  useEffect(() => {
    if (isNew && titleRef.current) titleRef.current.focus();
  }, [isNew]);

  const handleContentChange = (html) => {
    setContent(html);
    setHasUnsaved(true);
  };

  const addTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (t && !tags.includes(t)) {
      setTags([...tags, t]);
      setHasUnsaved(true);
    }
    setTagInput('');
  };

  const removeTag = (tag) => {
    setTags(tags.filter(t => t !== tag));
    setHasUnsaved(true);
  };

  const handleSave = useCallback(() => {
    const plain = htmlToText(content);
    if (!title.trim() && !plain) return;
    onSave({
      title: title.trim() || 'Untitled',
      content: plain ? content : '',
      tags,
      color,
    });
    setHasUnsaved(false);
  }, [title, content, tags, color, onSave]);

  const summarizeWithAI = async () => {
    const plain = htmlToText(content);
    if (!plain.trim()) return;
    setAiSummarizing(true);
    setAiSummary(null);
    try {
      const result = await api.post('/ai/summarize-note', { title, content: plain });
      setAiSummary(result);
      // Auto-apply suggested tags (merge, don't replace)
      if (result.tags && result.tags.length > 0) {
        const newTags = result.tags.filter(t => !tags.includes(t.toLowerCase())).map(t => t.toLowerCase());
        if (newTags.length > 0) {
          setTags(prev => [...prev, ...newTags]);
          setHasUnsaved(true);
        }
      }
    } catch (err) {
      console.error('AI summarize error:', err);
    } finally {
      setAiSummarizing(false);
    }
  };

  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleSave]);

  const words = wordCount(content);
  const chars = htmlToText(content).length;
  const readTime = Math.max(1, Math.ceil(words / 200));

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col h-full"
    >
      {/* Editor Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <motion.button
          whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          onClick={onClose}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm text-[var(--color-text-secondary)] hover:bg-white/5 transition-all"
        >
          <ChevronLeft size={16} /> Back
        </motion.button>
        <div className="flex items-center gap-2">
          {hasUnsaved && (
            <motion.span
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-[10px] text-amber-400 font-medium px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/15"
            >
              Unsaved changes
            </motion.span>
          )}
          <motion.button
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={summarizeWithAI}
            disabled={aiSummarizing || !htmlToText(content).trim()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm transition-all text-purple-400 bg-purple-500/10 hover:bg-purple-500/15 disabled:opacity-40"
            title="AI Summarize & Auto-tag"
          >
            {aiSummarizing ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            <span className="text-xs font-medium">AI</span>
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={() => setShowColors(!showColors)}
            className={`p-2 rounded-xl transition-all ${showColors ? 'bg-purple-500/15 text-purple-400' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] hover:bg-white/5'}`}
          >
            <Palette size={16} />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05, boxShadow: '0 0 20px rgba(147,51,234,0.25)' }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-white"
            style={{ background: 'var(--accent-color)' }}
          >
            <Save size={14} /> Save
          </motion.button>
        </div>
      </div>

      {/* Color Picker */}
      <AnimatePresence>
        {showColors && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-2.5 mb-3 px-1 flex-shrink-0"
          >
            <span className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider font-medium">Color</span>
            {NOTE_COLORS.map((c, i) => (
              <motion.button
                key={i}
                whileHover={{ scale: 1.2 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => { setColor(c); setHasUnsaved(true); }}
                className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-all ${color === c ? 'border-purple-400 shadow-md shadow-purple-500/20' : 'border-transparent hover:border-[var(--color-border-hover)]'}`}
                style={{ background: c || 'var(--color-surface-card)', borderColor: color === c ? undefined : (NOTE_BORDER_COLORS[i] || 'var(--color-border)') }}
              >
                {i === 0 && color === null && <div className="w-2 h-2 rounded-full bg-purple-400" />}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Summary Panel */}
      <AnimatePresence>
        {aiSummary && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-3 rounded-2xl border border-purple-500/15 bg-gradient-to-br from-purple-500/[0.06] to-violet-500/[0.02] p-4 flex-shrink-0"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Sparkles size={13} className="text-purple-400" />
                <span className="text-xs font-semibold text-purple-300">AI Summary</span>
              </div>
              <motion.button whileTap={{ scale: 0.8 }} onClick={() => setAiSummary(null)}
                className="p-1 rounded hover:bg-white/5 text-[var(--color-text-muted)]">
                <X size={11} />
              </motion.button>
            </div>
            <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed mb-2">{aiSummary.summary}</p>
            {aiSummary.keyPoints && aiSummary.keyPoints.length > 0 && (
              <div className="space-y-1 mb-2">
                <span className="text-[10px] uppercase tracking-widest text-[var(--color-text-muted)] font-semibold">Key Points</span>
                {aiSummary.keyPoints.map((point, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <div className="w-1 h-1 rounded-full bg-purple-400 mt-1.5 shrink-0" />
                    <span className="text-xs text-[var(--color-text-secondary)]">{point}</span>
                  </div>
                ))}
              </div>
            )}
            {aiSummary.actionItems && aiSummary.actionItems.length > 0 && (
              <div className="space-y-1.5 mb-2.5">
                <span className="text-[10px] uppercase tracking-widest text-[var(--color-text-muted)] font-semibold">Action Items</span>
                {aiSummary.actionItems.map((item, i) => (
                  <div key={i} className="flex items-start gap-2 rounded-lg border border-purple-500/10 bg-white/[0.02] px-2.5 py-2">
                    <div className="w-4 h-4 rounded-md border border-purple-400/40 flex items-center justify-center mt-0.5 shrink-0">
                      <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                    </div>
                    <span className="text-xs text-[var(--color-text-secondary)]">{item}</span>
                  </div>
                ))}
              </div>
            )}
            {aiSummary.tags && aiSummary.tags.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[9px] text-[var(--color-text-muted)]">Auto-tagged:</span>
                {aiSummary.tags.map(tag => (
                  <span key={tag} className="text-[9px] px-2 py-0.5 rounded-md bg-purple-500/15 text-purple-300 font-medium">{tag}</span>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Editor Body */}
      <div
        className="flex-1 rounded-2xl border border-[var(--color-border)] overflow-y-auto transition-colors duration-300"
        style={{ background: color || 'var(--color-surface-card)' }}
      >
        <div className="p-6">
          <input
            ref={titleRef}
            value={title}
            onChange={e => { setTitle(e.target.value); setHasUnsaved(true); }}
            placeholder="Note title..."
            className="w-full bg-transparent text-2xl font-bold text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]/40 outline-none mb-1 tracking-tight"
          />
          {/* Metadata line */}
          <div className="flex items-center gap-3 mb-5 text-[10px] text-[var(--color-text-muted)]">
            <span className="flex items-center gap-1"><FileText size={10} />{words} words</span>
            <span>{chars} chars</span>
            <span className="flex items-center gap-1"><Clock size={10} />~{readTime} min read</span>
          </div>
          <div className="w-full h-px bg-[var(--color-border)] mb-5" />
          <RichTextEditor
            content={content}
            onChange={handleContentChange}
            placeholder="Start writing your thoughts..."
          />
        </div>
      </div>

      {/* Tags Bar */}
      <div className="mt-3 flex items-center gap-2 flex-wrap flex-shrink-0">
        <Hash size={13} className="text-[var(--color-text-muted)]" />
        {tags.map((tag, i) => (
          <span key={tag} className={`flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-lg font-medium border ${TAG_COLORS[i % TAG_COLORS.length]}`}>
            {tag}
            <button onClick={() => removeTag(tag)} className="hover:opacity-70 ml-0.5"><X size={9} /></button>
          </span>
        ))}
        <div className="flex items-center">
          <input
            value={tagInput}
            onChange={e => setTagInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
            placeholder="Add tag..."
            className="bg-transparent text-[11px] text-[var(--color-text-muted)] placeholder:text-[var(--color-text-muted)]/40 outline-none w-20"
          />
        </div>
        <span className="ml-auto text-[10px] text-[var(--color-text-muted)] opacity-60">⌘S to save</span>
      </div>
    </motion.div>
  );
}

/* ── Note List Item (sidebar style) ── */
function NoteListItem({ note, index, isActive, onSelect, onDelete, onTogglePin }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ delay: index * 0.02 }}
      onClick={() => onSelect(note)}
      className={`group relative cursor-pointer rounded-xl p-3.5 transition-all duration-200 ${
        isActive
          ? 'bg-purple-500/10 border border-purple-500/20'
          : 'hover:bg-[var(--color-surface-hover)] border border-transparent'
      }`}
      style={note.color && !isActive ? { background: note.color } : undefined}
    >
      <div className="flex items-start gap-3">
        {/* Pin indicator */}
        {note.pinned && (
          <Pin size={10} className="text-purple-400 fill-purple-400 mt-1.5 flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <h4 className={`text-sm font-semibold line-clamp-1 mb-0.5 ${
            isActive ? 'text-purple-300' : 'text-[var(--color-text-primary)]'
          }`}>
            {note.title || 'Untitled'}
          </h4>
          <p className="text-xs text-[var(--color-text-muted)] line-clamp-2 leading-relaxed mb-1.5">
            {htmlToText(note.content) || 'Empty note'}
          </p>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-[var(--color-text-muted)] opacity-60">
              {formatRelativeTime(note.updatedAt || note.createdAt)}
            </span>
            {(note.tags || []).length > 0 && (
              <div className="flex gap-1">
                {note.tags.slice(0, 2).map((tag, ti) => (
                  <span key={tag} className={`text-[9px] px-1.5 py-0.5 rounded-md font-medium ${TAG_COLORS[ti % TAG_COLORS.length]}`}>
                    {tag}
                  </span>
                ))}
                {note.tags.length > 2 && (
                  <span className="text-[9px] px-1 text-[var(--color-text-muted)]">
                    +{note.tags.length - 2}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action buttons on hover */}
      <div className="absolute top-2 right-2 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={e => { e.stopPropagation(); onTogglePin(note.id); }}
          className="p-1 rounded-lg hover:bg-white/10 text-[var(--color-text-muted)] hover:text-purple-400 transition-colors"
          title={note.pinned ? 'Unpin' : 'Pin'}
        >
          {note.pinned ? <PinOff size={11} /> : <Pin size={11} />}
        </button>
        <button
          onClick={e => { e.stopPropagation(); onDelete(note.id); }}
          className="p-1 rounded-lg hover:bg-red-500/10 text-[var(--color-text-muted)] hover:text-red-400 transition-colors"
          title="Delete"
        >
          <Trash2 size={11} />
        </button>
      </div>
    </motion.div>
  );
}

/* ── Main Notes Page ── */
export default function NotesPage() {
  const { notes, addNote, updateNote, deleteNote, togglePin, duplicateNote, allTags } = useNotes();
  const [editingNote, setEditingNote] = useState(null);
  const [isNewNote, setIsNewNote] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTag, setFilterTag] = useState('all');
  const [sortBy, setSortBy] = useState('updated');
  const [showSort, setShowSort] = useState(false);
  const searchRef = useRef(null);

  // Filter notes
  const filtered = useMemo(() => {
    let result = notes;
    if (filterTag !== 'all') {
      result = result.filter(n => (n.tags || []).includes(filterTag));
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(n =>
        n.title.toLowerCase().includes(q) ||
        htmlToText(n.content || '').toLowerCase().includes(q) ||
        (n.tags || []).some(t => t.includes(q))
      );
    }
    // Sort (pinned always first, handled by context, then by sortBy)
    if (sortBy === 'alpha') {
      result = [...result].sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        return a.title.localeCompare(b.title);
      });
    } else if (sortBy === 'created') {
      result = [...result].sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
    }
    // 'updated' is the default sort from context
    return result;
  }, [notes, filterTag, searchQuery, sortBy]);

  const openNew = () => {
    setEditingNote({ title: '', content: '', tags: [], color: null });
    setIsNewNote(true);
  };

  const openEdit = (note) => {
    setEditingNote(note);
    setIsNewNote(false);
  };

  const handleSave = (data) => {
    if (isNewNote) {
      addNote(data);
    } else {
      updateNote(editingNote.id, data);
    }
    setEditingNote(null);
    setIsNewNote(false);
  };

  const closeEditor = () => {
    setEditingNote(null);
    setIsNewNote(false);
  };

  // Keyboard shortcut: Cmd+N to create new note
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        openNew();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  const pinnedNotes = filtered.filter(n => n.pinned);
  const unpinnedNotes = filtered.filter(n => !n.pinned);
  const totalWords = notes.reduce((sum, n) => sum + wordCount(n.content), 0);

  // If editor is open — split view
  if (editingNote) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex gap-0 h-[calc(100vh-48px)]"
      >
        {/* Narrow note list sidebar */}
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-72 flex-shrink-0 border-r border-[var(--color-border)] pr-3 overflow-y-auto no-scrollbar hidden lg:block"
        >
          <div className="space-y-1 py-1">
            {filtered.map((note) => (
              <NoteListItem
                key={note.id}
                note={note}
                index={0}
                isActive={editingNote?.id === note.id}
                onSelect={openEdit}
                onDelete={deleteNote}
                onTogglePin={togglePin}
              />
            ))}
          </div>
        </motion.div>

        {/* Editor */}
        <div className="flex-1 pl-4 lg:pl-6">
          <AnimatePresence mode="wait">
            <NoteEditor
              key={editingNote.id || 'new'}
              note={editingNote}
              onSave={handleSave}
              onClose={closeEditor}
              isNew={isNewNote}
            />
          </AnimatePresence>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)] tracking-tight">Notes</h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            {notes.length} note{notes.length !== 1 ? 's' : ''}
            <span className="text-[var(--color-text-muted)]"> · {totalWords.toLocaleString()} words</span>
            {pinnedNotes.length > 0 && <span className="text-purple-400"> · {pinnedNotes.length} pinned</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <motion.button
            whileHover={{ scale: 1.05, boxShadow: '0 0 20px rgba(147,51,234,0.3)' }}
            whileTap={{ scale: 0.95 }}
            onClick={openNew}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium text-white shadow-lg"
            style={{ background: 'var(--accent-color)' }}
          >
            <Plus size={16} /> New Note
          </motion.button>
        </div>
      </div>

      {/* Search + Sort Bar */}
      <div className="flex items-center gap-3">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="relative flex-1"
        >
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
          <input
            ref={searchRef}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search notes... (⌘F)"
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-card)] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] outline-none focus:border-purple-500/30 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
            >
              <X size={14} />
            </button>
          )}
        </motion.div>

        {/* Sort dropdown */}
        <div className="relative">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowSort(!showSort)}
            className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium border transition-all ${
              showSort ? 'border-purple-500/30 bg-purple-500/10 text-purple-400' : 'border-[var(--color-border)] bg-[var(--color-surface-card)] text-[var(--color-text-secondary)]'
            }`}
          >
            <ArrowUpDown size={14} />
            <span className="hidden sm:inline">{SORT_OPTIONS.find(s => s.id === sortBy)?.label}</span>
          </motion.button>
          <AnimatePresence>
            {showSort && (
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.95 }}
                className="absolute right-0 top-12 z-20 rounded-xl bg-[rgba(16,16,16,0.95)] backdrop-blur-2xl border border-[rgba(255,255,255,0.1)] p-1.5 shadow-2xl min-w-[160px]"
              >
                {SORT_OPTIONS.map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => { setSortBy(opt.id); setShowSort(false); }}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm transition-all ${
                      sortBy === opt.id ? 'text-purple-400 bg-purple-500/10' : 'text-[var(--color-text-secondary)] hover:bg-white/5'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Tag Filters */}
      {allTags.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex items-center gap-2 flex-wrap"
        >
          <Tag size={13} className="text-[var(--color-text-muted)]" />
          <button
            onClick={() => setFilterTag('all')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${filterTag === 'all' ? 'text-white' : 'bg-white/5 text-[var(--color-text-secondary)] hover:bg-white/10'}`}
            style={filterTag === 'all' ? { background: 'var(--accent-color)' } : {}}
          >
            All
          </button>
          {allTags.map((tag, i) => (
            <button
              key={tag}
              onClick={() => setFilterTag(filterTag === tag ? 'all' : tag)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${filterTag === tag ? 'text-white' : `${TAG_COLORS[i % TAG_COLORS.length]} hover:opacity-80`}`}
              style={filterTag === tag ? { background: 'var(--accent-color)' } : {}}
            >
              {tag}
            </button>
          ))}
        </motion.div>
      )}

      {/* Pinned Notes Section */}
      {pinnedNotes.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Pin size={12} className="text-purple-400 fill-purple-400" />
            <span className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">Pinned</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <AnimatePresence mode="popLayout">
              {pinnedNotes.map((note, i) => (
                <NoteCard
                  key={note.id}
                  note={note}
                  index={i}
                  onEdit={openEdit}
                  onDelete={deleteNote}
                  onTogglePin={togglePin}
                  onDuplicate={duplicateNote}
                />
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* All Notes Grid */}
      {unpinnedNotes.length > 0 && (
        <div>
          {pinnedNotes.length > 0 && (
            <div className="flex items-center gap-2 mb-3">
              <FileText size={12} className="text-[var(--color-text-muted)]" />
              <span className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">All Notes</span>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <AnimatePresence mode="popLayout">
              {unpinnedNotes.map((note, i) => (
                <NoteCard
                  key={note.id}
                  note={note}
                  index={i}
                  onEdit={openEdit}
                  onDelete={deleteNote}
                  onTogglePin={togglePin}
                  onDuplicate={duplicateNote}
                />
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Empty State */}
      {filtered.length === 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center py-20"
        >
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            className="w-16 h-16 rounded-2xl bg-purple-500/10 flex items-center justify-center mb-4"
          >
            <StickyNote size={28} className="text-purple-400" />
          </motion.div>
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-1">
            {searchQuery ? 'No notes found' : 'No notes yet'}
          </h3>
          <p className="text-xs text-[var(--color-text-muted)] mb-5 text-center max-w-[260px]">
            {searchQuery
              ? 'Try a different search term or clear the filter.'
              : 'Start capturing your ideas, thoughts, and plans.'}
          </p>
          {!searchQuery && (
            <motion.button
              whileHover={{ scale: 1.05, boxShadow: '0 0 20px rgba(147,51,234,0.3)' }}
              whileTap={{ scale: 0.95 }}
              onClick={openNew}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-medium text-white bg-purple-500 shadow-lg shadow-purple-500/20"
            >
              <Plus size={14} /> Create your first note
            </motion.button>
          )}
          <p className="text-[10px] text-[var(--color-text-muted)] mt-3 opacity-50">⌘N to create a new note</p>
        </motion.div>
      )}
    </motion.div>
  );
}

/* ── Note Card (grid view) ── */
function NoteCard({ note, index, onEdit, onDelete, onTogglePin, onDuplicate }) {
  const words = wordCount(note.content);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ delay: index * 0.03 }}
      className="group relative"
    >
      <motion.div
        whileHover={{ y: -4, boxShadow: '0 16px 48px rgba(0,0,0,0.2), 0 0 0 1px rgba(147,51,234,0.1)' }}
        onClick={() => onEdit(note)}
        className="cursor-pointer rounded-xl border border-[var(--color-border)] p-4 h-full transition-all duration-300 hover:border-purple-500/20"
        style={{ background: note.color || 'var(--color-surface-card)' }}
      >
        {/* Pin indicator */}
        {note.pinned && (
          <div className="absolute top-3 right-3">
            <Pin size={11} className="text-purple-400 fill-purple-400" />
          </div>
        )}

        <h3 className="text-sm font-semibold text-[var(--color-text-primary)] line-clamp-1 mb-1.5 pr-6">
          {note.title}
        </h3>

        <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed line-clamp-3 mb-3">
          {htmlToText(note.content) || 'Empty note'}
        </p>

        {(note.tags || []).length > 0 && (
          <div className="flex gap-1.5 flex-wrap mb-2.5">
            {note.tags.slice(0, 3).map((tag, ti) => (
              <span key={tag} className={`text-[9px] px-1.5 py-0.5 rounded-md font-medium ${TAG_COLORS[ti % TAG_COLORS.length]}`}>
                {tag}
              </span>
            ))}
            {note.tags.length > 3 && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-white/5 text-[var(--color-text-muted)]">
                +{note.tags.length - 3}
              </span>
            )}
          </div>
        )}

        <div className="flex items-center gap-2 text-[10px] text-[var(--color-text-muted)]">
          <span>{formatRelativeTime(note.updatedAt || note.createdAt)}</span>
          <span className="opacity-40">·</span>
          <span>{words} word{words !== 1 ? 's' : ''}</span>
        </div>

        {/* Action buttons */}
        <div className="absolute bottom-3 right-3 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={e => { e.stopPropagation(); onTogglePin(note.id); }}
            className="p-1.5 rounded-lg hover:bg-white/10 text-[var(--color-text-muted)] hover:text-purple-400 transition-colors"
            title={note.pinned ? 'Unpin' : 'Pin'}
          >
            {note.pinned ? <PinOff size={12} /> : <Pin size={12} />}
          </button>
          <button
            onClick={e => { e.stopPropagation(); onDuplicate(note.id); }}
            className="p-1.5 rounded-lg hover:bg-white/10 text-[var(--color-text-muted)] hover:text-blue-400 transition-colors"
            title="Duplicate"
          >
            <Copy size={12} />
          </button>
          <button
            onClick={e => { e.stopPropagation(); onDelete(note.id); }}
            className="p-1.5 rounded-lg hover:bg-red-500/10 text-[var(--color-text-muted)] hover:text-red-400 transition-colors"
            title="Delete"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
