const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { JWT_SECRET } = require('../middleware/auth');

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI;

// Scopes:
// - openid, email, profile → identity for Sign in with Google
// - calendar.events → read/write events on the user's calendars
const SCOPES = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.readonly',
];

function isConfigured() {
  return Boolean(CLIENT_ID && CLIENT_SECRET && REDIRECT_URI);
}

function createOAuthClient() {
  if (!isConfigured()) {
    throw new Error('Google OAuth is not configured on the server.');
  }
  return new OAuth2Client(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
}

// Short-lived signed state for CSRF protection. `purpose` distinguishes
// "connect an existing logged-in user" from "sign in with Google from scratch".
function signState({ purpose, userId = null, nonce }) {
  return jwt.sign({ purpose, userId, nonce }, JWT_SECRET, { expiresIn: '10m' });
}

function verifyState(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

function upsertTokens(userId, tokenPayload, profile) {
  const { access_token, refresh_token, expiry_date, scope } = tokenPayload;
  const existing = db.prepare('SELECT refresh_token FROM google_tokens WHERE user_id = ?').get(userId);
  // Google returns refresh_token only on first consent. Preserve the old one on re-auth.
  const refresh = refresh_token || existing?.refresh_token || null;
  db.prepare(`
    INSERT INTO google_tokens (user_id, google_sub, google_email, access_token, refresh_token, expires_at, scope, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(user_id) DO UPDATE SET
      google_sub = excluded.google_sub,
      google_email = excluded.google_email,
      access_token = excluded.access_token,
      refresh_token = COALESCE(excluded.refresh_token, google_tokens.refresh_token),
      expires_at = excluded.expires_at,
      scope = excluded.scope,
      updated_at = datetime('now')
  `).run(
    userId,
    profile.sub,
    profile.email || null,
    access_token,
    refresh,
    Number(expiry_date) || Date.now() + 3600 * 1000,
    scope || SCOPES.join(' '),
  );
}

// Returns a configured OAuth2Client with a valid access token, refreshing if needed.
async function getClientForUser(userId) {
  const row = db.prepare('SELECT * FROM google_tokens WHERE user_id = ?').get(userId);
  if (!row) return null;

  const client = createOAuthClient();
  client.setCredentials({
    access_token: row.access_token,
    refresh_token: row.refresh_token || undefined,
    expiry_date: row.expires_at,
    scope: row.scope || undefined,
  });

  // Refresh if expired (or within 60s of expiry)
  if (row.expires_at - 60 * 1000 < Date.now()) {
    if (!row.refresh_token) {
      throw new Error('Google session expired. Please reconnect your account.');
    }
    const { credentials } = await client.refreshAccessToken();
    db.prepare(`
      UPDATE google_tokens SET access_token = ?, expires_at = ?, updated_at = datetime('now')
      WHERE user_id = ?
    `).run(credentials.access_token, credentials.expiry_date || Date.now() + 3600 * 1000, userId);
    client.setCredentials({ ...client.credentials, ...credentials });
  }
  return client;
}

async function disconnect(userId) {
  const row = db.prepare('SELECT access_token FROM google_tokens WHERE user_id = ?').get(userId);
  if (row?.access_token) {
    try {
      await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(row.access_token)}`, {
        method: 'POST',
      });
    } catch { /* best-effort */ }
  }
  db.prepare('DELETE FROM google_tokens WHERE user_id = ?').run(userId);
}

async function fetchUserInfo(client) {
  const res = await client.request({
    url: 'https://openidconnect.googleapis.com/v1/userinfo',
  });
  return res.data; // { sub, email, name, picture, ... }
}

module.exports = {
  isConfigured,
  createOAuthClient,
  SCOPES,
  signState,
  verifyState,
  upsertTokens,
  getClientForUser,
  disconnect,
  fetchUserInfo,
};
