import { useState, useRef, useEffect } from 'react';
import { api } from '../api';
import { pal, initials, fmtH } from '../utils';

export default function EmployeeManager({ employees, tasks, onClose, onRefresh }) {
  const [name, setName]       = useState('');
  const [email, setEmail]     = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]     = useState('');
  const [saving, setSaving]   = useState(false);
  const nameRef = useRef(null);

  useEffect(() => { nameRef.current?.focus(); }, []);

  async function handleAdd(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await api.createUser({ name: name.trim(), email: email.trim(), password });
      setName(''); setEmail(''); setPassword('');
      await onRefresh();
      nameRef.current?.focus();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Remove this employee? Their tasks will become unassigned.')) return;
    try {
      await api.deleteUser(id);
      await onRefresh();
    } catch (err) {
      alert(err.message);
    }
  }

  return (
    <div className="overlay" id="overlay" onClick={e => e.target.id === 'overlay' && onClose()}>
      <div className="modal">
        <h3>Team members ({employees.length} / 9)</h3>

        {employees.length === 0 && (
          <p style={{ fontSize: 13, color: 'var(--text-3)', textAlign: 'center', padding: '10px 0 14px' }}>
            No employees yet.
          </p>
        )}

        {employees.map(e => {
          const p = pal(employees, e.id);
          const tc = tasks.filter(t => t.assignee_id === e.id).length;
          const hrs = fmtH(tasks.filter(t => t.assignee_id === e.id).reduce((s, t) => s + Number(t.total_hours || 0), 0));
          return (
            <div className="mgr-row" key={e.id}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="emp-pill" style={{ background: p[0], color: p[1], fontSize: 12, maxWidth: 200 }}>
                  {initials(e.name)} {e.name}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{tc} task{tc !== 1 ? 's' : ''} · {hrs}</span>
                <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{e.email}</span>
                <button className="del-btn" onClick={() => handleDelete(e.id)}><i className="ti ti-x" /></button>
              </div>
            </div>
          );
        })}

        <p style={{ fontSize: 12, color: 'var(--text-2)', fontWeight: 500, margin: '14px 0 8px' }}>
          Add employee
        </p>
        {error && <div className="error-msg">{error}</div>}
        <form onSubmit={handleAdd}>
          <div className="row2">
            <div className="field">
              <label>Full name</label>
              <input ref={nameRef} value={name} onChange={e => setName(e.target.value)} placeholder="Jane Smith" required />
            </div>
            <div className="field">
              <label>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="jane@example.com" required />
            </div>
          </div>
          <div className="field">
            <label>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Temporary password" required minLength={4} />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn" onClick={onClose}>Done</button>
            <button type="submit" className="btn btn-primary" disabled={saving || employees.length >= 9}>
              <i className="ti ti-plus" />
              {saving ? 'Adding…' : 'Add employee'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
