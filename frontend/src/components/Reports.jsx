import { useState, useEffect } from 'react';
import { api } from '../api';
import { BAR_COLORS, fmtH, monthLabel } from '../utils';

export default function Reports({ employees, clients }) {
  const [data, setData]           = useState(null);
  const [filterEmp, setFilterEmp] = useState('');
  const [filterCl, setFilterCl]   = useState('');
  const [loading, setLoading]     = useState(true);

  useEffect(() => { load(); }, [filterEmp, filterCl]);

  async function load() {
    setLoading(true);
    try {
      const params = {};
      if (filterEmp) params.employee_id = filterEmp;
      if (filterCl)  params.client_id   = filterCl;
      setData(await api.getReports(Object.keys(params).length ? params : undefined));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function exportCSV(type) {
    if (!data) return;
    let rows = [], filename = '';

    if (type === 'employee') {
      filename = 'hours-by-employee.csv';
      rows = [['Employee', 'Total hours', 'Tasks']];
      data.byEmployee.forEach(r => rows.push([r.name, Math.round(r.total_hours * 10) / 10, r.task_count]));
    } else if (type === 'client') {
      filename = 'hours-by-client.csv';
      rows = [['Client', 'Total hours', 'Tasks']];
      data.byClient.forEach(r => rows.push([r.name, Math.round(r.total_hours * 10) / 10, r.task_count]));
    } else if (type === 'month') {
      filename = 'hours-by-month.csv';
      rows = [['Month', 'Total hours', 'Tasks with hours']];
      data.byMonth.forEach(r => rows.push([monthLabel(r.month), Math.round(r.total_hours * 10) / 10, r.task_count]));
    } else {
      filename = 'hours-full-detail.csv';
      rows = [['Date', 'Employee', 'Client', 'Task', 'Hours', 'Note', 'Status']];
      data.detail.forEach(r => rows.push([r.date, r.employee, r.client, r.task, Math.round(r.hours * 10) / 10, r.note, r.status]));
    }

    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = filename;
    a.click();
  }

  function BarRows({ rows, maxKey = 'total_hours', colorOffset = 0 }) {
    const max = Math.max(...rows.map(r => r[maxKey]), 1);
    if (!rows.length) return <div className="empty">No data for current filter.</div>;
    return rows.map((r, i) => (
      <div className="report-row" key={r.id ?? r.month ?? r.name}>
        <span className="report-name" title={r.name ?? monthLabel(r.month)}>{r.name ?? monthLabel(r.month)}</span>
        <div className="report-bar-wrap">
          <div className="report-bar" style={{ width: Math.round(r[maxKey] / max * 100) + '%', background: BAR_COLORS[(i + colorOffset) % BAR_COLORS.length] }} />
        </div>
        <span className="report-hrs">{fmtH(r[maxKey])}</span>
        <span className="report-tasks">{r.task_count} task{r.task_count !== 1 ? 's' : ''}</span>
      </div>
    ));
  }

  return (
    <div>
      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: '1rem', flexWrap: 'wrap' }}>
        <div className="field" style={{ margin: 0, minWidth: 160 }}>
          <select value={filterEmp} onChange={e => setFilterEmp(e.target.value)}>
            <option value="">All employees</option>
            {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
        </div>
        <div className="field" style={{ margin: 0, minWidth: 160 }}>
          <select value={filterCl} onChange={e => setFilterCl(e.target.value)}>
            <option value="">All clients</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        {(filterEmp || filterCl) && (
          <button className="btn btn-sm" onClick={() => { setFilterEmp(''); setFilterCl(''); }}>
            <i className="ti ti-x" /> Clear filter
          </button>
        )}
      </div>

      {/* Export bar */}
      <div className="export-bar">
        <span><i className="ti ti-download" style={{ fontSize: 14, verticalAlign: -2 }} /> Export CSV:</span>
        <button className="btn btn-sm" onClick={() => exportCSV('employee')}><i className="ti ti-users" />By employee</button>
        <button className="btn btn-sm" onClick={() => exportCSV('client')}><i className="ti ti-building" />By client</button>
        <button className="btn btn-sm" onClick={() => exportCSV('month')}><i className="ti ti-calendar" />By month</button>
        <button className="btn btn-sm" onClick={() => exportCSV('detail')}><i className="ti ti-list" />Full detail</button>
      </div>

      {loading && <div className="empty">Loading…</div>}

      {!loading && data && (
        <>
          <div className="report-section">
            <h4>Hours by employee <span>{data.byEmployee.length} employees</span></h4>
            <BarRows rows={data.byEmployee} colorOffset={0} />
          </div>
          <div className="report-section">
            <h4>Hours by client <span>{data.byClient.length} clients</span></h4>
            <BarRows rows={data.byClient} colorOffset={3} />
          </div>
          <div className="report-section">
            <h4>Hours by month <span>{data.byMonth.length} month{data.byMonth.length !== 1 ? 's' : ''}</span></h4>
            <BarRows rows={data.byMonth} maxKey="total_hours" colorOffset={6} />
          </div>
        </>
      )}
    </div>
  );
}
