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
import UserActions from '../../components/admin/UserActions';
import { formatDate, formatDateTime, shortId } from '../../utils/format';

const USERS_ROLES = ['user', 'police'];

const UsersPanel = ({ onClose, title }) => {
  const [data, setData] = useState({ total: 0, users: [] });
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(100);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [today, setToday] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', personalEmail: '', password: '', role: 'user' });
  const [formBusy, setFormBusy] = useState(false);
  const [formMsg, setFormMsg] = useState('');
  const [formErr, setFormErr] = useState('');

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

  const submitForm = async (e) => {
    e.preventDefault();
    setFormBusy(true);
    setFormMsg('');
    setFormErr('');
    try {
      const res = await adminAPI.createUser(form);
      setFormMsg(res?.data?.message || 'User created');
      setForm({ name: '', personalEmail: '', password: '', role: 'user' });
      setShowForm(false);
      setPage(1);
      setTimeout(load, 300);
    } catch (e2) {
      setFormErr(e2?.response?.data?.error || 'Failed to create user');
    } finally {
      setFormBusy(false);
    }
  };

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
    {
      key: 'actions', label: 'Actions', render: (r) => <UserActions row={r} onChanged={load} />,
    },
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
        <button
          onClick={() => { setShowForm(!showForm); setFormMsg(''); setFormErr(''); }}
          className="text-xs px-3 py-1.5 rounded bg-purple-900/60 hover:bg-purple-800 text-purple-200 font-medium"
        >
          {showForm ? 'Cancel' : '+ Add User'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={submitForm} className="mb-4 p-4 rounded-lg bg-gray-900/70 border border-gray-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Full Name</label>
            <input
              required value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Anjali Sharma"
              className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-purple-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Personal Email</label>
            <input
              required type="email" value={form.personalEmail}
              onChange={(e) => setForm({ ...form, personalEmail: e.target.value })}
              placeholder="user@gmail.com"
              className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-purple-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Temporary Password</label>
            <input
              required minLength={6} value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Min 6 characters"
              className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-purple-500"
            />
          </div>
          <div className="flex items-end gap-2">
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-purple-500"
            >
              {USERS_ROLES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
            <button
              type="submit" disabled={formBusy}
              className="text-xs px-3 py-1.5 rounded bg-green-900/60 hover:bg-green-800 text-green-200 font-medium disabled:opacity-40"
            >
              {formBusy ? 'Creating...' : 'Create User'}
            </button>
          </div>
          {formMsg && <p className="col-span-full text-xs text-green-400">{formMsg}</p>}
          {formErr && <p className="col-span-full text-xs text-red-400">{formErr}</p>}
        </form>
      )}

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