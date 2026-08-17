import { useState, useEffect, useCallback } from 'react';
import { adminAPI } from '../../services/api';
import DetailDrawer from '../../components/admin/DetailDrawer';
import DataTable from '../../components/admin/DataTable';
import SearchBar from '../../components/admin/SearchBar';
import LoadingState from '../../components/admin/LoadingState';
import EmptyState from '../../components/admin/EmptyState';
import ErrorState from '../../components/admin/ErrorState';
import RefreshButton from '../../components/admin/RefreshButton';
import Pagination from '../../components/admin/Pagination';
import ContactActions from '../../components/admin/ContactActions';
import { shortId, formatDate } from '../../utils/format';

const ContactsPanel = ({ onClose, title }) => {
  const [data, setData] = useState({ total: 0, contacts: [] });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ userId: '', name: '', phone: '', email: '', relation: '' });
  const [formBusy, setFormBusy] = useState(false);
  const [formMsg, setFormMsg] = useState('');
  const [formErr, setFormErr] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminAPI.getContacts({ page, size: 20, search: search || undefined });
      setData({ total: res.data.total, contacts: res.data.contacts });
    } catch (e) {
      setError(e?.response?.data?.error || 'Failed to load contacts');
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { load(); }, [load]);

  const loadUsers = useCallback(async () => {
    try {
      const res = await adminAPI.getUsers({ page: 1, size: 100 });
      setUsers(res.data.users || []);
    } catch (_) {
      setUsers([]);
    }
  }, []);

  const openAdd = () => {
    setEditing(null);
    setForm({ userId: '', name: '', phone: '', email: '', relation: '' });
    setFormMsg('');
    setFormErr('');
    setShowForm(true);
    if (users.length === 0) loadUsers();
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm({ userId: row.userId, name: row.name || '', phone: row.phone || '', email: row.email || '', relation: row.relation || '' });
    setFormMsg('');
    setFormErr('');
    setShowForm(true);
  };

  const submitForm = async (e) => {
    e.preventDefault();
    setFormBusy(true);
    setFormMsg('');
    setFormErr('');
    try {
      if (editing) {
        await adminAPI.updateContact(editing.id, {
          name: form.name,
          phone: form.phone,
          email: form.email,
          relation: form.relation,
        });
        setFormMsg('Contact updated');
      } else {
        await adminAPI.createContact(form);
        setFormMsg('Contact added');
        setPage(1);
      }
      setTimeout(() => {
        setShowForm(false);
        setEditing(null);
        load();
      }, 300);
    } catch (e2) {
      setFormErr(e2?.response?.data?.error || 'Failed to save contact');
    } finally {
      setFormBusy(false);
    }
  };

  const columns = [
    { key: 'id', label: 'Contact ID', render: (r) => <span className="font-mono text-xs text-gray-400">{shortId(r.id)}</span> },
    {
      key: 'user', label: 'User', render: (r) =>
        <span className="text-white font-medium">{r.userName || r.userEmail || '—'}</span>
    },
    { key: 'name', label: 'Contact Name', render: (r) => <span className="text-gray-300">{r.name || '—'}</span> },
    { key: 'phone', label: 'Phone', render: (r) => <span className="text-gray-300">{r.phone || '—'}</span> },
    { key: 'relation', label: 'Relationship', render: (r) => <span className="text-gray-300">{r.relation || '—'}</span> },
    { key: 'email', label: 'Email', render: (r) => <span className="text-gray-300">{r.email || '—'}</span> },
    { key: 'createdAt', label: 'Created Date', render: (r) => <span className="text-gray-300">{formatDate(r.createdAt)}</span> },
    {
      key: 'actions', label: 'Actions', render: (r) => (
        <ContactActions row={r} onChanged={load} onEdit={openEdit} />
      ),
    },
  ];

  return (
    <DetailDrawer
      title={title || 'Emergency Contacts'}
      subtitle="All registered emergency contacts"
      onClose={onClose}
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <SearchBar placeholder="Search contacts..." onSearch={setSearch} />
          <RefreshButton onClick={load} loading={loading} />
          <button
            onClick={showForm ? () => setShowForm(false) : openAdd}
            className="text-xs px-3 py-1.5 rounded bg-purple-900/60 hover:bg-purple-800 text-purple-200 font-medium"
          >
            {showForm ? 'Cancel' : '+ Add Contact'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={submitForm} className="p-4 rounded-lg bg-gray-900/70 border border-gray-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {!editing && (
              <div>
                <label className="block text-xs text-gray-400 mb-1">User</label>
                <select
                  required value={form.userId}
                  onChange={(e) => setForm({ ...form, userId: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-purple-500"
                >
                  <option value="">Select user...</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>{u.name || u.email} ({u.email})</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="block text-xs text-gray-400 mb-1">Contact Name</label>
              <input
                required value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Mother"
                className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-purple-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Phone</label>
              <input
                required value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+91 98765 43210"
                className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-purple-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Relation</label>
              <input
                value={form.relation}
                onChange={(e) => setForm({ ...form, relation: e.target.value })}
                placeholder="e.g. Family"
                className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-purple-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Email</label>
              <input
                type="email" value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="optional"
                className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-purple-500"
              />
            </div>
            <div className="flex items-end gap-2">
              <button
                type="submit" disabled={formBusy}
                className="text-xs px-3 py-1.5 rounded bg-green-900/60 hover:bg-green-800 text-green-200 font-medium disabled:opacity-40"
              >
                {formBusy ? 'Saving...' : (editing ? 'Update Contact' : 'Add Contact')}
              </button>
            </div>
            {formMsg && <p className="col-span-full text-xs text-green-400">{formMsg}</p>}
            {formErr && <p className="col-span-full text-xs text-red-400">{formErr}</p>}
          </form>
        )}

        {error ? (
          <ErrorState message={error} onRetry={load} />
        ) : loading ? (
          <LoadingState label="Loading contacts..." />
        ) : data.contacts.length === 0 ? (
          <EmptyState
            icon="📭"
            title="No Contacts Found"
            message="There are currently no emergency contacts registered."
          />
        ) : (
          <>
            <DataTable columns={columns} rows={data.contacts} rowKey={(r) => r.id} />
            <Pagination total={data.total} page={page} size={20} onPageChange={setPage} />
          </>
        )}
      </div>
    </DetailDrawer>
  );
};

export default ContactsPanel;