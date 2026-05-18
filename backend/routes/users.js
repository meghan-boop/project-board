const router = require('express').Router();
const bcrypt = require('bcryptjs');
const db = require('../db');
const { requireAuth, requireManager } = require('../middleware/auth');

// All employees — used for dropdowns (any authenticated user)
router.get('/employees', requireAuth, (req, res) => {
  const employees = db.prepare(
    "SELECT id, name FROM users WHERE role = 'employee' ORDER BY name ASC"
  ).all();
  res.json(employees);
});

// All users — manager sees everyone, employee sees only themselves
router.get('/', requireAuth, (req, res) => {
  if (req.user.role === 'manager') {
    const users = db.prepare(
      'SELECT id, email, name, role FROM users ORDER BY role DESC, name ASC'
    ).all();
    res.json(users);
  } else {
    const user = db.prepare('SELECT id, email, name, role FROM users WHERE id = ?').get(req.user.id);
    res.json(user ? [user] : []);
  }
});

// Create employee (manager only)
router.post('/', requireManager, (req, res) => {
  const { email, password, name } = req.body;
  if (!email?.trim() || !password || !name?.trim()) {
    return res.status(400).json({ error: 'Email, password, and name are required' });
  }
  const count = db.prepare("SELECT COUNT(*) as n FROM users WHERE role = 'employee'").get().n;
  if (count >= 9) return res.status(400).json({ error: 'Maximum of 9 employee accounts allowed' });

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase().trim());
  if (existing) return res.status(400).json({ error: 'Email already in use' });

  const hash = bcrypt.hashSync(password, 10);
  const result = db.prepare(
    'INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)'
  ).run(email.toLowerCase().trim(), hash, name.trim(), 'employee');

  res.status(201).json({
    id: result.lastInsertRowid,
    email: email.toLowerCase().trim(),
    name: name.trim(),
    role: 'employee',
  });
});

// Delete employee (manager only)
router.delete('/:id', requireManager, (req, res) => {
  const user = db.prepare('SELECT id, role FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (user.role === 'manager') return res.status(403).json({ error: 'Cannot delete the manager account' });
  db.prepare('UPDATE tasks SET assignee_id = NULL WHERE assignee_id = ?').run(req.params.id);
  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
