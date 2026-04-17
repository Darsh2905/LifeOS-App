const express = require('express');
const db = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

// GET /api/books
router.get('/', authenticate, (req, res) => {
  const { status } = req.query;
  let books;
  if (status) {
    books = db.prepare('SELECT * FROM books WHERE user_id = ? AND status = ? ORDER BY created_at DESC').all(req.userId, status);
  } else {
    books = db.prepare('SELECT * FROM books WHERE user_id = ? ORDER BY created_at DESC').all(req.userId);
  }
  res.json(books);
});

// POST /api/books
router.post('/', authenticate, (req, res) => {
  const { title, author, totalPages, status, notes } = req.body;
  if (!title) return res.status(400).json({ error: 'Title is required.' });

  const id = genId();
  const s = status || 'to_read';
  const startedAt = s === 'reading' ? new Date().toISOString() : null;

  db.prepare('INSERT INTO books (id, user_id, title, author, total_pages, status, notes, started_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .run(id, req.userId, title, author || null, totalPages || null, s, notes || null, startedAt);

  res.status(201).json({ id, title, author, total_pages: totalPages, status: s, current_page: 0, notes, started_at: startedAt });
});

// PUT /api/books/:id
router.put('/:id', authenticate, (req, res) => {
  const book = db.prepare('SELECT * FROM books WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!book) return res.status(404).json({ error: 'Book not found.' });

  const { title, author, status, currentPage, totalPages, rating, notes } = req.body;

  // Auto-set dates based on status changes
  let startedAt = book.started_at;
  let finishedAt = book.finished_at;
  if (status === 'reading' && book.status !== 'reading' && !startedAt) {
    startedAt = new Date().toISOString();
  }
  if (status === 'finished' && book.status !== 'finished') {
    finishedAt = new Date().toISOString();
  }

  db.prepare(
    'UPDATE books SET title = ?, author = ?, status = ?, current_page = ?, total_pages = ?, rating = ?, notes = ?, started_at = ?, finished_at = ? WHERE id = ?'
  ).run(
    title ?? book.title,
    author ?? book.author,
    status ?? book.status,
    currentPage ?? book.current_page,
    totalPages ?? book.total_pages,
    rating ?? book.rating,
    notes ?? book.notes,
    startedAt,
    finishedAt,
    book.id
  );

  res.json({
    ...book,
    title: title ?? book.title,
    author: author ?? book.author,
    status: status ?? book.status,
    current_page: currentPage ?? book.current_page,
    total_pages: totalPages ?? book.total_pages,
    rating: rating ?? book.rating,
    notes: notes ?? book.notes,
    started_at: startedAt,
    finished_at: finishedAt,
  });
});

// DELETE /api/books/:id
router.delete('/:id', authenticate, (req, res) => {
  const result = db.prepare('DELETE FROM books WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
  if (!result.changes) return res.status(404).json({ error: 'Book not found.' });
  res.json({ success: true });
});

module.exports = router;
