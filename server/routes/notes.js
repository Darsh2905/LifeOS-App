const express = require('express');
const db = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function rowToNote(r) {
  return {
    id: r.id,
    title: r.title,
    content: r.content,
    tags: JSON.parse(r.tags || '[]'),
    color: r.color,
    pinned: !!r.pinned,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

// GET /api/notes
router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM notes WHERE user_id = ? ORDER BY pinned DESC, updated_at DESC').all(req.userId);
  res.json(rows.map(rowToNote));
});

// POST /api/notes
router.post('/', (req, res) => {
  const { title, content, tags, color, pinned } = req.body;
  const id = genId();
  const now = new Date().toISOString();
  db.prepare(
    'INSERT INTO notes (id, user_id, title, content, tags, color, pinned, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(id, req.userId, title || 'Untitled', content || '', JSON.stringify(tags || []), color || null, pinned ? 1 : 0, now, now);

  const row = db.prepare('SELECT * FROM notes WHERE id = ?').get(id);
  res.json(rowToNote(row));
});

// PUT /api/notes/:id
router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM notes WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!existing) return res.status(404).json({ error: 'Note not found' });

  const { title, content, tags, color, pinned } = req.body;
  const now = new Date().toISOString();
  db.prepare(
    'UPDATE notes SET title=?, content=?, tags=?, color=?, pinned=?, updated_at=? WHERE id=? AND user_id=?'
  ).run(
    title !== undefined ? title : existing.title,
    content !== undefined ? content : existing.content,
    tags !== undefined ? JSON.stringify(tags) : existing.tags,
    color !== undefined ? color : existing.color,
    pinned !== undefined ? (pinned ? 1 : 0) : existing.pinned,
    now, req.params.id, req.userId
  );

  const row = db.prepare('SELECT * FROM notes WHERE id = ?').get(req.params.id);
  res.json(rowToNote(row));
});

// POST /api/notes/:id/duplicate
router.post('/:id/duplicate', (req, res) => {
  const existing = db.prepare('SELECT * FROM notes WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!existing) return res.status(404).json({ error: 'Note not found' });

  const id = genId();
  const now = new Date().toISOString();
  db.prepare(
    'INSERT INTO notes (id, user_id, title, content, tags, color, pinned, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(id, req.userId, `${existing.title} (copy)`, existing.content, existing.tags, existing.color, 0, now, now);

  const row = db.prepare('SELECT * FROM notes WHERE id = ?').get(id);
  res.json(rowToNote(row));
});

// DELETE /api/notes/:id
router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM notes WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
  res.json({ success: true });
});

module.exports = router;
