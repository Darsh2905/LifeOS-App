const express = require('express');
const db = require('../db');
const { authenticate } = require('../middleware/auth');
const { checkRate } = require('../services/claude');
const { convertCapture } = require('../services/localIntelligence');

const router = express.Router();

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

// POST /api/capture — quick capture
router.post('/', authenticate, (req, res) => {
  const { content, type } = req.body;
  if (!content) return res.status(400).json({ error: 'Content is required.' });

  const id = genId();
  db.prepare('INSERT INTO quick_captures (id, user_id, content, type) VALUES (?, ?, ?, ?)')
    .run(id, req.userId, content, type || 'note');

  res.status(201).json({ id, content, type: type || 'note', processed: 0 });
});

// GET /api/capture
router.get('/', authenticate, (req, res) => {
  const unprocessed = req.query.unprocessed === 'true';
  const captures = unprocessed
    ? db.prepare('SELECT * FROM quick_captures WHERE user_id = ? AND processed = 0 ORDER BY created_at DESC').all(req.userId)
    : db.prepare('SELECT * FROM quick_captures WHERE user_id = ? ORDER BY created_at DESC LIMIT 50').all(req.userId);

  res.json(captures);
});

// PUT /api/capture/:id
router.put('/:id', authenticate, (req, res) => {
  const capture = db.prepare('SELECT * FROM quick_captures WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!capture) return res.status(404).json({ error: 'Capture not found.' });

  const { content, type, processed } = req.body;
  db.prepare('UPDATE quick_captures SET content = ?, type = ?, processed = ? WHERE id = ?')
    .run(content ?? capture.content, type ?? capture.type, processed ?? capture.processed, capture.id);

  res.json({ ...capture, content: content ?? capture.content, type: type ?? capture.type, processed: processed ?? capture.processed });
});

// DELETE /api/capture/:id
router.delete('/:id', authenticate, (req, res) => {
  const result = db.prepare('DELETE FROM quick_captures WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
  if (!result.changes) return res.status(404).json({ error: 'Capture not found.' });
  res.json({ success: true });
});

// POST /api/capture/:id/convert — local intelligence-assisted conversion
router.post('/:id/convert', authenticate, async (req, res) => {
  try {
    const capture = db.prepare('SELECT * FROM quick_captures WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
    if (!capture) return res.status(404).json({ error: 'Capture not found.' });
    if (!checkRate(req.userId)) return res.status(429).json({ error: 'Rate limit exceeded.' });
    const result = convertCapture(capture.content);

    // Create the entity
    let created;
    if (result.type === 'task' && result.task) {
      const id = genId();
      db.prepare('INSERT INTO tasks (id, user_id, title, priority, category) VALUES (?, ?, ?, ?, ?)')
        .run(id, req.userId, result.task.title, result.task.priority || 'medium', result.task.category || 'Inbox');
      created = { type: 'task', id, ...result.task };
    } else if (result.note) {
      const id = genId();
      db.prepare('INSERT INTO notes (id, user_id, title, content, tags) VALUES (?, ?, ?, ?, ?)')
        .run(id, req.userId, result.note.title, result.note.content, JSON.stringify(result.note.tags || []));
      created = { type: 'note', id, ...result.note };
    }

    // Mark as processed
    db.prepare('UPDATE quick_captures SET processed = 1 WHERE id = ?').run(capture.id);

    res.json({ converted: created, capture });
  } catch (err) {
    console.error('Capture convert error:', err.message);
    res.status(500).json({ error: 'Failed to convert capture.' });
  }
});

module.exports = router;
