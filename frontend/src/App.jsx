import { useState, useEffect } from 'react';
import { api } from './api';
import { initials, pal } from './utils';
import Login           from './components/Login';
import Board           from './components/Board';
import ListView        from './components/ListView';
import Sidebar         from './components/Sidebar';
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
  const [sections, setSections]   = useState([]);
  const [view, setView]           = useState('board');
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [modal, setModal]         = useState(null);

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

  useEffect(() => {
    if (user) loadAll();
  }, [user]);

  async function loadAll() {
    try {
      const [t, c, e, s] = await Promise.all([
        api.getTasks(),
        api.getClients(),
        api.getEmployees(),
        api.getSections(),
      ]);
      setTasks(t);
      setClients(c);
      setEmployees(e);
      setSections(s.sort((a, b) => a.position - b.position));
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

  async function refreshSections() {
    try {
      const s = await api.getSections();
      setSections(s.sort((a, b) => a.position - b.position));
    } catch {}
  }

  function logout() {
    localStorage.removeItem('pb_token');
    setUser(null); setTasks([]); setClients([]); setEmployees([]); setSections([]);
    setModal(null); setView('board'); setSelectedClient(null); setSelectedEmployee(null);
  }

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
    if (saved.total_hours === null) refreshTasks();
    setModal(null);
  }

  function handleTaskDeleted(id) {
    setTasks(prev => prev.filter(t => t.id !== id));
    setModal(null);
  }

  async function handleSectionCreate(data) {
    try {
      await api.createSection(data);
      await refreshSections();
    } catch (err) { alert(err.message); }
  }

  async function handleSectionUpdate(id, data) {
    try {
      await api.updateSection(id, data);
      await refreshSections();
    } catch (err) { alert(err.message); }
  }

  async function handleSectionDelete(id) {
    if (!confirm('Delete this section? Tasks will be moved to the first remaining section.')) return;
    try {
      await api.deleteSection(id);
      await Promise.all([refreshSections(), refreshTasks()]);
    } catch (err) { alert(err.message); }
  }

  async function handleTaskCreate(data) {
    try {
      const saved = await api.createTask(data);
      setTasks(prev => [saved, ...prev]);
    } catch (err) { alert(err.message); }
  }

  if (!authChecked) return null;
  if (!user) return <Login onLogin={u => setUser(u)} />;

  const isManager = user.role === 'manager';

  const visibleTasks = tasks.filter(t =>
    (!selectedClient  || String(t.client_id)   === String(selectedClient)) &&
    (!selectedEmployee || String(t.assignee_id) === String(selectedEmployee))
  );

  return (
    <div className="app-shell">
      <Sidebar
        user={user}
        clients={clients}
        selectedClient={selectedClient}
        onSelectClient={setSelectedClient}
        onOpenTeam={() => setModal({ type: 'employees' })}
        onOpenClients={() => setModal({ type: 'clients' })}
        onLogout={logout}
      />

      <div className="main-area">
        <div className="main-header">
          <div className="main-header-left">
            <h1 className="main-title">
              {selectedClient
                ? (clients.find(c => String(c.id) === String(selectedClient))?.name ?? 'Client')
                : 'All Projects'}
            </h1>
          </div>
          <div className="main-header-right">
            <div className="view-toggle">
              <button className={`view-btn${view === 'board' ? ' active' : ''}`} onClick={() => setView('board')}>
                <i className="ti ti-layout-kanban" /> Board
              </button>
              <button className={`view-btn${view === 'list' ? ' active' : ''}`} onClick={() => setView('list')}>
                <i className="ti ti-list" /> List
              </button>
              {isManager && (
                <button className={`view-btn${view === 'reports' ? ' active' : ''}`} onClick={() => setView('reports')}>
                  <i className="ti ti-chart-bar" /> Reports
                </button>
              )}
            </div>
            {isManager && view !== 'reports' && (
              <button className="btn btn-primary" onClick={() => setModal({ type: 'task', task: null, defaultSectionId: sections[0]?.id })}>
                <i className="ti ti-plus" /> Add task
              </button>
            )}
          </div>
        </div>

        {/* Employee filter strip — shown on board and list views */}
        {view !== 'reports' && employees.length > 0 && (
          <div className="employee-filter-bar">
            <button
              className={`emp-filter-chip ${!selectedEmployee ? 'active' : ''}`}
              onClick={() => setSelectedEmployee(null)}
            >
              All
            </button>
            {employees.map(emp => {
              const [bg, fg] = pal(employees, emp.id);
              const active = String(selectedEmployee) === String(emp.id);
              return (
                <button
                  key={emp.id}
                  className={`emp-filter-chip ${active ? 'active' : ''}`}
                  style={active ? { background: bg, color: fg, borderColor: fg } : {}}
                  onClick={() => setSelectedEmployee(active ? null : emp.id)}
                  title={emp.name}
                >
                  <span className="emp-filter-avatar" style={{ background: bg, color: fg }}>
                    {initials(emp.name)}
                  </span>
                  {emp.name.split(' ')[0]}
                </button>
              );
            })}
          </div>
        )}

        {view === 'board' && (
          <Board
            sections={sections}
            tasks={visibleTasks}
            employees={employees}
            clients={clients}
            user={user}
            onTasksChange={setTasks}
            onOpenTask={(task, sectionId) => setModal({ type: 'task', task, defaultSectionId: sectionId || task?.section_id || sections[0]?.id })}
          />
        )}

        {view === 'list' && (
          <ListView
            sections={sections}
            tasks={visibleTasks}
            clients={clients}
            employees={employees}
            user={user}
            onTaskClick={task => setModal({ type: 'task', task, defaultSectionId: task.section_id })}
            onTaskCreate={handleTaskCreate}
            onSectionCreate={handleSectionCreate}
            onSectionUpdate={handleSectionUpdate}
            onSectionDelete={handleSectionDelete}
          />
        )}

        {view === 'reports' && isManager && (
          <Reports employees={employees} clients={clients} />
        )}
      </div>

      {/* Modals */}
      {modal?.type === 'task' && (
        <TaskModal
          task={modal.task}
          sections={sections}
          employees={employees}
          clients={clients}
          user={user}
          defaultSectionId={modal.defaultSectionId}
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
