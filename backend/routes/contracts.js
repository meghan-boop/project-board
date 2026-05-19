const router = require('express').Router();
const db = require('../db');
const { requireAuth, requireManager } = require('../middleware/auth');

const MAX_SIZE = 10 * 1024 * 1024;

const contractSelect = `
  SELECT c.id, c.name, c.client_id, cl.name AS client_name,
    c.filename, c.mime_type, c.size, c.created_at
  FROM contracts c
  LEFT JOIN clients cl ON c.client_id = cl.id
`;

router.get('/', requireAuth, (req, res) => {
  res.json(db.prepare(contractSelect + ' ORDER BY c.created_at DESC').all());
});

router.post('/', requireManager, (req, res) => {
  const { name, client_id, filename, mime_type, size, data } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Name required' });
  if (!data)         return res.status(400).json({ error: 'File data required' });
  if (Buffer.from(data, 'base64').length > MAX_SIZE) return res.status(400).json({ error: 'File must be under 10MB' });
  const result = db.prepare(
    'INSERT INTO contracts (name, client_id, filename, mime_type, size, data) VALUES (?,?,?,?,?,?)'
  ).run(name.trim(), client_id || null, filename, mime_type || 'application/octet-stream', size || 0, data);
  res.status(201).json(db.prepare(contractSelect + ' WHERE c.id = ?').get(result.lastInsertRowid));
});

router.get('/:id/download', requireAuth, (req, res) => {
  const row = db.prepare('SELECT * FROM contracts WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  const buf = Buffer.from(row.data, 'base64');
  res.set('Content-Type', row.mime_type);
  res.set('Content-Disposition', `attachment; filename="${row.filename}"`);
  res.send(buf);
});

router.delete('/:id', requireManager, (req, res) => {
  if (!db.prepare('SELECT id FROM contracts WHERE id = ?').get(req.params.id))
    return res.status(404).json({ error: 'Not found' });
  db.prepare('DELETE FROM contracts WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
