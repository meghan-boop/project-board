const router = require('express').Router();
const db = require('../db');
const { requireAuth, requireManager } = require('../middleware/auth');

router.get('/', requireAuth, (req, res) => {
  res.json(db.prepare('SELECT * FROM clients ORDER BY name ASC').all());
});

router.post('/', requireManager, (req, res) => {
  const name = req.body.name?.trim();
  if (!name) return res.status(400).json({ error: 'Name required' });
  const result = db.prepare('INSERT INTO clients (name) VALUES (?)').run(name);
  res.status(201).json({ id: result.lastInsertRowid, name });
});

router.put('/:id', requireManager, (req, res) => {
  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id);
  if (!client) return res.status(404).json({ error: 'Client not found' });
  const { name, active } = req.body;
  db.prepare('UPDATE clients SET name=?, active=? WHERE id=?').run(
    name?.trim() || client.name,
    active !== undefined ? (active ? 1 : 0) : client.active,
    req.params.id
  );
  res.json(db.prepare('SELECT * FROM clients WHERE id=?').get(req.params.id));
});

router.delete('/:id', requireManager, (req, res) => {
  const client = db.prepare('SELECT id FROM clients WHERE id = ?').get(req.params.id);
  if (!client) return res.status(404).json({ error: 'Client not found' });
  db.prepare('UPDATE tasks SET client_id = NULL WHERE client_id = ?').run(req.params.id);
  db.prepare('DELETE FROM clients WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
