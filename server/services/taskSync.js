const db = require('../db');
const google = require('./google');

const APP_URL = process.env.APP_URL || 'http://localhost:3000';

// Tasks have no time component, so events are always all-day, one-day long.
function buildEventBody(task) {
  const date = String(task.due_date).slice(0, 10);
  const end = new Date(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, Number(date.slice(8, 10)) + 1);
  const endStr = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;
  const priority = task.priority ? ` · ${task.priority}` : '';
  const category = task.category ? ` · ${task.category}` : '';
  return {
    summary: task.title,
    description: `LifeOS task${priority}${category}`,
    start: { date },
    end: { date: endStr },
    source: { title: 'LifeOS', url: APP_URL },
    extendedProperties: { private: { lifeosTaskId: task.id } },
  };
}

function getMapping(taskId) {
  return db.prepare('SELECT * FROM task_calendar_events WHERE task_id = ?').get(taskId);
}

function saveMapping(taskId, userId, eventId, calendarId = 'primary') {
  db.prepare(`
    INSERT INTO task_calendar_events (task_id, user_id, google_event_id, calendar_id, last_synced_at)
    VALUES (?, ?, ?, ?, datetime('now'))
    ON CONFLICT(task_id) DO UPDATE SET
      google_event_id = excluded.google_event_id,
      calendar_id = excluded.calendar_id,
      last_synced_at = datetime('now')
  `).run(taskId, userId, eventId, calendarId);
}

function deleteMapping(taskId) {
  db.prepare('DELETE FROM task_calendar_events WHERE task_id = ?').run(taskId);
}

// Push a task to Google Calendar. Creates, updates, or deletes the backing
// event based on whether the task has a due_date and an existing mapping.
// Never throws — sync failures should not block the core task CRUD flow.
async function syncTask(userId, task) {
  try {
    const client = await google.getClientForUser(userId).catch(() => null);
    if (!client) return;

    const mapping = getMapping(task.id);
    const hasDate = !!task.due_date;

    if (!hasDate) {
      if (mapping) await removeEvent(client, mapping).catch(() => {});
      deleteMapping(task.id);
      return;
    }

    const body = buildEventBody(task);
    if (mapping) {
      try {
        await client.request({
          url: `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(mapping.calendar_id)}/events/${encodeURIComponent(mapping.google_event_id)}`,
          method: 'PATCH',
          data: body,
        });
        saveMapping(task.id, userId, mapping.google_event_id, mapping.calendar_id);
        return;
      } catch (e) {
        // Event was deleted from Google side — fall through to create a new one.
        if (![404, 410].includes(e?.response?.status)) {
          console.warn('[taskSync PATCH]', e.message);
          return;
        }
        deleteMapping(task.id);
      }
    }

    const response = await client.request({
      url: 'https://www.googleapis.com/calendar/v3/calendars/primary/events',
      method: 'POST',
      data: body,
    });
    const eventId = response.data?.id;
    if (eventId) saveMapping(task.id, userId, eventId, 'primary');
  } catch (e) {
    console.warn('[taskSync]', e.message);
  }
}

async function removeEvent(client, mapping) {
  await client.request({
    url: `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(mapping.calendar_id)}/events/${encodeURIComponent(mapping.google_event_id)}`,
    method: 'DELETE',
  });
}

async function deleteTaskEvent(userId, taskId) {
  const mapping = getMapping(taskId);
  if (!mapping) return;
  try {
    const client = await google.getClientForUser(userId).catch(() => null);
    if (client) await removeEvent(client, mapping).catch(() => {});
  } finally {
    deleteMapping(taskId);
  }
}

// Push every open, dated task for this user to Google. Used right after the
// user first connects their calendar so existing tasks land on it.
async function backfillUserTasks(userId) {
  try {
    const rows = db.prepare(
      "SELECT * FROM tasks WHERE user_id = ? AND due_date IS NOT NULL AND due_date != '' AND status != 'done'"
    ).all(userId);
    for (const row of rows) {
      await syncTask(userId, row);
    }
  } catch (e) {
    console.warn('[taskSync backfill]', e.message);
  }
}

module.exports = { syncTask, deleteTaskEvent, backfillUserTasks };
