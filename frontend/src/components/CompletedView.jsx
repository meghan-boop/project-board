import { useState } from 'react';
import { api } from '../api';
import { fmtH, fmtDue, initials, pal } from '../utils';

export default function CompletedView({ tasks, employees, clients, user, onTasksChange, onTaskClick }) {
  const [search, setSearch] = useState('');

  const completed = tasks.filter(t =>
    t.completed &&
    (user.role === 'manager' || String(t.assignee_id) === String(user.id)) &&
    (search === '' || t.title.toLowerCase().includes(search.toLowerCase()))
  );

  async function handleRestore(e, task) {
    e.stopPropagation();
    onTasksChange(tasks.map(t => t.id === task.id ? { ...t, completed: 0 } : t));
    try { await api.updateTask(task.id, { completed: false }); }
    catch (err) { onTasksChange(tasks); alert(err.message); }
  }

  return (
    <div className="completed-view">
      <div className="completed-search-row">
        <i className="ti ti-search" />
        <input
          className="completed-search"
          placeholder="Search completed tasks…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          autoFocus
        />
        {search && (
          <button className="icon-btn" onClick={() => setSearch('')}><i className="ti ti-x" /></button>
        )}
      </div>

      {completed.length === 0 ? (
        <div className="empty" style={{ marginTop: 40 }}>
          {search ? 'No completed tasks match your search.' : 'No completed tasks yet.'}
        </div>
      ) : (
        <div className="completed-list">
          {completed.map(task => {
            const assignee = employees.find(e => e.id === task.assignee_id);
            const client = clients.find(c => c.id === task.client_id);
            const [cBg, cFg] = client ? pal(clients, client.id) : ['#f1f5f9', '#334155'];
            const due = fmtDue(task.due_date);
            return (
              <div key={task.id} className="completed-row" onClick={() => onTaskClick(task)}>
                <button
                  className="task-complete-btn done"
                  title="Restore task"
                  onClick={e => handleRestore(e, task)}
                >
                  <i className="ti ti-circle-check-filled" />
                </button>
                <span className="completed-title">{task.title}</span>
                <div className="completed-meta">
                  {client && (
                    <span className="client-chip" style={{ background: cBg, color: cFg }}>{client.name}</span>
                  )}
                  {assignee && (
                    <span className="assignee-chip" title={assignee.name}>{initials(assignee.name)}</span>
                  )}
                  <span className="completed-hrs">{fmtH(task.total_hours || 0)}</span>
                  {due && (
                    <span className={`task-col-due${due.overdue ? ' overdue' : ''}`}>{due.label}</span>
                  )}
                </div>
              </div>
            );
          })}
          <div style={{ fontSize: 12, color: 'var(--text-3)', padding: '10px 20px' }}>
            {completed.length} completed task{completed.length !== 1 ? 's' : ''}
            {search ? ' matching search' : ''}
          </div>
        </div>
      )}
    </div>
  );
}
