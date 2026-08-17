import { useState, useEffect, useCallback } from 'react';
import { adminAPI } from '../../services/api';
import DetailDrawer from '../../components/admin/DetailDrawer';
import DataTable from '../../components/admin/DataTable';
import SearchBar from '../../components/admin/SearchBar';
import FilterBar from '../../components/admin/FilterBar';
import Pagination from '../../components/admin/Pagination';
import LoadingState from '../../components/admin/LoadingState';
import EmptyState from '../../components/admin/EmptyState';
import ErrorState from '../../components/admin/ErrorState';
import RefreshButton from '../../components/admin/RefreshButton';
import { formatDate, formatDateTime, shortId } from '../../utils/format';

const UsersPanel = ({ onClose, title }) => {
  const [data, setData] = useState({ total: 0, users: [] });
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(20);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [today, setToday] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminAPI.getUsers({ page, size, search: search || undefined, status: status || undefined, today: today ? 1 : undefined });
      setData({ total: res.data.total, users: res.data.users });
    } catch (e) {
      setError(e?.response?.data?.error || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [page, size, search, status, today]);

  useEffect(() => { load(); }, [load]);

  const columns = [
    { key: 'id', label: 'User ID', render: (r) => <span className="text-gray-400 font-mono text-xs">{shortId(r.id)}</span> },
    { key: 'name', label: 'Name', render: (r) => <span className="text-white font-medium">{r.name || '—'}</span> },
    { key: 'email', label: 'Email', render: (r) => <span className="text-gray-300">{r.email}</span> },
    { key: 'personalEmail', label: 'Phone', render: () => '—' },
    { key: 'createdAt', label: 'Registration Date', render: (r) => formatDate(r.createdAt) },
    {
      key: 'isVerified', label: 'Status', render: (r) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${r.isVerified ? 'bg-green-900/50 text-green-400' : 'bg-yellow-900/50 text-yellow-400'}`}>
          {r.isVerified ? 'Active' : 'Pending OTP'}
        </span>
      ),
    },
    { key: 'caseCount', label: '# Cases', render: (r) => <span className={`font-semibold ${r.caseCount > 0 ? 'text-red-400' : 'text-gray-300'}`}>{r.caseCount ?? 0}</span> },
    { key: 'lastActive', label: 'Last Active', render: (r) => formatDateTime(r.lastActive) },
    { key: 'createdAt', label: 'Account Created', render: (r) => formatDateTime(r.createdAt) },
  ];

  return (
    <DetailDrawer title={title} subtitle={`Total Users: ${data.total}`} onClose={onClose}>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <SearchBar placeholder="Search name, email..." onSearch={setSearch} />
        <FilterBar
          filters={[{ key: 'status', label: 'All Statuses', options: [{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }] }]}
          values={{ status }}
          onChange={(k, v) => { setStatus(v); setPage(1); }}
        />
        <label className="inline-flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
          <input type="checkbox" checked={today} onChange={(e) => { setToday(e.target.checked); setPage(1); }} className="accent-purple-500 w-4 h-4" />
          Today only
        </label>
        <RefreshButton onClick={load} loading={loading} />
      </div>

      {error ? <ErrorState message={error} onRetry={load} /> : loading ? <LoadingState label="Loading users..." /> : data.users.length === 0 ? <EmptyState title="No users found" message="There are no users matching the current filters." /> : (
        <>
          <DataTable columns={columns} rows={data.users} rowKey="id" />
          <Pagination total={data.total} page={page} size={size} onPageChange={setPage} />
        </>
      )}
    </DetailDrawer>
  );
};

export default UsersPanel;