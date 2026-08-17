import React, { useState, useEffect, useCallback } from 'react';
import { adminAPI } from '../../services/api';
import DetailDrawer from '../../components/admin/DetailDrawer';
import DataTable from '../../components/admin/DataTable';
import LoadingState from '../../components/admin/LoadingState';
import EmptyState from '../../components/admin/EmptyState';
import ErrorState from '../../components/admin/ErrorState';
import RefreshButton from '../../components/admin/RefreshButton';
import Pagination from '../../components/admin/Pagination';
import { shortId, formatTime } from '../../utils/format';

const TodayUsersPanel = ({ onClose, title }) => {
  const [data, setData] = useState({ total: 0, users: [] });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminAPI.getUsers({ page, size: 20, today: 1 });
      setData({ total: res.data.total, users: res.data.users });
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to load today\'s users');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { load(); }, [load]);

  const columns = [
    { key: 'id', label: 'User ID', render: (r) => <span className="font-mono text-xs text-gray-400">{shortId(r.id)}</span> },
    { key: 'name', label: 'Name', render: (r) => <span className="text-white font-medium">{r.name || '—'}</span> },
    { key: 'email', label: 'Email', render: (r) => <span className="text-gray-300">{r.email || '—'}</span> },
    { key: 'phone', label: 'Phone', render: () => <span className="text-gray-500">—</span> },
    { key: 'createdAt', label: 'Registration Time', render: (r) => <span className="text-gray-300">{formatTime(r.createdAt)}</span> },
    {
      key: 'status', label: 'Status', render: (r) =>
        r.isVerified
          ? <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-900/50 text-green-400">Active</span>
          : <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-900/50 text-yellow-400">Pending OTP</span>
    },
    {
      key: 'caseCount', label: '# Cases', render: (r) =>
        <span className={r.caseCount > 0 ? 'text-red-400 font-semibold' : 'text-gray-300'}>{r.caseCount ?? 0}</span>
    },
  ];

  return (
    <DetailDrawer
      title={title || 'Users Today'}
      subtitle="Users registered today"
      onClose={onClose}
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <RefreshButton onClick={load} loading={loading} />
        </div>

        {error ? (
          <ErrorState message={error} onRetry={load} />
        ) : loading ? (
          <LoadingState label="Loading today's users..." />
        ) : data.users.length === 0 ? (
          <EmptyState title="No users today" message="No users have registered today." />
        ) : (
          <>
            <DataTable columns={columns} rows={data.users} rowKey={(r) => r.id} />
            <Pagination total={data.total} page={page} size={20} onPageChange={setPage} />
          </>
        )}
      </div>
    </DetailDrawer>
  );
};

export default TodayUsersPanel;