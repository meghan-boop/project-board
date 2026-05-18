const BASE = import.meta.env.VITE_API_URL || '';

function token() {
  return localStorage.getItem('pb_token');
}

async function req(method, path, body) {
  const headers = { 'Content-Type': 'application/json' };
  const t = token();
  if (t) headers['Authorization'] = `Bearer ${t}`;
  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  // Auth
  login:   (email, password) => req('POST', '/api/auth/login', { email, password }),
  me:      ()                 => req('GET',  '/api/auth/me'),

  // Users
  getEmployees: ()           => req('GET',    '/api/users/employees'),
  getUsers:     ()           => req('GET',    '/api/users'),
  createUser:   (data)       => req('POST',   '/api/users', data),
  deleteUser:   (id)         => req('DELETE', `/api/users/${id}`),

  // Clients
  getClients:   ()           => req('GET',    '/api/clients'),
  createClient: (name)       => req('POST',   '/api/clients', { name }),
  deleteClient: (id)         => req('DELETE', `/api/clients/${id}`),

  // Tasks
  getTasks:     ()           => req('GET',    '/api/tasks'),
  createTask:   (data)       => req('POST',   '/api/tasks', data),
  updateTask:   (id, data)   => req('PUT',    `/api/tasks/${id}`, data),
  deleteTask:   (id)         => req('DELETE', `/api/tasks/${id}`),

  // Time logs
  getLogs:      (taskId)             => req('GET',    `/api/tasks/${taskId}/logs`),
  createLog:    (taskId, data)       => req('POST',   `/api/tasks/${taskId}/logs`, data),
  deleteLog:    (taskId, logId)      => req('DELETE', `/api/tasks/${taskId}/logs/${logId}`),

  // Reports
  getReports: (params) => req('GET', '/api/reports/hours' + (params ? '?' + new URLSearchParams(params) : '')),
};
