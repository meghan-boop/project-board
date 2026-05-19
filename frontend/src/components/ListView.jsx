import { useState } from 'react';
import { fmtDue, initials, pal } from '../utils';
import { api } from '../api';

export default function ListView({ sections, tasks, clients, employees, user, onTaskClick, onOpenTask, onSectionCreate, onSectionUpdate, onSectionDelete, onTasksChange }) {
  const [collapsed, setCollapsed] = useState({});
  const [editingSection, setEditingSection] = useState(null);
  const [editSectionVal, setEditSectionVal] = useState('');
  const [addingSection, setAddingSection] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');

  function toggleCollapse(id) {
    setCollapsed(p => ({ ...p, [id]: !p[id] }));
  }

  function startEditSection(sec) {
    setEditingSection(sec.id);
    setEditSectionVal(sec.name);
  }

  function commitEditSection(sec) {
    if (editSectionVal.trim() && editSectionVal !== sec.name) {
      onSectionUpdate(sec.id, { name: editSectionVal.trim() });
    }
    setEditingSection(null);
  }

  async function submitNewSection() {
    const name = newSectionName.trim();
    if (!name) return setAddingSection(false);
    await onSectionCreate({ name });
    setNewSectionName('');
    setAddingSection(false);
  }

  async function handleComplete(e, task) {
    e.stopPropagation();
    onTasksChange(tasks.map(t => t.id === task.id ? { ...t, completed: 1 } : t));
    try { await api.updateTask(task.id, { completed: true }); }
    catch (err) { onTasksChange(tasks); alert(err.message); }
  }

  const PRIORITIES = { high: 'priority-high', medium: 'priority-med', low: 'priority-low' };

  return (
    <div className="list-view">
      <div className="list-col-header">
        <span className="lch-title">Task</span>
        <span className="lch-assignee">Assignee</span>
        <span className="lch-client">Client</span>
        <span className="lch-priority">Priority</span>
        <span className="lch-due">Due</span>
      </div>

      {sections.map(sec => {
        const secTasks = tasks.filter(t => t.section_id === sec.id && !t.completed);
        const isCollapsed = collapsed[sec.id];
        return (
          <div key={sec.id} className="section-group">
            <div className="section-header-row" style={{ '--sec-color': sec.color || '#8b5cf6' }}>
              <button className={`section-chevron ${isCollapsed ? 'collapsed' : ''}`} onClick={() => toggleCollapse(sec.id)}>
                <i className="ti ti-chevron-down" />
              </button>
              <span className="section-dot" style={{ background: sec.color || '#8b5cf6' }} />
              {editingSection === sec.id ? (
                <input
                  className="section-name-input"
                  value={editSectionVal}
                  autoFocus
                  onChange={e => setEditSectionVal(e.target.value)}
                  onBlur={() => commitEditSection(sec)}
                  onKeyDown={e => { if (e.key === 'Enter') commitEditSection(sec); if (e.key === 'Escape') setEditingSection(null); }}
                />
              ) : (
                <span className="section-name" onDoubleClick={() => user.role === 'manager' && startEditSection(sec)}>{sec.name}</span>
              )}
              <span className="section-count">{secTasks.length}</span>
              {user.role === 'manager' && (
                <div className="section-actions">
                  <button title="Rename" onClick={() => startEditSection(sec)}><i className="ti ti-pencil" /></button>
                  <button title="Delete section" onClick={() => onSectionDelete(sec.id)} className="danger"><i className="ti ti-trash" /></button>
                </div>
              )}
            </div>

            {!isCollapsed && (
              <>
                {secTasks.map(task => {
                  const due = fmtDue(task.due_date);
                  const assignee = employees.find(e => e.id === task.assignee_id);
                  const client = clients.find(c => c.id === task.client_id);
                  const [cBg, cFg] = client ? pal(clients, client.id) : ['#f1f5f9', '#334155'];
                  return (
                    <div key={task.id} className="task-row" onClick={() => onTaskClick(task)}>
                      <span className="task-title-cell">
                        <button className="task-complete-btn list" title="Mark complete" onClick={e => handleComplete(e, task)}>
                          <i className="ti ti-circle-check" />
                        </button>
                        <span className={`task-priority-dot ${PRIORITIES[task.priority] || ''}`} />
                        <span className="task-title-text">{task.title}</span>
                      </span>
                      <span className="task-col-assignee">
                        {assignee
                          ? <span className="assignee-chip">{initials(assignee.name)}</span>
                          : <span className="unassigned-chip">—</span>}
                      </span>
                      <span className="task-col-client">
                        {client
                          ? <span className="client-chip" style={{ background: cBg, color: cFg }}>{client.name}</span>
                          : <span className="unassigned-chip">—</span>}
                      </span>
                      <span className="task-col-priority">
                        <span className={`priority-badge ${task.priority}`}>{task.priority}</span>
                      </span>
                      <span className={`task-col-due ${due?.overdue ? 'overdue' : ''}`}>
                        {due?.label || '—'}
                      </span>
                    </div>
                  );
                })}

                {user.role === 'manager' && (
                  <div className="list-add-row add-trigger" onClick={() => onOpenTask(null, sec.id)}>
                    <i className="ti ti-plus" /> Add task
                  </div>
                )}
              </>
            )}
          </div>
        );
      })}

      {user.role === 'manager' && (
        addingSection ? (
          <div className="list-add-section">
            <input
              className="list-add-input"
              placeholder="Section name…"
              autoFocus
              value={newSectionName}
              onChange={e => setNewSectionName(e.target.value)}
              onBlur={submitNewSection}
              onKeyDown={e => { if (e.key === 'Enter') submitNewSection(); if (e.key === 'Escape') setAddingSection(false); }}
            />
          </div>
        ) : (
          <div className="list-add-section add-trigger" onClick={() => setAddingSection(true)}>
            <i className="ti ti-plus" /> Add section
          </div>
        )
      )}
    </div>
  );
}
