import React, { useState, useEffect, useCallback } from 'react';
import { adminAPI } from '../../services/api';
import DetailDrawer from '../../components/admin/DetailDrawer';
import DataTable from '../../components/admin/DataTable';
import SearchBar from '../../components/admin/SearchBar';
import FilterBar from '../../components/admin/FilterBar';
import LoadingState from '../../components/admin/LoadingState';
import EmptyState from '../../components/admin/EmptyState';
import ErrorState from '../../components/admin/ErrorState';
import RefreshButton from '../../components/admin/RefreshButton';
import Pagination from '../../components/admin/Pagination';
import { shortId, formatDateTime, truncate } from '../../utils/format';

const ACTION_COLORS = [
  { test: /SOS/, cls: 'bg-red-900/50 text-red-400' },
  { test: /USER/, cls: 'bg-purple-900/50 text-purple-400' },
  { test: /EMAIL/, cls: 'bg-blue-900/50 text-blue-400' },
  { test: /CASE/, cls: 'bg-yellow-900/50 text-yellow-400' },
  { test: /LOGIN/, cls: 'bg-green-900/50 text-green-400' },
];

const actionColor = (action) => {
  const match = ACTION_COLORS.find((c) => c.test.test(action || ''));
  return match ? match.cls : 'bg-gray-700 text-gray-300';
};

const AuditEntriesPanel = ({ onClose, title }) => {
  const [data, setData] = useState({ total: 0, entries: [] });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [action, setAction] = useState('');
  const [actor, setActor] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminAPI.getAuditLog({
        page, size: 20,
        search: search || undefined,
        action: action || undefined,
        actor: actor || undefined,
      });
      setData({ total: res.data.total, entries: res.data.entries });
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to load audit log');
    } finally {
      setLoading(false);
    }
  }, [page, search, action, actor]);

  useEffect(() => { load(); }, [load]);

  const columns = [
    { key: 'id', label: 'Audit ID', render: (r) => <span className="font-mono text-xs text-gray-400">{shortId(r.id)}</span> },
    {
      key: 'user', label: 'User / Admin', render: (r) =>
        <span className="text-gray-300">{r.userEmail || r.userName || 'System'}</span>
    },
    {
      key: 'action', label: 'Action', render: (r) =>
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${actionColor(r.action)}`}>{r.action || '—'}</span>
    },
    { key: 'entity', label: 'Entity', render: (r) => <span className="text-gray-300">Audit Log</span> },
    { key: 'caseId', label: 'Entity ID', render: (r) => <span className="font-mono text-xs text-gray-400">{shortId(r.caseId || r.id)}</span> },
    { key: 'createdAt', label: 'Timestamp', render: (r) => <span className="text-gray-300">{formatDateTime(r.createdAt)}</span> },
    { key: 'ip', label: 'IP', render: () => <span className="text-gray-500">—</span> },
    { key: 'details', label: 'Description', render: (r) => <span className="text-gray-300">{truncate(r.details, 80)}</span> },
    { key: 'result', label: 'Result / Status', render: () => <span className="text-gray-500">—</span> },
  ];

  const filters = [
    {
      key: 'action', label: 'Action',
      options: [
        { value: 'SOS', label: 'SOS' },
        { value: 'USER', label: 'User' },
        { value: 'EMAIL', label: 'Email' },
        { value: 'CASE', label: 'Case' },
        { value: 'LOGIN', label: 'Login' },
      ],
    },
    {
      key: 'actor', label: 'Actor',
      options: [
        { value: 'admin', label: 'Admin' },
        { value: 'user', label: 'User' },
      ],
    },
  ];

  const handleChange = (key, value) => {
    if (key === 'action') { setAction(value); } else { setActor(value); }
    setPage(1);
  };

  return (
    <DetailDrawer
      title={title || 'Audit Logs'}
      subtitle="Full activity audit trail"
      onClose={onClose}
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <SearchBar placeholder="Search audit log..." onSearch={setSearch} />
          <FilterBar filters={filters} values={{ action, actor }} onChange={handleChange} />
          <RefreshButton onClick={load} loading={loading} />
        </div>

        {error ? (
          <ErrorState message={error} onRetry={load} />
        ) : loading ? (
          <LoadingState label="Loading audit entries..." />
        ) : data.entries.length === 0 ? (
          <EmptyState title="No audit entries" message="No audit log entries match your filters." />
        ) : (
          <>
            <DataTable columns={columns} rows={data.entries} rowKey={(r) => r.id} />
            <Pagination total={data.total} page={page} size={20} onPageChange={setPage} />
          </>
        )}
      </div>
    </DetailDrawer>
  );
};

export default AuditEntriesPanel;