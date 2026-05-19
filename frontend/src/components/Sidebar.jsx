import { initials, pal, PALETTES } from '../utils';

export default function Sidebar({ user, clients, selectedClient, onSelectClient, onOpenTeam, onOpenClients, onLogout }) {
  const sorted = [...clients].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <span className="sidebar-logo-icon"><i className="ti ti-layout-kanban" /></span>
        <span className="sidebar-logo-text">ProjectBoard</span>
      </div>

      <nav className="sidebar-section">
        <div
          className={`sidebar-item ${!selectedClient ? 'active' : ''}`}
          onClick={() => onSelectClient(null)}
        >
          <i className="ti ti-layout-grid" />
          <span>All Projects</span>
        </div>
      </nav>

      <div className="sidebar-section sidebar-clients">
        <div className="sidebar-label">Clients</div>
        {sorted.map(c => {
          const [bg, fg] = pal(clients, c.id);
          return (
            <div
              key={c.id}
              className={`sidebar-item ${selectedClient === c.id ? 'active' : ''}`}
              onClick={() => onSelectClient(c.id)}
            >
              <span className="sidebar-dot" style={{ background: bg, border: `1.5px solid ${fg}` }} />
              <span className="sidebar-client-name">{c.name}</span>
            </div>
          );
        })}
        {user.role === 'manager' && (
          <div className="sidebar-item sidebar-add" onClick={onOpenClients}>
            <i className="ti ti-plus" />
            <span>Add / Manage Clients</span>
          </div>
        )}
      </div>

      {user.role === 'manager' && (
        <div className="sidebar-section">
          <div className="sidebar-item" onClick={onOpenTeam}>
            <i className="ti ti-users" />
            <span>Team</span>
          </div>
        </div>
      )}

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-avatar">{initials(user.name)}</div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{user.name}</div>
            <div className="sidebar-user-role">{user.role}</div>
          </div>
        </div>
        <button className="sidebar-logout" onClick={onLogout} title="Logout">
          <i className="ti ti-logout" />
        </button>
      </div>
    </aside>
  );
}
