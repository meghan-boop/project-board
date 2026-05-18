const router = require('express').Router();
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

function getTask(taskId) {
  return db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);
}

// GET /api/tasks/:taskId/logs
router.get('/:taskId/logs', requireAuth, (req, res) => {
  const task = getTask(req.params.taskId);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  if (req.user.role === 'employee' && task.assignee_id !== req.user.id) {
    return res.status(403).json({ error: 'Not your task' });
  }
  const logs = db.prepare(
    `SELECT l.*, u.name AS user_name
     FROM time_logs l
     LEFT JOIN users u ON l.user_id = u.id
     WHERE l.task_id = ?
     ORDER BY l.date ASC, l.created_at ASC`
  ).all(req.params.taskId);
  res.json(logs);
});

// POST /api/tasks/:taskId/logs
router.post('/:taskId/logs', requireAuth, (req, res) => {
  const task = getTask(req.params.taskId);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  if (req.user.role === 'employee' && task.assignee_id !== req.user.id) {
    return res.status(403).json({ error: 'Not your task' });
  }
  const { date, hours, note } = req.body;
  if (!date || !hours || Number(hours) <= 0) {
    return res.status(400).json({ error: 'Date and positive hours are required' });
  }
  const result = db.prepare(
    'INSERT INTO time_logs (task_id, user_id, date, hours, note) VALUES (?,?,?,?,?)'
  ).run(req.params.taskId, req.user.id, date, parseFloat(hours), note?.trim() || '');

  const log = db.prepare(
    `SELECT l.*, u.name AS user_name
     FROM time_logs l LEFT JOIN users u ON l.user_id = u.id
     WHERE l.id = ?`
  ).get(result.lastInsertRowid);
  res.status(201).json(log);
});

// DELETE /api/tasks/:taskId/logs/:logId
router.delete('/:taskId/logs/:logId', requireAuth, (req, res) => {
  const log = db.prepare(
    'SELECT * FROM time_logs WHERE id = ? AND task_id = ?'
  ).get(req.params.logId, req.params.taskId);
  if (!log) return res.status(404).json({ error: 'Log entry not found' });
  if (req.user.role === 'employee' && log.user_id !== req.user.id) {
    return res.status(403).json({ error: 'Not your log entry' });
  }
  db.prepare('DELETE FROM time_logs WHERE id = ?').run(req.params.logId);
  res.json({ ok: true });
});

module.exports = router;
