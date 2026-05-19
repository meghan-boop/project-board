import { useState, useEffect, useRef } from 'react';
import { api } from '../api';
import { fmtSize, fmtDateTime, fileIcon } from '../utils';

export default function ContractsModal({ clients, user, onClose }) {
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [filterCl, setFilterCl]   = useState('');

  const [name, setName]           = useState('');
  const [clientId, setClientId]   = useState('');
  const [file, setFile]           = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError]         = useState('');
  const fileInputRef = useRef(null);

  const isManager = user.role === 'manager';

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try { setContracts(await api.getContracts()); }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  async function handleUpload(e) {
    e.preventDefault();
    if (!name.trim() || !file) return;
    setError(''); setUploading(true);
    try {
      await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (ev) => {
          try {
            await api.createContract({
              name: name.trim(),
              client_id: clientId ? Number(clientId) : null,
              filename: file.name,
              mime_type: file.type || 'application/octet-stream',
              size: file.size,
              data: ev.target.result.split(',')[1],
            });
            resolve();
          } catch (err) { reject(err); }
        };
        reader.readAsDataURL(file);
      });
      setName(''); setClientId(''); setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this contract?')) return;
    try { await api.deleteContract(id); await load(); }
    catch (err) { alert(err.message); }
  }

  const activeClients = clients.filter(c => c.active !== 0);
  const visible = contracts.filter(c => !filterCl || String(c.client_id) === filterCl);

  return (
    <div className="overlay" id="overlay" onClick={e => e.target.id === 'overlay' && onClose()}>
      <div className="modal contracts-modal">
        <h3><i className="ti ti-file-description" style={{ marginRight: 6 }} />Contracts</h3>

        {/* Filter */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
          <select
            className="contracts-filter-select"
            value={filterCl}
            onChange={e => setFilterCl(e.target.value)}
          >
            <option value="">All clients</option>
            {activeClients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          {filterCl && (
            <button className="btn btn-sm" onClick={() => setFilterCl('')}><i className="ti ti-x" /> Clear</button>
          )}
        </div>

        {/* Contract list */}
        {loading ? (
          <p style={{ fontSize: 13, color: 'var(--text-3)', padding: '10px 0' }}>Loading…</p>
        ) : visible.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--text-3)', padding: '10px 0' }}>No contracts yet.</p>
        ) : (
          <div className="contracts-list">
            {visible.map(c => (
              <div key={c.id} className="contract-item">
                <i className={`ti ${fileIcon(c.mime_type)} contract-icon`} />
                <div className="contract-info">
                  <span className="contract-name">{c.name}</span>
                  <span className="contract-meta">
                    {c.client_name && <span className="contract-client">{c.client_name}</span>}
                    {fmtSize(c.size)} · {fmtDateTime(c.created_at)}
                  </span>
                </div>
                <div className="contract-actions">
                  <button className="icon-btn" title="Download" onClick={() => api.downloadContract(c.id, c.filename)}>
                    <i className="ti ti-download" />
                  </button>
                  {isManager && (
                    <button className="icon-btn danger" title="Delete" onClick={() => handleDelete(c.id)}>
                      <i className="ti ti-trash" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Upload form — manager only */}
        {isManager && (
          <>
            <div style={{ borderTop: '0.5px solid var(--border)', margin: '14px 0 12px', paddingTop: 14, fontSize: 12, fontWeight: 500, color: 'var(--text-2)' }}>
              Upload contract
            </div>
            {error && <div className="error-msg" style={{ marginBottom: 10 }}>{error}</div>}
            <form onSubmit={handleUpload}>
              <div className="row2" style={{ marginBottom: 10 }}>
                <div className="field" style={{ margin: 0 }}>
                  <label>Name</label>
                  <input value={name} onChange={e => setName(e.target.value)} placeholder="Contract name" required />
                </div>
                <div className="field" style={{ margin: 0 }}>
                  <label>Client <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>(optional)</span></label>
                  <select value={clientId} onChange={e => setClientId(e.target.value)}>
                    <option value="">No client</option>
                    {activeClients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="new-task-file-row" style={{ marginBottom: 12 }}>
                <input ref={fileInputRef} type="file" style={{ display: 'none' }}
                  onChange={e => {
                    const f = e.target.files[0];
                    if (f && f.size > 10 * 1024 * 1024) { alert('File must be under 10MB'); return; }
                    setFile(f || null);
                  }}
                />
                <button type="button" className="btn btn-sm" onClick={() => fileInputRef.current?.click()}>
                  <i className="ti ti-upload" /> Choose file
                </button>
                {file
                  ? <span className="new-task-filename"><i className="ti ti-paperclip" /> {file.name}</span>
                  : <span style={{ fontSize: 12, color: 'var(--text-3)' }}>No file chosen</span>}
                {file && (
                  <button type="button" className="icon-btn danger" onClick={() => { setFile(null); fileInputRef.current.value = ''; }}>
                    <i className="ti ti-x" />
                  </button>
                )}
              </div>
              <button type="submit" className="btn btn-primary btn-sm" disabled={uploading || !name.trim() || !file}>
                {uploading ? 'Uploading…' : <><i className="ti ti-plus" /> Upload</>}
              </button>
            </form>
          </>
        )}

        <div className="modal-actions">
          <button className="btn btn-primary" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}
