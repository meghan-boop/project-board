import { useState, useEffect, useRef } from 'react';
import { api } from '../api';
import { fmtH, fmtDateTime, fmtSize, fileIcon, today } from '../utils';

export default function TaskModal({ task, sections, employees, clients, user, defaultSectionId, onClose, onSaved, onDeleted }) {
  const isNew = !task;
  const [tab, setTab]           = useState('details');
  const [title, setTitle]       = useState(task?.title || '');
  const [desc, setDesc]         = useState(task?.description || '');
  const [assignee, setAssignee] = useState(task?.assignee_id ? String(task.assignee_id) : '');
  const [client, setClient]     = useState(task?.client_id   ? String(task.client_id)   : '');
  const [priority, setPriority] = useState(task?.priority || 'medium');
  const [sectionId, setSectionId] = useState(
    task?.section_id ? String(task.section_id) : (defaultSectionId ? String(defaultSectionId) : '')
  );
  const [dueDate, setDueDate]   = useState(task?.due_date || '');
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');

  // New-task attachment state
  const [newFile, setNewFile]   = useState(null);
  const newFileInputRef = useRef(null);

  // Hours log state
  const [logs, setLogs]         = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logDate, setLogDate]   = useState(today());
  const [logHrs, setLogHrs]     = useState('');
  const [logNote, setLogNote]   = useState('');

  // Activity tab state
  const [notes, setNotes]           = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [noteText, setNoteText]     = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [editNoteText, setEditNoteText] = useState('');
  const fileInputRef = useRef(null);

  const titleRef = useRef(null);
  useEffect(() => { if (isNew) titleRef.current?.focus(); }, []);

  useEffect(() => {
    if (!isNew && tab === 'hours') loadLogs();
    if (!isNew && tab === 'activity') loadActivity();
  }, [tab]);

  async function loadLogs() {
    setLogsLoading(true);
    try { setLogs(await api.getLogs(task.id)); }
    catch (err) { console.error(err); }
    finally { setLogsLoading(false); }
  }

  async function loadActivity() {
    setActivityLoading(true);
    try {
      const [n, a] = await Promise.all([api.getNotes(task.id), api.getAttachments(task.id)]);
      setNotes(n);
      setAttachments(a);
    } catch (err) { console.error(err); }
    finally { setActivityLoading(false); }
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
        section_id: sectionId ? Number(sectionId) : null,
      };
      const saved = isNew
        ? await api.createTask(data)
        : await api.updateTask(task.id, data);

      // Upload attachment if one was selected during task creation
      if (isNew && newFile) {
        await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = async (ev) => {
            try {
              await api.createAttachment(saved.id, {
                filename: newFile.name,
                mime_type: newFile.type || 'application/octet-stream',
                size: newFile.size,
                data: ev.target.result.split(',')[1],
              });
              resolve();
            } catch (err) { reject(err); }
          };
          reader.readAsDataURL(newFile);
        });
      }

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
      onSaved({ ...task, total_hours: null });
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

  async function handleAddNote(e) {
    e.preventDefault();
    if (!noteText.trim()) return;
    setSavingNote(true);
    try {
      await api.createNote(task.id, { body: noteText.trim() });
      setNoteText('');
      await loadActivity();
    } catch (err) {
      alert(err.message);
    } finally {
      setSavingNote(false);
    }
  }

  async function handleDeleteNote(nId) {
    if (!confirm('Delete this note?')) return;
    try {
      await api.deleteNote(task.id, nId);
      await loadActivity();
    } catch (err) { alert(err.message); }
  }

  async function handleSaveEditNote(nId) {
    if (!editNoteText.trim()) return;
    try {
      await api.updateNote(task.id, nId, { body: editNoteText.trim() });
      setEditingNote(null);
      await loadActivity();
    } catch (err) { alert(err.message); }
  }

  async function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { alert('File must be under 10MB'); return; }

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = ev.target.result.split(',')[1];
      try {
        await api.createAttachment(task.id, {
          filename: file.name,
          mime_type: file.type || 'application/octet-stream',
          size: file.size,
          data: base64,
        });
        await loadActivity();
      } catch (err) { alert(err.message); }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  async function handleDeleteAttachment(aId) {
    if (!confirm('Delete this attachment?')) return;
    try {
      await api.deleteAttachment(task.id, aId);
      await loadActivity();
    } catch (err) { alert(err.message); }
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
            <button className={`modal-tab${tab === 'activity' ? ' active' : ''}`} onClick={() => setTab('activity')}>
              <i className="ti ti-activity" /> Activity
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
                <label>Section</label>
                <select value={sectionId} onChange={e => setSectionId(e.target.value)}>
                  <option value="">None</option>
                  {sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>
            {isManager && (
              <div className="field">
                <label>Due date</label>
                <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
              </div>
            )}
            {isNew && (
              <div className="field">
                <label>Attachment <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>(optional)</span></label>
                <div className="new-task-file-row">
                  <input
                    ref={newFileInputRef}
                    type="file"
                    style={{ display: 'none' }}
                    onChange={e => {
                      const f = e.target.files[0];
                      if (f && f.size > 10 * 1024 * 1024) { alert('File must be under 10MB'); return; }
                      setNewFile(f || null);
                    }}
                  />
                  <button type="button" className="btn btn-sm" onClick={() => newFileInputRef.current?.click()}>
                    <i className="ti ti-upload" /> Choose file
                  </button>
                  {newFile
                    ? <span className="new-task-filename"><i className="ti ti-paperclip" /> {newFile.name}</span>
                    : <span style={{ fontSize: 12, color: 'var(--text-3)' }}>No file chosen</span>}
                  {newFile && (
                    <button type="button" className="icon-btn danger" onClick={() => { setNewFile(null); newFileInputRef.current.value = ''; }}>
                      <i className="ti ti-x" />
                    </button>
                  )}
                </div>
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
                <select value={logNote} onChange={e => setLogNote(e.target.value)} required>
                  <option value="" disabled>Select phase…</option>
                  <option value="[IC] Initial Concept">[IC] Initial Concept</option>
                  <option value="[IE] Internal Edits">[IE] Internal Edits</option>
                  <option value="[CE] Client Edits">[CE] Client Edits</option>
                  <option value="[FF] Final Files">[FF] Final Files</option>
                  <option value="[NA] Not Applicable">[NA] Not Applicable</option>
                </select>
                <button type="submit" className="btn btn-primary btn-sm"><i className="ti ti-plus" /></button>
              </div>
            </form>
            <div className="modal-actions">
              <button className="btn btn-primary" onClick={onClose}>Done</button>
            </div>
          </div>
        )}

        {/* Activity tab */}
        {tab === 'activity' && (
          <div className="activity-tab">
            {activityLoading ? (
              <p style={{ fontSize: 13, color: 'var(--text-3)', padding: '10px 0' }}>Loading…</p>
            ) : (
              <>
                {/* Notes */}
                <div className="activity-section-label">Notes</div>
                {notes.length === 0 && (
                  <p style={{ fontSize: 13, color: 'var(--text-3)', padding: '4px 0 10px' }}>No notes yet.</p>
                )}
                <div className="notes-list">
                  {notes.map(n => (
                    <div key={n.id} className="note-item">
                      <div className="note-header">
                        <span className="note-author">{n.user_name || 'Unknown'}</span>
                        <span className="note-meta">{fmtDateTime(n.created_at)}</span>
                        <div className="note-actions">
                          {(isManager || n.user_id === user.id) && (
                            <>
                              <button className="icon-btn" title="Edit" onClick={() => { setEditingNote(n.id); setEditNoteText(n.body); }}>
                                <i className="ti ti-pencil" />
                              </button>
                              <button className="icon-btn danger" title="Delete" onClick={() => handleDeleteNote(n.id)}>
                                <i className="ti ti-trash" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                      {editingNote === n.id ? (
                        <div className="note-edit">
                          <textarea
                            className="add-note-textarea"
                            value={editNoteText}
                            autoFocus
                            onChange={e => setEditNoteText(e.target.value)}
                          />
                          <div className="note-edit-actions">
                            <button className="btn btn-sm" onClick={() => setEditingNote(null)}>Cancel</button>
                            <button className="btn btn-primary btn-sm" onClick={() => handleSaveEditNote(n.id)}>Save</button>
                          </div>
                        </div>
                      ) : (
                        <div className="note-body">{n.body}</div>
                      )}
                    </div>
                  ))}
                </div>

                <form onSubmit={handleAddNote} className="add-note-form">
                  <textarea
                    className="add-note-textarea"
                    placeholder="Add a note…"
                    value={noteText}
                    onChange={e => setNoteText(e.target.value)}
                    rows={3}
                  />
                  <button type="submit" className="btn btn-primary btn-sm" disabled={savingNote || !noteText.trim()}>
                    {savingNote ? 'Saving…' : 'Add Note'}
                  </button>
                </form>

                {/* Attachments */}
                <div className="activity-section-label" style={{ marginTop: 20 }}>Attachments</div>
                {attachments.length === 0 && (
                  <p style={{ fontSize: 13, color: 'var(--text-3)', padding: '4px 0 10px' }}>No attachments yet.</p>
                )}
                <div className="attachments-list">
                  {attachments.map(a => (
                    <div key={a.id} className="attachment-item">
                      <i className={`ti ${fileIcon(a.mime_type)} attachment-icon`} />
                      <div className="attachment-info">
                        <span className="attachment-name">{a.filename}</span>
                        <span className="attachment-meta">{fmtSize(a.size)} · {fmtDateTime(a.created_at)}</span>
                      </div>
                      <div className="attachment-actions">
                        <button className="icon-btn" title="Download" onClick={() => api.downloadAttachment(task.id, a.id, a.filename)}>
                          <i className="ti ti-download" />
                        </button>
                        {isManager && (
                          <button className="icon-btn danger" title="Delete" onClick={() => handleDeleteAttachment(a.id)}>
                            <i className="ti ti-trash" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ marginTop: 10 }}>
                  <input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={handleFileUpload} />
                  <button className="btn upload-btn" onClick={() => fileInputRef.current?.click()}>
                    <i className="ti ti-upload" /> Upload File
                  </button>
                </div>
              </>
            )}

            <div className="modal-actions" style={{ marginTop: 16 }}>
              <button className="btn btn-primary" onClick={onClose}>Done</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
