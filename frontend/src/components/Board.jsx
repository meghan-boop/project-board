import { useRef } from 'react';
import { pal, initials, fmtH, fmtDue } from '../utils';
import { api } from '../api';

export default function Board({ sections, tasks, employees, clients, user, onTasksChange, onOpenTask }) {
  const dragId = useRef(null);
  const isManager = user.role === 'manager';

  function canDrag(task) {
    return isManager || String(task.assignee_id) === String(user.id);
  }

  function onDragStart(e, taskId) {
    dragId.current = taskId;
    e.currentTarget.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
  }

  function onDragEnd(e) {
    e.currentTarget.classList.remove('dragging');
    document.querySelectorAll('.drop-zone').forEach(z => z.classList.remove('drag-active'));
    dragId.current = null;
  }

  function onDragOver(e) {
    e.preventDefault();
    e.currentTarget.classList.add('drag-active');
  }

  function onDragLeave(e) {
    if (!e.currentTarget.contains(e.relatedTarget)) {
      e.currentTarget.classList.remove('drag-active');
    }
  }

  async function onDrop(e, sectionId) {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-active');
    const id = dragId.current;
    if (!id) return;
    const task = tasks.find(t => t.id === id);
    if (!task || task.section_id === sectionId) return;

    onTasksChange(tasks.map(t => t.id === id ? { ...t, section_id: sectionId } : t));
    try {
      await api.updateTask(id, { section_id: sectionId });
    } catch (err) {
      onTasksChange(tasks);
      alert(err.message);
    }
  }

  return (
    <div className="board" id="board">
      {sections.map(sec => {
        const colCards = tasks.filter(t => t.section_id === sec.id);
        const colHrs   = colCards.reduce((s, t) => s + Number(t.total_hours || 0), 0);

        return (
          <div className="col" key={sec.id}>
            <div className="col-header">
              <span className="col-label">
                <span className="col-dot" style={{ background: sec.color || '#8b5cf6' }} />
                {sec.name}
              </span>
              <div className="col-meta">
                {colHrs > 0 && (
                  <span className="col-hrs">
                    <i className="ti ti-clock" style={{ fontSize: 11, verticalAlign: -1 }} /> {fmtH(colHrs)}
                  </span>
                )}
                <span className="col-count">{colCards.length}</span>
              </div>
            </div>

            <div
              className="card-list drop-zone"
              data-col={sec.id}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={e => onDrop(e, sec.id)}
            >
              {colCards.map(task => {
                const cl  = clients.find(c => c.id === task.client_id);
                const emp = employees.find(e => e.id === task.assignee_id);
                const cp  = cl  ? pal(clients,   cl.id)  : null;
                const ep  = emp ? pal(employees, emp.id) : null;
                const due = fmtDue(task.due_date);
                const draggable = canDrag(task);

                return (
                  <div
                    key={task.id}
                    className="card"
                    draggable={draggable}
                    onDragStart={draggable ? e => onDragStart(e, task.id) : undefined}
                    onDragEnd={draggable ? onDragEnd : undefined}
                    onDoubleClick={() => onOpenTask(task)}
                    style={{ cursor: draggable ? 'grab' : 'default' }}
                  >
                    {cl && cp && (
                      <div className="card-client" style={{ background: cp[0], color: cp[1] }}>
                        <i className="ti ti-building" style={{ fontSize: 11 }} /> {cl.name}
                      </div>
                    )}
                    <div className="card-title">{task.title}</div>
                    <div className="card-meta">
                      <span className={`badge pri-${task.priority}`}>
                        {task.priority[0].toUpperCase() + task.priority.slice(1)}
                      </span>
                      {emp && ep && (
                        <span className="emp-pill" style={{ background: ep[0], color: ep[1] }}>
                          {initials(emp.name)} {emp.name.split(' ')[0]}
                        </span>
                      )}
                      {due && (
                        <span className={`due${due.overdue ? ' overdue' : ''}`}>
                          <i className={`ti ti-${due.overdue ? 'clock' : 'calendar'}`} />
                          {due.label}
                        </span>
                      )}
                      <span className="card-hrs">
                        <i className="ti ti-clock" />
                        <b>{fmtH(task.total_hours || 0)}</b>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {isManager && (
              <button className="add-card-btn" onClick={() => onOpenTask(null, sec.id)}>
                <i className="ti ti-plus" /> Add task
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
