import { useState, useRef, useEffect } from 'react';
import { api } from '../api';
import { pal, fmtH } from '../utils';

export default function ClientManager({ clients, tasks, onClose, onRefresh }) {
  const [name, setName]   = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  async function handleAdd(e) {
    e.preventDefault();
    setError('');
    try {
      await api.createClient(name.trim());
      setName('');
      await onRefresh();
      inputRef.current?.focus();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Remove this client? Tasks assigned to them will have no client.')) return;
    try {
      await api.deleteClient(id);
      await onRefresh();
    } catch (err) {
      alert(err.message);
    }
  }

  return (
    <div className="overlay" id="overlay" onClick={e => e.target.id === 'overlay' && onClose()}>
      <div className="modal">
        <h3>Clients</h3>

        {clients.length === 0 && (
          <p style={{ fontSize: 13, color: 'var(--text-3)', textAlign: 'center', padding: '10px 0 14px' }}>
            No clients yet.
          </p>
        )}

        {clients.map((cl, i) => {
          const p = pal(clients, cl.id);
          const tc  = tasks.filter(t => t.client_id === cl.id).length;
          const hrs = fmtH(tasks.filter(t => t.client_id === cl.id).reduce((s, t) => s + Number(t.total_hours || 0), 0));
          return (
            <div className="mgr-row" key={cl.id}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: p[1], display: 'inline-block', flexShrink: 0 }} />
                <span style={{ fontSize: 13, fontWeight: 500 }}>{cl.name}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{tc} task{tc !== 1 ? 's' : ''} · {hrs}</span>
                <button className="del-btn" onClick={() => handleDelete(cl.id)}><i className="ti ti-x" /></button>
              </div>
            </div>
          );
        })}

        {error && <div className="error-msg" style={{ marginTop: 8 }}>{error}</div>}
        <form onSubmit={handleAdd}>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <input
              ref={inputRef}
              className="field"
              style={{ flex: 1, border: '0.5px solid var(--border-strong)', borderRadius: 'var(--radius)', padding: '7px 10px', fontSize: 13, background: 'var(--surface2)', color: 'var(--text)', fontFamily: 'inherit', margin: 0 }}
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Client name"
              required
            />
            <button type="submit" className="btn btn-primary"><i className="ti ti-plus" />Add</button>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-primary" onClick={onClose}>Done</button>
          </div>
        </form>
      </div>
    </div>
  );
}
