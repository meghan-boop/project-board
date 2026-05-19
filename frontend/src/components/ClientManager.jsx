import { useState, useRef, useEffect } from 'react';
import { api } from '../api';
import { pal, fmtH } from '../utils';

export default function ClientManager({ clients, tasks, onClose, onRefresh }) {
  const [name, setName]         = useState('');
  const [error, setError]       = useState('');
  const [showInactive, setShowInactive] = useState(false);
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

  async function handleArchive(cl) {
    try {
      await api.updateClient(cl.id, { active: cl.active === 0 ? 1 : 0 });
      await onRefresh();
    } catch (err) {
      alert(err.message);
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

  const active   = clients.filter(c => c.active !== 0);
  const inactive = clients.filter(c => c.active === 0);

  function ClientRow({ cl }) {
    const p = pal(clients, cl.id);
    const tc  = tasks.filter(t => t.client_id === cl.id).length;
    const hrs = fmtH(tasks.filter(t => t.client_id === cl.id).reduce((s, t) => s + Number(t.total_hours || 0), 0));
    const isInactive = cl.active === 0;
    return (
      <div className="mgr-row" key={cl.id} style={isInactive ? { opacity: 0.55 } : {}}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: p[1], display: 'inline-block', flexShrink: 0 }} />
          <span style={{ fontSize: 13, fontWeight: 500 }}>{cl.name}</span>
          {isInactive && <span style={{ fontSize: 10, color: 'var(--text-3)', background: 'var(--surface2)', padding: '1px 6px', borderRadius: 9999 }}>Inactive</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{tc} task{tc !== 1 ? 's' : ''} · {hrs}</span>
          <button
            className="btn btn-sm"
            title={isInactive ? 'Reactivate client' : 'Archive client'}
            onClick={() => handleArchive(cl)}
            style={{ padding: '2px 8px', fontSize: 11 }}
          >
            {isInactive ? <><i className="ti ti-player-play" /> Reactivate</> : <><i className="ti ti-archive" /> Archive</>}
          </button>
          <button className="del-btn" title="Delete permanently" onClick={() => handleDelete(cl.id)}>
            <i className="ti ti-x" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="overlay" id="overlay" onClick={e => e.target.id === 'overlay' && onClose()}>
      <div className="modal">
        <h3>Clients</h3>

        {active.length === 0 && inactive.length === 0 && (
          <p style={{ fontSize: 13, color: 'var(--text-3)', textAlign: 'center', padding: '10px 0 14px' }}>
            No clients yet.
          </p>
        )}

        {active.map(cl => <ClientRow key={cl.id} cl={cl} />)}

        {inactive.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <button
              className="btn btn-sm"
              style={{ fontSize: 11, marginBottom: 8 }}
              onClick={() => setShowInactive(v => !v)}
            >
              <i className={`ti ti-chevron-${showInactive ? 'up' : 'down'}`} />
              {showInactive ? 'Hide' : 'Show'} {inactive.length} inactive client{inactive.length !== 1 ? 's' : ''}
            </button>
            {showInactive && inactive.map(cl => <ClientRow key={cl.id} cl={cl} />)}
          </div>
        )}

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
