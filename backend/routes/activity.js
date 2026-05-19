const router = require('express').Router();
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

function canAccessTask(req, taskId) {
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);
  if (!task) return null;
  if (req.user.role === 'employee' && task.assignee_id !== req.user.id) return null;
  return task;
}

// ── NOTES ────────────────────────────────────────────────────────────────────

router.get('/:taskId/notes', requireAuth, (req, res) => {
  if (!canAccessTask(req, req.params.taskId)) return res.status(404).json({ error: 'Task not found' });
  res.json(db.prepare(
    `SELECT n.*, u.name AS user_name FROM task_notes n
     LEFT JOIN users u ON n.user_id = u.id
     WHERE n.task_id = ? ORDER BY n.created_at ASC`
  ).all(req.params.taskId));
});

router.post('/:taskId/notes', requireAuth, (req, res) => {
  if (!canAccessTask(req, req.params.taskId)) return res.status(404).json({ error: 'Task not found' });
  const content = req.body.content?.trim();
  if (!content) return res.status(400).json({ error: 'Content required' });
  const result = db.prepare(
    'INSERT INTO task_notes (task_id, user_id, content) VALUES (?, ?, ?)'
  ).run(req.params.taskId, req.user.id, content);
  res.status(201).json(db.prepare(
    `SELECT n.*, u.name AS user_name FROM task_notes n LEFT JOIN users u ON n.user_id = u.id WHERE n.id = ?`
  ).get(result.lastInsertRowid));
});

router.put('/:taskId/notes/:noteId', requireAuth, (req, res) => {
  const note = db.prepare('SELECT * FROM task_notes WHERE id = ? AND task_id = ?').get(req.params.noteId, req.params.taskId);
  if (!note) return res.status(404).json({ error: 'Note not found' });
  if (req.user.role !== 'manager' && note.user_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
  const content = req.body.content?.trim();
  if (!content) return res.status(400).json({ error: 'Content required' });
  db.prepare('UPDATE task_notes SET content = ? WHERE id = ?').run(content, req.params.noteId);
  res.json(db.prepare(
    `SELECT n.*, u.name AS user_name FROM task_notes n LEFT JOIN users u ON n.user_id = u.id WHERE n.id = ?`
  ).get(req.params.noteId));
});

router.delete('/:taskId/notes/:noteId', requireAuth, (req, res) => {
  const note = db.prepare('SELECT * FROM task_notes WHERE id = ? AND task_id = ?').get(req.params.noteId, req.params.taskId);
  if (!note) return res.status(404).json({ error: 'Note not found' });
  if (req.user.role !== 'manager' && note.user_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
  db.prepare('DELETE FROM task_notes WHERE id = ?').run(req.params.noteId);
  res.json({ ok: true });
});

// ── ATTACHMENTS ───────────────────────────────────────────────────────────────

router.get('/:taskId/attachments', requireAuth, (req, res) => {
  if (!canAccessTask(req, req.params.taskId)) return res.status(404).json({ error: 'Task not found' });
  res.json(db.prepare(
    `SELECT a.id, a.task_id, a.user_id, a.filename, a.mime_type, a.size, a.created_at,
            u.name AS user_name
     FROM task_attachments a LEFT JOIN users u ON a.user_id = u.id
     WHERE a.task_id = ? ORDER BY a.created_at ASC`
  ).all(req.params.taskId));
});

router.post('/:taskId/attachments', requireAuth, (req, res) => {
  if (!canAccessTask(req, req.params.taskId)) return res.status(404).json({ error: 'Task not found' });
  const { filename, mime_type, size, data } = req.body;
  if (!filename || !data) return res.status(400).json({ error: 'filename and data required' });
  if (size > MAX_FILE_SIZE) return res.status(400).json({ error: 'File must be under 10MB' });
  const result = db.prepare(
    'INSERT INTO task_attachments (task_id, user_id, filename, mime_type, size, data) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(req.params.taskId, req.user.id, filename, mime_type || 'application/octet-stream', size || 0, data);
  res.status(201).json(db.prepare(
    `SELECT a.id, a.task_id, a.user_id, a.filename, a.mime_type, a.size, a.created_at,
            u.name AS user_name
     FROM task_attachments a LEFT JOIN users u ON a.user_id = u.id WHERE a.id = ?`
  ).get(result.lastInsertRowid));
});

router.get('/:taskId/attachments/:attachmentId/download', requireAuth, (req, res) => {
  if (!canAccessTask(req, req.params.taskId)) return res.status(404).json({ error: 'Task not found' });
  const att = db.prepare('SELECT * FROM task_attachments WHERE id = ? AND task_id = ?').get(req.params.attachmentId, req.params.taskId);
  if (!att) return res.status(404).json({ error: 'Attachment not found' });
  const buffer = Buffer.from(att.data, 'base64');
  res.set({
    'Content-Type': att.mime_type,
    'Content-Disposition': `attachment; filename="${att.filename}"`,
    'Content-Length': buffer.length,
  });
  res.send(buffer);
});

router.delete('/:taskId/attachments/:attachmentId', requireAuth, (req, res) => {
  const att = db.prepare('SELECT * FROM task_attachments WHERE id = ? AND task_id = ?').get(req.params.attachmentId, req.params.taskId);
  if (!att) return res.status(404).json({ error: 'Attachment not found' });
  if (req.user.role !== 'manager' && att.user_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
  db.prepare('DELETE FROM task_attachments WHERE id = ?').run(req.params.attachmentId);
  res.json({ ok: true });
});

module.exports = router;
