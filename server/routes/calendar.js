const express = require('express');
const crypto = require('crypto');
const db = require('../db');
const { authenticate, generateToken } = require('../middleware/auth');
const google = require('../services/google');
const taskSync = require('../services/taskSync');

const router = express.Router();

const APP_URL = process.env.APP_URL || 'http://localhost:3000';

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function toUserPayload(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role || 'user',
    status: user.status || 'active',
    emailVerified: !!user.email_verified,
    avatar: (user.name || '?').charAt(0).toUpperCase(),
    avatarUrl: user.avatar_url || null,
  };
}

// ── GET /api/calendar/status  (auth) ────────────────────────────────────────
// Returns the current user's Google connection state.
router.get('/status', authenticate, (req, res) => {
  const row = db.prepare(
    'SELECT google_email, connected_at, updated_at FROM google_tokens WHERE user_id = ?'
  ).get(req.userId);
  if (!row) return res.json({ connected: false, configured: google.isConfigured() });
  res.json({
    connected: true,
    configured: true,
    email: row.google_email,
    connectedAt: row.connected_at,
    updatedAt: row.updated_at,
  });
});

// ── GET /api/calendar/connect  (auth) ───────────────────────────────────────
// Redirects the browser to Google's consent screen. Uses a signed state
// token so the callback can tie the grant back to this user.
router.get('/connect', authenticate, (req, res) => {
  if (!google.isConfigured()) {
    return res.status(503).json({ error: 'Google OAuth is not configured on the server.' });
  }
  const client = google.createOAuthClient();
  const nonce = crypto.randomBytes(12).toString('hex');
  const state = google.signState({ purpose: 'connect', userId: req.userId, nonce });
  const url = client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',              // force refresh_token on every consent
    include_granted_scopes: true,
    scope: google.SCOPES,
    state,
  });
  res.json({ url });
});

// ── GET /api/calendar/signin  (public) ──────────────────────────────────────
// Start a "Sign in with Google" flow (no existing LifeOS session required).
router.get('/signin', (_req, res) => {
  if (!google.isConfigured()) {
    return res.status(503).send('Google sign-in is not configured.');
  }
  const client = google.createOAuthClient();
  const nonce = crypto.randomBytes(12).toString('hex');
  const state = google.signState({ purpose: 'signin', nonce });
  const url = client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: true,
    scope: google.SCOPES,
    state,
  });
  res.redirect(url);
});

