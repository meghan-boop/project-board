const BASE = import.meta.env.VITE_API_URL || '';

function token() { return localStorage.getItem('pb_token'); }

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

async function download(path, filename) {
  const res = await fetch(BASE + path, {
    headers: { Authorization: `Bearer ${token()}` },
  });
  if (!res.ok) throw new Error('Download failed');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export const api = {
  login:   (email, password) => req('POST', '/api/auth/login', { email, password }),
  me:      ()                 => req('GET',  '/api/auth/me'),

  getEmployees: ()            => req('GET',    '/api/users/employees'),
  getUsers:     ()            => req('GET',    '/api/users'),
  createUser:   (data)        => req('POST',   '/api/users', data),
  deleteUser:   (id)          => req('DELETE', `/api/users/${id}`),

  getClients:   ()            => req('GET',    '/api/clients'),
  createClient: (name)        => req('POST',   '/api/clients', { name }),
  deleteClient: (id)          => req('DELETE', `/api/clients/${id}`),

  getSections:    ()          => req('GET',    '/api/sections'),
  createSection:  (data)      => req('POST',   '/api/sections', data),
  updateSection:  (id, data)  => req('PUT',    `/api/sections/${id}`, data),
  deleteSection:  (id)        => req('DELETE', `/api/sections/${id}`),

  getTasks:     ()            => req('GET',    '/api/tasks'),
  createTask:   (data)        => req('POST',   '/api/tasks', data),
  updateTask:   (id, data)    => req('PUT',    `/api/tasks/${id}`, data),
  deleteTask:   (id)          => req('DELETE', `/api/tasks/${id}`),

  getLogs:      (taskId)             => req('GET',    `/api/tasks/${taskId}/logs`),
  createLog:    (taskId, data)       => req('POST',   `/api/tasks/${taskId}/logs`, data),
  deleteLog:    (taskId, logId)      => req('DELETE', `/api/tasks/${taskId}/logs/${logId}`),

  getNotes:     (taskId)             => req('GET',    `/api/tasks/${taskId}/notes`),
  createNote:   (taskId, data)       => req('POST',   `/api/tasks/${taskId}/notes`, data),
  updateNote:   (taskId, nId, data)  => req('PUT',    `/api/tasks/${taskId}/notes/${nId}`, data),
  deleteNote:   (taskId, nId)        => req('DELETE', `/api/tasks/${taskId}/notes/${nId}`),

  getAttachments:    (taskId)           => req('GET',    `/api/tasks/${taskId}/attachments`),
  createAttachment:  (taskId, data)     => req('POST',   `/api/tasks/${taskId}/attachments`, data),
  downloadAttachment:(taskId, aId, name)=> download(`/api/tasks/${taskId}/attachments/${aId}/download`, name),
  deleteAttachment:  (taskId, aId)      => req('DELETE', `/api/tasks/${taskId}/attachments/${aId}`),

  getReports: (params) => req('GET', '/api/reports/hours' + (params ? '?' + new URLSearchParams(params) : '')),
};
