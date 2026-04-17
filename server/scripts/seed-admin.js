// One-off: wipe all users (cascades to all their data) and create the admin.
// Usage: node scripts/seed-admin.js
const bcrypt = require('bcryptjs');
const db = require('../db');

const ADMIN_EMAIL = 'darsh.sharma2905@gmail.com';
const ADMIN_PASSWORD = 'Darsh1002';
const ADMIN_NAME = 'Darsh Sharma';

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

const before = db.prepare('SELECT COUNT(*) AS n FROM users').get().n;
console.log(`Wiping ${before} existing user(s) and all related data…`);

db.prepare('DELETE FROM users').run(); // ON DELETE CASCADE clears everything

const id = genId();
const hashed = bcrypt.hashSync(ADMIN_PASSWORD, 10);

db.prepare(
  "INSERT INTO users (id, name, email, password, role, status, login_count) VALUES (?, ?, ?, ?, 'admin', 'active', 0)"
).run(id, ADMIN_NAME, ADMIN_EMAIL.toLowerCase(), hashed);

db.prepare(
  'INSERT INTO accounts (id, user_id, name, type, balance, color, icon, is_default) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
).run(genId(), id, 'Wallet', 'wallet', 0, '#9333ea', 'wallet', 1);

const after = db.prepare('SELECT id, name, email, role, status FROM users').all();
console.log('Done. Users now:', after);
