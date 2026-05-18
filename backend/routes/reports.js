const router = require('express').Router();
const db = require('../db');
const { requireManager } = require('../middleware/auth');

router.get('/hours', requireManager, (req, res) => {
  const { employee_id, client_id } = req.query;

  // Build WHERE clause for task-level filters
  const taskConds = [];
  const taskParams = [];
  if (employee_id) { taskConds.push('t.assignee_id = ?'); taskParams.push(Number(employee_id)); }
  if (client_id)   { taskConds.push('t.client_id = ?');   taskParams.push(Number(client_id)); }
  const taskWhere = taskConds.length ? 'WHERE ' + taskConds.join(' AND ') : '';

  // Hours by employee (show all employees, even those with 0h under current filter)
  const byEmployee = db.prepare(`
    SELECT u.id, u.name,
      COALESCE(SUM(l.hours), 0)       AS total_hours,
      COUNT(DISTINCT l.task_id)       AS task_count
    FROM users u
    LEFT JOIN (
      SELECT t.id, t.assignee_id FROM tasks t
      ${client_id ? 'WHERE t.client_id = ?' : ''}
    ) ft ON ft.assignee_id = u.id
    LEFT JOIN time_logs l ON l.task_id = ft.id
    WHERE u.role = 'employee'
    GROUP BY u.id, u.name
    ORDER BY total_hours DESC
  `).all(...(client_id ? [Number(client_id)] : []));

  // Hours by client (show all clients, even those with 0h under current filter)
  const byClient = db.prepare(`
    SELECT c.id, c.name,
      COALESCE(SUM(l.hours), 0)       AS total_hours,
      COUNT(DISTINCT l.task_id)       AS task_count
    FROM clients c
    LEFT JOIN (
      SELECT t.id, t.client_id FROM tasks t
      ${employee_id ? 'WHERE t.assignee_id = ?' : ''}
    ) ft ON ft.client_id = c.id
    LEFT JOIN time_logs l ON l.task_id = ft.id
    GROUP BY c.id, c.name
    ORDER BY total_hours DESC
  `).all(...(employee_id ? [Number(employee_id)] : []));

  // Hours by month
  const byMonth = db.prepare(`
    SELECT strftime('%Y-%m', l.date)  AS month,
      COALESCE(SUM(l.hours), 0)       AS total_hours,
      COUNT(DISTINCT l.task_id)       AS task_count
    FROM time_logs l
    JOIN tasks t ON l.task_id = t.id
    ${taskWhere}
    GROUP BY month
    ORDER BY month ASC
  `).all(...taskParams);

  // Full detail log
  const detail = db.prepare(`
    SELECT l.date,
      COALESCE(u.name, 'Unknown')     AS employee,
      COALESCE(c.name, 'No client')   AS client,
      t.title                         AS task,
      l.hours,
      COALESCE(l.note, '')            AS note,
      t.status
    FROM time_logs l
    JOIN tasks t ON l.task_id = t.id
    LEFT JOIN users   u ON l.user_id   = u.id
    LEFT JOIN clients c ON t.client_id = c.id
    ${taskWhere}
    ORDER BY l.date ASC
  `).all(...taskParams);

  res.json({ byEmployee, byClient, byMonth, detail });
});

module.exports = router;
