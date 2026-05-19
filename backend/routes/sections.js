const router = require('express').Router();
const db = require('../db');
const { requireAuth, requireManager } = require('../middleware/auth');

router.get('/', requireAuth, (req, res) => {
  res.json(db.prepare('SELECT * FROM sections ORDER BY position ASC, id ASC').all());
});

router.post('/', requireManager, (req, res) => {
  const name = req.body.name?.trim();
  if (!name) return res.status(400).json({ error: 'Name required' });
  const maxPos = db.prepare('SELECT COALESCE(MAX(position), -1) as p FROM sections').get().p;
  const result = db.prepare('INSERT INTO sections (name, color, position) VALUES (?, ?, ?)').run(
    name, req.body.color || '#94918a', maxPos + 1
  );
  res.status(201).json(db.prepare('SELECT * FROM sections WHERE id = ?').get(result.lastInsertRowid));
});

router.put('/:id', requireManager, (req, res) => {
  const s = db.prepare('SELECT * FROM sections WHERE id = ?').get(req.params.id);
  if (!s) return res.status(404).json({ error: 'Section not found' });
  const { name, color, position } = req.body;
  db.prepare('UPDATE sections SET name=?, color=?, position=? WHERE id=?').run(
    name?.trim() || s.name,
    color || s.color,
    position !== undefined ? position : s.position,
    req.params.id
  );
  res.json(db.prepare('SELECT * FROM sections WHERE id = ?').get(req.params.id));
});

router.delete('/:id', requireManager, (req, res) => {
  const s = db.prepare('SELECT * FROM sections WHERE id = ?').get(req.params.id);
  if (!s) return res.status(404).json({ error: 'Section not found' });
  const count = db.prepare('SELECT COUNT(*) as n FROM sections').get().n;
  if (count <= 1) return res.status(400).json({ error: 'Cannot delete the last section' });
  const first = db.prepare('SELECT id FROM sections WHERE id != ? ORDER BY position ASC LIMIT 1').get(req.params.id);
  if (first) db.prepare('UPDATE tasks SET section_id=? WHERE section_id=?').run(first.id, req.params.id);
  db.prepare('DELETE FROM sections WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