// ── GET /api/calendar/callback  (public) ────────────────────────────────────
// Google redirects here with ?code= and ?state=. We verify state, exchange
// code for tokens, and either bind to an existing user (connect) or create /
// link a user (signin). In both cases we issue a LifeOS JWT and redirect the
// browser back to the SPA with the token in the URL fragment.
router.get('/callback', async (req, res) => {
  const { code, state: stateToken, error } = req.query;
  const bounceBack = (params) => {
    const qs = new URLSearchParams(params).toString();
    return res.redirect(`${APP_URL}/?${qs}`);
  };
  if (error) return bounceBack({ calendar: 'error', reason: String(error) });
  if (!code || !stateToken) return bounceBack({ calendar: 'error', reason: 'missing_code' });

  const state = google.verifyState(String(stateToken));
  if (!state) return bounceBack({ calendar: 'error', reason: 'invalid_state' });

  try {
    const client = google.createOAuthClient();
    const { tokens } = await client.getToken(String(code));
    client.setCredentials(tokens);

    const profile = await google.fetchUserInfo(client);
    if (!profile?.sub) throw new Error('Google profile lookup failed.');

    let userId;
    let createdNew = false;

    if (state.purpose === 'connect' && state.userId) {
      userId = state.userId;
      // Also record the Google sub on the users row for convenience.
      db.prepare('UPDATE users SET google_sub = ?, avatar_url = COALESCE(avatar_url, ?) WHERE id = ?')
        .run(profile.sub, profile.picture || null, userId);
    } else {
      // Sign in / sign up flow
      let user =
        db.prepare('SELECT * FROM users WHERE google_sub = ?').get(profile.sub) ||
        db.prepare('SELECT * FROM users WHERE email = ?').get((profile.email || '').toLowerCase());

      if (!user) {
        userId = genId();
        const adminEmail = (process.env.ADMIN_EMAIL || '').toLowerCase().trim();
        const role = adminEmail && profile.email?.toLowerCase() === adminEmail ? 'admin' : 'user';
        db.prepare(`
          INSERT INTO users
            (id, name, email, password, role, status, email_verified, google_sub, avatar_url,
             last_login_at, last_login_ip, login_count)
          VALUES (?, ?, ?, '', ?, 'active', 1, ?, ?, datetime('now'), ?, 1)
        `).run(
          userId,
          profile.name || profile.email?.split('@')[0] || 'User',
          (profile.email || '').toLowerCase(),
          role,
          profile.sub,
          profile.picture || null,
          (req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || '').trim() || null,
        );
        db.prepare('INSERT INTO accounts (id, user_id, name, type, balance, color, icon, is_default) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
          .run(genId(), userId, 'Wallet', 'wallet', 0, '#9333ea', 'wallet', 1);
        createdNew = true;
      } else {
        userId = user.id;
        if (user.status === 'suspended') {
          return bounceBack({ calendar: 'error', reason: 'account_suspended' });
        }
        // Link Google sub and pull avatar on first Google login
        db.prepare('UPDATE users SET google_sub = COALESCE(google_sub, ?), avatar_url = COALESCE(avatar_url, ?), last_login_at = datetime(\'now\'), login_count = COALESCE(login_count, 0) + 1 WHERE id = ?')
          .run(profile.sub, profile.picture || null, userId);
      }
    }

    google.upsertTokens(userId, tokens, profile);

    // Fire-and-forget: push any existing dated tasks onto the new calendar.
    taskSync.backfillUserTasks(userId).catch(() => {});

    const jwtToken = generateToken(userId);
    bounceBack({
      calendar: 'connected',
      token: jwtToken,
      new: createdNew ? '1' : '0',
    });
  } catch (e) {
    console.error('[calendar/callback]', e);
    bounceBack({ calendar: 'error', reason: 'exchange_failed' });
  }
});

// ── POST /api/calendar/disconnect  (auth) ───────────────────────────────────
router.post('/disconnect', authenticate, async (req, res) => {
  await google.disconnect(req.userId);
  // Also remove task→event mappings; we won't try to delete the Google events
  // since their tokens are already revoked.
  db.prepare('DELETE FROM task_calendar_events WHERE user_id = ?').run(req.userId);
  res.json({ success: true });
});

// ── GET /api/calendar/events?start=&end=&calendarId=  (auth) ────────────────
router.get('/events', authenticate, async (req, res) => {
  try {
    const client = await google.getClientForUser(req.userId);
    if (!client) return res.status(404).json({ error: 'Calendar not connected.' });

    const now = new Date();
    const defaultStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const defaultEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 30).toISOString();
    const timeMin = req.query.start ? new Date(String(req.query.start)).toISOString() : defaultStart;
    const timeMax = req.query.end ? new Date(String(req.query.end)).toISOString() : defaultEnd;
    const calendarId = req.query.calendarId ? String(req.query.calendarId) : 'primary';

    const url = new URL(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`);
    url.searchParams.set('timeMin', timeMin);
    url.searchParams.set('timeMax', timeMax);
    url.searchParams.set('singleEvents', 'true');
    url.searchParams.set('orderBy', 'startTime');
    url.searchParams.set('maxResults', '250');

    const response = await client.request({ url: url.toString() });
    const items = response.data.items || [];
    const events = items.map(ev => ({
      id: ev.id,
      calendarId,
      summary: ev.summary || '(No title)',
      description: ev.description || null,
      location: ev.location || null,
      start: ev.start?.dateTime || ev.start?.date || null,
      end: ev.end?.dateTime || ev.end?.date || null,
      allDay: Boolean(ev.start?.date && !ev.start?.dateTime),
      htmlLink: ev.htmlLink || null,
      status: ev.status,
      colorId: ev.colorId || null,
      source: ev.source || null,
      updated: ev.updated,
    }));
    res.json({ events });
  } catch (e) {
    console.error('[calendar/events]', e.message);
    res.status(500).json({ error: e.message || 'Failed to load events.' });
  }
});

// ── GET /api/calendar/calendars  (auth) ─────────────────────────────────────
router.get('/calendars', authenticate, async (req, res) => {
  try {
    const client = await google.getClientForUser(req.userId);
    if (!client) return res.status(404).json({ error: 'Calendar not connected.' });
    const response = await client.request({
      url: 'https://www.googleapis.com/calendar/v3/users/me/calendarList',
    });
    const items = (response.data.items || []).map(c => ({
      id: c.id,
      summary: c.summary,
      primary: !!c.primary,
      backgroundColor: c.backgroundColor,
      foregroundColor: c.foregroundColor,
      accessRole: c.accessRole,
    }));
    res.json({ calendars: items });
  } catch (e) {
    console.error('[calendar/calendars]', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── POST /api/calendar/events  (auth) ───────────────────────────────────────
router.post('/events', authenticate, async (req, res) => {
  try {
    const client = await google.getClientForUser(req.userId);
    if (!client) return res.status(404).json({ error: 'Calendar not connected.' });

    const { summary, description, start, end, allDay, location, calendarId = 'primary' } = req.body || {};
    if (!summary || !start) return res.status(400).json({ error: 'summary and start are required.' });

    const body = {
      summary,
      description: description || undefined,
      location: location || undefined,
      start: allDay ? { date: String(start).slice(0, 10) } : { dateTime: new Date(start).toISOString() },
      end: allDay
        ? { date: String(end || start).slice(0, 10) }
        : { dateTime: new Date(end || new Date(new Date(start).getTime() + 30 * 60 * 1000)).toISOString() },
      source: { title: 'LifeOS', url: APP_URL },
    };

    const response = await client.request({
      url: `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
      method: 'POST',
      data: body,
    });
    res.json({ event: response.data });
  } catch (e) {
    console.error('[calendar/events POST]', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── PATCH /api/calendar/events/:id  (auth) ──────────────────────────────────
router.patch('/events/:id', authenticate, async (req, res) => {
  try {
    const client = await google.getClientForUser(req.userId);
    if (!client) return res.status(404).json({ error: 'Calendar not connected.' });
    const calendarId = req.query.calendarId ? String(req.query.calendarId) : 'primary';
    const response = await client.request({
      url: `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(req.params.id)}`,
      method: 'PATCH',
      data: req.body || {},
    });
    res.json({ event: response.data });
  } catch (e) {
    console.error('[calendar/events PATCH]', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── DELETE /api/calendar/events/:id  (auth) ─────────────────────────────────
router.delete('/events/:id', authenticate, async (req, res) => {
  try {
    const client = await google.getClientForUser(req.userId);
    if (!client) return res.status(404).json({ error: 'Calendar not connected.' });
    const calendarId = req.query.calendarId ? String(req.query.calendarId) : 'primary';
    await client.request({
      url: `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(req.params.id)}`,
      method: 'DELETE',
    });
    res.json({ success: true });
  } catch (e) {
    console.error('[calendar/events DELETE]', e.message);
    res.status(500).json({ error: e.message });
  }
});

// Expose user payload shape so auth.js can match
router._toUserPayload = toUserPayload;

module.exports = router;
