import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { adminAPI } from '../../services/api';
import DetailDrawer from '../../components/admin/DetailDrawer';
import DataTable from '../../components/admin/DataTable';
import LoadingState from '../../components/admin/LoadingState';
import EmptyState from '../../components/admin/EmptyState';
import ErrorState from '../../components/admin/ErrorState';
import RefreshButton from '../../components/admin/RefreshButton';
import FilterBar from '../../components/admin/FilterBar';
import Pagination from '../../components/admin/Pagination';
import CaseActions from '../../components/admin/CaseActions';
import { shortId, formatTime, truncate } from '../../utils/format';

const STATUS_COLORS = {
  Pending: 'bg-yellow-900/50 text-yellow-400',
  Resolved: 'bg-green-900/50 text-green-400',
};
const PRIORITY_COLORS = {
  High: 'bg-red-900/50 text-red-400',
  Medium: 'bg-yellow-900/50 text-yellow-400',
  Low: 'bg-green-900/50 text-green-400',
};

const TodayCasesPanel = ({ onClose, title }) => {
  const [data, setData] = useState({ total: 0, cases: [] });
  const [page, setPage] = useState(1);
  const [priority, setPriority] = useState('');
  const [sortBy, setSortBy] = useState('latest');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminAPI.getCases({ page, size: 20, today: 1, priority: priority || undefined });
      setData({ total: res.data.total, cases: res.data.cases });
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to load today\'s cases');
    } finally {
      setLoading(false);
    }
  }, [page, priority]);

  useEffect(() => { load(); }, [load]);

  const sorted = useMemo(() => {
    const arr = [...data.cases];
    const order = { High: 0, Medium: 1, Low: 2 };
    switch (sortBy) {
      case 'oldest': return arr.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      case 'priority': return arr.sort((a, b) => (order[a.priority] ?? 3) - (order[b.priority] ?? 3));
      case 'status': return arr.sort((a, b) => (a.status || '').localeCompare(b.status || ''));
      default: return arr.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
  }, [data.cases, sortBy]);

  const columns = [
    { key: 'id', label: 'Case ID', render: (r) => <span className="font-mono text-xs text-gray-400">{shortId(r.id)}</span> },
    { key: 'userEmail', label: 'User', render: (r) => <span className="text-white font-medium">{r.userEmail || '—'}</span> },
    { key: 'createdAt', label: 'Created Time', render: (r) => <span className="text-gray-300">{formatTime(r.createdAt)}</span> },
    {
      key: 'locationLink', label: 'Location', render: (r) =>
        r.locationLink
          ? <a href={r.locationLink} target="_blank" rel="noreferrer" className="text-purple-400 underline hover:text-purple-300">View</a>
          : <span className="text-gray-500">—</span>
    },
    { key: 'caseType', label: 'Case Type', render: (r) => <span className="text-gray-300">{r.caseType || '—'}</span> },
    {
      key: 'priority', label: 'Priority', render: (r) =>
        r.priority
          ? <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PRIORITY_COLORS[r.priority] || 'bg-gray-700 text-gray-300'}`}>{r.priority}</span>
          : <span className="text-gray-500">—</span>
    },
    {
      key: 'status', label: 'Status', render: (r) =>
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[r.status] || 'bg-gray-700 text-gray-300'}`}>{r.status || '—'}</span>
    },
    { key: 'assignedOfficer', label: 'Assigned Officer', render: (r) => <span className="text-gray-300">{r.assignedOfficer || '—'}</span> },
    { key: 'actions', label: 'Actions', render: (r) => <CaseActions row={r} onChanged={load} /> },
  ];

  const filters = [
    {
      key: 'sortBy', label: 'Sort by',
      options: [
        { value: 'latest', label: 'Latest' },
        { value: 'oldest', label: 'Oldest' },
        { value: 'priority', label: 'Priority' },
        { value: 'status', label: 'Status' },
      ],
    },
    {
      key: 'priority', label: 'Priority',
      options: [
        { value: 'High', label: 'High' },
        { value: 'Medium', label: 'Medium' },
        { value: 'Low', label: 'Low' },
      ],
    },
  ];

  const handleChange = (key, value) => {
    if (key === 'sortBy') { setSortBy(value); return; }
    setPriority(value); setPage(1);
  };

  return (
    <DetailDrawer
      title={title || 'Cases Today'}
      subtitle="Cases created today"
      onClose={onClose}
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <FilterBar filters={filters} values={{ sortBy, priority }} onChange={handleChange} />
          <RefreshButton onClick={load} loading={loading} />
        </div>

        {error ? (
          <ErrorState message={error} onRetry={load} />
        ) : loading ? (
          <LoadingState label="Loading today's cases..." />
        ) : data.cases.length === 0 ? (
          <EmptyState title="No cases today" message="No SOS cases have been created today." />
        ) : (
          <>
            <DataTable columns={columns} rows={sorted} rowKey={(r) => r.id} />
            <Pagination total={data.total} page={page} size={20} onPageChange={setPage} />
          </>
        )}
      </div>
    </DetailDrawer>
  );
};

export default TodayCasesPanel;