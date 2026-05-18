import { useState, useEffect, useRef } from 'react';
import { api } from '../api';
import { COLS, fmtH, today } from '../utils';

export default function TaskModal({ task, employees, clients, user, defaultStatus, onClose, onSaved, onDeleted }) {
  const isNew = !task;
  const [tab, setTab]           = useState('details');
  const [title, setTitle]       = useState(task?.title || '');
  const [desc, setDesc]         = useState(task?.description || '');
  const [assignee, setAssignee] = useState(task?.assignee_id ? String(task.assignee_id) : '');
  const [client, setClient]     = useState(task?.client_id   ? String(task.client_id)   : '');
  const [priority, setPriority] = useState(task?.priority || 'medium');
  const [status, setStatus]     = useState(task?.status || defaultStatus || 'todo');
  const [dueDate, setDueDate]   = useState(task?.due_date || '');
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');

  // Hours log state
  const [logs, setLogs]         = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logDate, setLogDate]   = useState(today());
  const [logHrs, setLogHrs]     = useState('');
  const [logNote, setLogNote]   = useState('');

  const titleRef = useRef(null);
  useEffect(() => { if (isNew) titleRef.current?.focus(); }, []);

  useEffect(() => {
    if (!isNew && tab === 'hours') loadLogs();
  }, [tab]);

  async function loadLogs() {
    setLogsLoading(true);
    try {
      setLogs(await api.getLogs(task.id));
    } catch (err) {
      console.error(err);
    } finally {
      setLogsLoading(false);
    }
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!title.trim()) { setError('Title is required'); return; }
    setError(''); setSaving(true);
    try {
      const data = {
        title: title.trim(),
        description: desc.trim(),
        assignee_id: assignee ? Number(assignee) : null,
        client_id:   client   ? Number(client)   : null,
        priority,
        due_date: dueDate || null,
        status,
      };
      const saved = isNew
        ? await api.createTask(data)
        : await api.updateTask(task.id, data);
      onSaved(saved);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm('Delete this task?')) return;
    try {
      await api.deleteTask(task.id);
      onDeleted(task.id);
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleAddLog(e) {
    e.preventDefault();
    if (!logDate || !logHrs || Number(logHrs) <= 0) return;
    try {
      await api.createLog(task.id, { date: logDate, hours: Number(logHrs), note: logNote.trim() });
      setLogHrs(''); setLogNote('');
      await loadLogs();
      onSaved({ ...task, total_hours: null }); // trigger parent refresh for total_hours
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleDeleteLog(logId) {
    try {
      await api.deleteLog(task.id, logId);
      await loadLogs();
      onSaved({ ...task, total_hours: null });
    } catch (err) {
      alert(err.message);
    }
  }

  const isManager = user.role === 'manager';
  const totalLogged = logs.reduce((s, l) => s + Number(l.hours), 0);

  return (
    <div className="overlay" id="overlay" onClick={e => e.target.id === 'overlay' && onClose()}>
      <div className="modal">
        <h3>{isNew ? 'Add task' : 'Edit task'}</h3>

        {!isNew && (
          <div className="modal-tabs">
            <button className={`modal-tab${tab === 'details' ? ' active' : ''}`} onClick={() => setTab('details')}>
              <i className="ti ti-pencil" /> Details
            </button>
            <button className={`modal-tab${tab === 'hours' ? ' active' : ''}`} onClick={() => setTab('hours')}>
              <i className="ti ti-clock" /> Hours ({fmtH(task.total_hours || 0)})
            </button>
          </div>
        )}

        {/* Details tab */}
        <div className={tab !== 'details' ? 'hidden' : ''}>
          {error && <div className="error-msg">{error}</div>}
          <form id="task-form" onSubmit={handleSave}>
            <div className="field">
              <label>Title</label>
              <input ref={titleRef} value={title} onChange={e => setTitle(e.target.value)} placeholder="Task name" required disabled={!isManager && !isNew} />
            </div>
            {isManager && (
              <div className="field">
                <label>Description</label>
                <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Optional notes" />
              </div>
            )}
            {isManager && (
              <div className="row2">
                <div className="field">
                  <label>Assigned to</label>
                  <select value={assignee} onChange={e => setAssignee(e.target.value)}>
                    <option value="">Unassigned</option>
                    {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>Client</label>
                  <select value={client} onChange={e => setClient(e.target.value)}>
                    <option value="">No client</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>
            )}
            <div className="row2">
              {isManager && (
                <div className="field">
                  <label>Priority</label>
                  <select value={priority} onChange={e => setPriority(e.target.value)}>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              )}
              <div className="field">
                <label>Status</label>
                <select value={status} onChange={e => setStatus(e.target.value)}>
                  {COLS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </div>
            </div>
            {isManager && (
              <div className="field">
                <label>Due date</label>
                <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
              </div>
            )}
          </form>
          <div className="modal-actions">
            {!isNew && isManager && (
              <button className="btn btn-danger" onClick={handleDelete} style={{ marginRight: 'auto' }}>
                <i className="ti ti-trash" /> Delete
              </button>
            )}
            <button className="btn" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" form="task-form" type="submit" disabled={saving}>
              {saving ? 'Saving…' : isNew ? 'Add task' : 'Save'}
            </button>
          </div>
        </div>

        {/* Hours tab */}
        {tab === 'hours' && (
          <div>
            {logsLoading ? (
              <p style={{ fontSize: 13, color: 'var(--text-3)', padding: '10px 0' }}>Loading…</p>
            ) : logs.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--text-3)', padding: '10px 0' }}>No hours logged yet.</p>
            ) : (
              <>
                <table className="log-table">
                  <thead>
                    <tr><th>Date</th><th>Hours</th><th>By</th><th>Note</th><th /></tr>
                  </thead>
                  <tbody>
                    {logs.map(l => (
                      <tr key={l.id}>
                        <td>{l.date}</td>
                        <td>{fmtH(l.hours)}</td>
                        <td style={{ color: 'var(--text-3)', fontSize: 11 }}>{l.user_name || '—'}</td>
                        <td style={{ color: 'var(--text-2)' }}>{l.note || '—'}</td>
                        <td>
                          {(isManager || l.user_id === user.id) && (
                            <button className="del-btn" onClick={() => handleDeleteLog(l.id)}><i className="ti ti-x" /></button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="log-total">
                  <span>Total hours</span>
                  <strong>{fmtH(totalLogged)}</strong>
                </div>
              </>
            )}

            <p style={{ fontSize: 12, color: 'var(--text-2)', fontWeight: 500, margin: '14px 0 6px' }}>Log hours</p>
            <form onSubmit={handleAddLog}>
              <div className="add-log-row">
                <input type="date" value={logDate} onChange={e => setLogDate(e.target.value)} required />
                <input type="number" value={logHrs} onChange={e => setLogHrs(e.target.value)} placeholder="Hours" min="0.25" step="0.25" required />
                <input value={logNote} onChange={e => setLogNote(e.target.value)} placeholder="Note (optional)" />
                <button type="submit" className="btn btn-primary btn-sm"><i className="ti ti-plus" /></button>
              </div>
            </form>

            <div className="modal-actions">
              <button className="btn btn-primary" onClick={onClose}>Done</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
