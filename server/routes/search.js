const express = require('express');
const db = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// GET /api/search?q=keyword&type=all&limit=20
router.get('/', authenticate, (req, res) => {
  const { q, type = 'all', limit = 20 } = req.query;
  if (!q || q.length < 2) return res.json([]);

  const pattern = `%${q}%`;
  const lim = Math.min(parseInt(limit) || 20, 50);
  const results = [];

  if (type === 'all' || type === 'task') {
    const tasks = db.prepare(
      "SELECT id, title, status, priority, category, due_date, 'task' as entity_type FROM tasks WHERE user_id = ? AND title LIKE ? LIMIT ?"
    ).all(req.userId, pattern, lim);
    results.push(...tasks);
  }

  if (type === 'all' || type === 'note') {
    const notes = db.prepare(
      "SELECT id, title, substr(content, 1, 200) as snippet, tags, pinned, 'note' as entity_type FROM notes WHERE user_id = ? AND (title LIKE ? OR content LIKE ?) LIMIT ?"
    ).all(req.userId, pattern, pattern, lim);
    results.push(...notes);
  }

  if (type === 'all' || type === 'journal') {
    const journal = db.prepare(
      "SELECT id, substr(text, 1, 200) as snippet, mood, date, 'journal' as entity_type FROM journal_entries WHERE user_id = ? AND text LIKE ? LIMIT ?"
    ).all(req.userId, pattern, lim);
    results.push(...journal);
  }

  if (type === 'all' || type === 'transaction') {
    const txns = db.prepare(
      "SELECT id, description as title, category, amount, date, type, 'transaction' as entity_type FROM transactions WHERE user_id = ? AND (description LIKE ? OR category LIKE ?) LIMIT ?"
    ).all(req.userId, pattern, pattern, lim);
    results.push(...txns);
  }

  if (type === 'all' || type === 'book') {
    const books = db.prepare(
      "SELECT id, title, author, status, 'book' as entity_type FROM books WHERE user_id = ? AND (title LIKE ? OR author LIKE ?) LIMIT ?"
    ).all(req.userId, pattern, pattern, lim);
    results.push(...books);
  }

  res.json(results.slice(0, lim));
});

module.exports = router;
