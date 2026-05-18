import { useState, useEffect } from 'react';
import { api } from './api';
import { pal, initials, fmtH, COLS } from './utils';
import Login           from './components/Login';
import Board           from './components/Board';
import Reports         from './components/Reports';
import TaskModal       from './components/TaskModal';
import EmployeeManager from './components/EmployeeManager';
import ClientManager   from './components/ClientManager';

export default function App() {
  const [user, setUser]           = useState(null);
  const [authChecked, setChecked] = useState(false);
  const [tasks, setTasks]         = useState([]);
  const [clients, setClients]     = useState([]);
  const [employees, setEmployees] = useState([]);
  const [view, setView]           = useState('board');
  const [filterClient, setFC]     = useState('all');
  const [filterEmp, setFE]        = useState('all');
  const [modal, setModal]         = useState(null);
  // modal shapes:
  //   null
  //   { type: 'task', task: null|{}, defaultStatus: 'todo' }
  //   { type: 'employees' }
  //   { type: 'clients' }

  // Verify token on mount
  useEffect(() => {
    const token = localStorage.getItem('pb_token');
    if (token) {
      api.me()
        .then(u => { setUser(u); setChecked(true); })
        .catch(() => { localStorage.removeItem('pb_token'); setChecked(true); });
    } else {
      setChecked(true);
    }
  }, []);

  // Load data after login
  useEffect(() => {
    if (user) loadAll();
  }, [user]);

  async function loadAll() {
    try {
      const [t, c, e] = await Promise.all([
        api.getTasks(),
        api.getClients(),
        user.role === 'manager' ? api.getEmployees() : Promise.resolve([]),
      ]);
      setTasks(t);
      setClients(c);
      setEmployees(e);
    } catch (err) {
      console.error(err);
    }
  }

  async function refreshTasks() {
    try { setTasks(await api.getTasks()); } catch {}
  }

  async function refreshClients() {
    try {
      const [c, t] = await Promise.all([api.getClients(), api.getTasks()]);
      setClients(c); setTasks(t);
    } catch {}
  }

  async function refreshEmployees() {
    try {
      const [e, t] = await Promise.all([api.getEmployees(), api.getTasks()]);
      setEmployees(e); setTasks(t);
    } catch {}
  }

  function logout() {
    localStorage.removeItem('pb_token');
    setUser(null); setTasks([]); setClients([]); setEmployees([]);
    setModal(null); setView('board');
  }

  // Modal callbacks
  function handleTaskSaved(saved) {
    setTasks(prev => {
      const idx = prev.findIndex(t => t.id === saved.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...prev[idx], ...saved };
        return next;
      }
      return [saved, ...prev];
    });
    // If total_hours was invalidated, refresh tasks silently
    if (saved.total_hours === null) refreshTasks();
    setModal(null);
  }

  function handleTaskDeleted(id) {
    setTasks(prev => prev.filter(t => t.id !== id));
    setModal(null);
  }

  if (!authChecked) return null;
  if (!user) return <Login onLogin={u => setUser(u)} />;

  const isManager = user.role === 'manager';
  const up = pal(employees, user.id) ?? [['#dbeafe', '#1e40af']][0];

  // Stats derived from visible tasks
  const visible = tasks.filter(t =>
    (filterClient === 'all' || String(t.client_id)   === filterClient) &&
    (filterEmp    === 'all' || String(t.assignee_id) === filterEmp)
  );
  const curMonth   = new Date().toISOString().slice(0, 7);
  const totalHrs   = visible.reduce((s, t) => s + Number(t.total_hours || 0), 0);
  const monthHrs   = 0; // month-specific hours require logs; shown in Reports
  const inProgress = visible.filter(t => t.status === 'inprogress').length;
  const done       = visible.filter(t => t.status === 'done').length;

  return (
    <div className="app">
      {/* Header */}
      <div className="header">
        <div className="logo"><i className="ti ti-layout-kanban" />Project Board</div>
        <div className="actions">
          {/* User pill */}
          <div className="user-pill">
            <span className="user-avatar" style={{ background: up?.[0] ?? '#dbeafe', color: up?.[1] ?? '#1e40af' }}>
              {initials(user.name)}
            </span>
            <span>{user.name}</span>
            <span style={{ fontSize: 10, color: 'var(--text-3)', textTransform: 'capitalize' }}>· {user.role}</span>
          </div>
          {isManager && (
            <>
              <button className="btn" onClick={() => setModal({ type: 'employees' })}>
                <i className="ti ti-users" />Team ({employees.length})
              </button>
              <button className="btn" onClick={() => setModal({ type: 'clients' })}>
                <i className="ti ti-building" />Clients
              </button>
              <button className="btn btn-primary" onClick={() => setModal({ type: 'task', task: null, defaultStatus: 'todo' })}>
                <i className="ti ti-plus" />Add task
              </button>
            </>
          )}
          <button className="btn" onClick={logout} title="Sign out">
            <i className="ti ti-logout" />
          </button>
        </div>
      </div>

      {/* Nav tabs */}
      <div className="nav-tabs">
        <button className={`nav-tab${view === 'board' ? ' active' : ''}`} onClick={() => setView('board')}>
          <i className="ti ti-layout-kanban" />Board
        </button>
        {isManager && (
          <button className={`nav-tab${view === 'reports' ? ' active' : ''}`} onClick={() => setView('reports')}>
            <i className="ti ti-chart-bar" />Hours report
          </button>
        )}
      </div>

      {/* Client filter */}
      <div className="filter-bar">
        <i className="ti ti-building filter-icon" />
        <button className={`chip${filterClient === 'all' ? ' active' : ''}`}
          style={filterClient === 'all' ? { background: 'var(--surface2)' } : {}}
          onClick={() => setFC('all')}>All clients</button>
        {clients.map((cl, i) => {
          const p = pal(clients, cl.id);
          const active = filterClient === String(cl.id);
          return (
            <button key={cl.id} className={`chip${active ? ' active' : ''}`}
              style={active ? { background: p[0], color: p[1] } : {}}
              onClick={() => setFC(String(cl.id))}>{cl.name}</button>
          );
        })}
      </div>

      {/* Employee filter (manager only) */}
      {isManager && (
        <div className="filter-bar">
          <i className="ti ti-user filter-icon" />
          <button className={`chip${filterEmp === 'all' ? ' active' : ''}`}
            style={filterEmp === 'all' ? { background: 'var(--surface2)' } : {}}
            onClick={() => setFE('all')}>Everyone</button>
          {employees.map(e => {
            const p = pal(employees, e.id);
            const active = filterEmp === String(e.id);
            return (
              <button key={e.id} className={`chip${active ? ' active' : ''}`}
                style={active ? { background: p[0], color: p[1] } : {}}
                onClick={() => setFE(String(e.id))}>{e.name.split(' ')[0]}</button>
            );
          })}
        </div>
      )}

      {/* Stats */}
      <div className="stats">
        <div className="stat">
          <div className="stat-label">Hours logged</div>
          <div className="stat-val">{fmtH(totalHrs)}</div>
          <div className="stat-sub">{filterClient !== 'all' ? (clients.find(c => String(c.id) === filterClient)?.name ?? '') : 'All clients'}</div>
        </div>
        <div className="stat">
          <div className="stat-label">Total tasks</div>
          <div className="stat-val">{visible.length}</div>
          <div className="stat-sub">{filterEmp !== 'all' ? (employees.find(e => String(e.id) === filterEmp)?.name ?? '') : isManager ? 'All employees' : 'Assigned to you'}</div>
        </div>
        <div className="stat">
          <div className="stat-label">In progress</div>
          <div className="stat-val">{inProgress}</div>
          <div className="stat-sub">active tasks</div>
        </div>
        <div className="stat">
          <div className="stat-label">Completed</div>
          <div className="stat-val">{done}</div>
          <div className="stat-sub">tasks done</div>
        </div>
      </div>

      {/* Main view */}
      {view === 'board' && (
        <Board
          tasks={tasks}
          employees={employees}
          clients={clients}
          user={user}
          filterClient={filterClient}
          filterEmployee={filterEmp}
          onTasksChange={setTasks}
          onOpenTask={(task, defaultStatus) => setModal({ type: 'task', task, defaultStatus: defaultStatus || task?.status || 'todo' })}
        />
      )}
      {view === 'reports' && isManager && (
        <Reports employees={employees} clients={clients} />
      )}

      {/* Modals */}
      {modal?.type === 'task' && (
        <TaskModal
          task={modal.task}
          employees={employees}
          clients={clients}
          user={user}
          defaultStatus={modal.defaultStatus}
          onClose={() => setModal(null)}
          onSaved={handleTaskSaved}
          onDeleted={handleTaskDeleted}
        />
      )}
      {modal?.type === 'employees' && (
        <EmployeeManager
          employees={employees}
          tasks={tasks}
          onClose={() => setModal(null)}
          onRefresh={refreshEmployees}
        />
      )}
      {modal?.type === 'clients' && (
        <ClientManager
          clients={clients}
          tasks={tasks}
          onClose={() => setModal(null)}
          onRefresh={refreshClients}
        />
      )}
    </div>
  );
}
