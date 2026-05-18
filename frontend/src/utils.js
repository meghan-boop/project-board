export const COLS = [
  { id: 'backlog',    label: 'Backlog',      color: '#94918a' },
  { id: 'todo',       label: 'To do',        color: '#3b82f6' },
  { id: 'inprogress', label: 'In progress',  color: '#f59e0b' },
  { id: 'review',     label: 'Review',       color: '#ec4899' },
  { id: 'done',       label: 'Done',         color: '#10b981' },
];

export const PALETTES = [
  ['#dbeafe', '#1e40af'], ['#dcfce7', '#166534'], ['#fef3c7', '#92400e'],
  ['#ede9fe', '#4c1d95'], ['#fce7f3', '#831843'], ['#d1fae5', '#065f46'],
  ['#ffedd5', '#7c2d12'], ['#f1f5f9', '#334155'], ['#fef9c3', '#713f12'],
];

export const BAR_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6',
  '#22c55e', '#f97316', '#6b7280', '#eab308',
];

export function pal(arr, id) {
  const i = arr.findIndex(x => String(x.id) === String(id));
  return PALETTES[Math.max(i, 0) % PALETTES.length];
}

export function initials(name) {
  return (name || '').trim().split(/\s+/).map(w => w[0]?.toUpperCase() || '').slice(0, 2).join('');
}

export function fmtH(n) {
  return (Math.round(Number(n) * 10) / 10) + 'h';
}

export function fmtDue(d) {
  if (!d) return null;
  const today = new Date().toISOString().slice(0, 10);
  const diff = Math.round((new Date(d + 'T00:00:00') - new Date(today + 'T00:00:00')) / 864e5);
  const label = diff === 0
    ? 'Today'
    : new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return { label, overdue: diff <= 0 };
}

export function monthLabel(ym) {
  const [y, m] = ym.split('-');
  return new Date(+y, +m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export function today() {
  return new Date().toISOString().slice(0, 10);
}
