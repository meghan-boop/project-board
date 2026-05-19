const router = require('express').Router();
const db = require('../db');
const { requireAuth, requireManager } = require('../middleware/auth');

const taskSelect = `
  SELECT t.*,
    u.name  AS assignee_name,
    c.name  AS client_name,
    s.name  AS section_name,
    s.color AS section_color,
    s.position AS section_position,
    COALESCE((SELECT SUM(hours) FROM time_logs WHERE task_id = t.id), 0) AS total_hours
  FROM tasks t
  LEFT JOIN users    u ON t.assignee_id = u.id
  LEFT JOIN clients  c ON t.client_id   = c.id
  LEFT JOIN sections s ON t.section_id  = s.id
`;

router.get('/', requireAuth, (req, res) => {
  if (req.user.role === 'manager') {
    res.json(db.prepare(taskSelect + ' ORDER BY t.created_at DESC').all());
  } else {
    res.json(db.prepare(taskSelect + ' WHERE t.assignee_id = ? ORDER BY t.created_at DESC').all(req.user.id));
  }
});

router.post('/', requireManager, (req, res) => {
  const { title, description, assignee_id, client_id, priority, due_date, section_id } = req.body;
  if (!title?.trim()) return res.status(400).json({ error: 'Title required' });
  const defaultSection = db.prepare('SELECT id FROM sections ORDER BY position ASC LIMIT 1').get();
  const result = db.prepare(
    'INSERT INTO tasks (title, description, assignee_id, client_id, priority, due_date, status, section_id) VALUES (?,?,?,?,?,?,?,?)'
  ).run(
    title.trim(),
    description?.trim() || '',
    assignee_id || null,
    client_id   || null,
    priority    || 'medium',
    due_date    || null,
    'todo',
    section_id  || defaultSection?.id || null
  );
  res.status(201).json(db.prepare(taskSelect + ' WHERE t.id = ?').get(result.lastInsertRowid));
});

router.put('/:id', requireAuth, (req, res) => {
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  if (req.user.role === 'employee') {
    if (task.assignee_id !== req.user.id) return res.status(403).json({ error: 'Not your task' });
    const { section_id } = req.body;
    if (!section_id) return res.status(400).json({ error: 'section_id required' });
    db.prepare('UPDATE tasks SET section_id = ? WHERE id = ?').run(section_id, req.params.id);
  } else {
    const { title, description, assignee_id, client_id, priority, due_date, section_id } = req.body;
    db.prepare(
      'UPDATE tasks SET title=?, description=?, assignee_id=?, client_id=?, priority=?, due_date=?, section_id=? WHERE id=?'
    ).run(
      title?.trim()   || task.title,
      description     !== undefined ? description.trim()       : task.description,
      assignee_id     !== undefined ? (assignee_id || null)    : task.assignee_id,
      client_id       !== undefined ? (client_id   || null)    : task.client_id,
      priority        || task.priority,
      due_date        !== undefined ? (due_date    || null)    : task.due_date,
      section_id      !== undefined ? (section_id  || null)    : task.section_id,
      req.params.id
    );
  }
  res.json(db.prepare(taskSelect + ' WHERE t.id = ?').get(req.params.id));
});

router.delete('/:id', requireManager, (req, res) => {
  if (!db.prepare('SELECT id FROM tasks WHERE id = ?').get(req.params.id)) {
    return res.status(404).json({ error: 'Task not found' });
  }
  db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
