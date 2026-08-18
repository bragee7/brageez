import { useState, useEffect } from 'react';
import { adminAPI } from '../services/api';

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', personalEmail: '', password: '', role: 'user' });
  const [search, setSearch] = useState('');

  const loadUsers = async () => {
    try {
      const response = await adminAPI.getUsers({ page: 1, size: 100, search: search || undefined });
      setUsers(response.data.users);
      setLoading(false);
    } catch (err) {
      setError('Failed to load users');
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [search]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      const response = await adminAPI.createUser(form);
      setSuccess(`User created: ${response.data.user.email} (${response.data.user.role})`);
      setShowForm(false);
      setForm({ name: '', personalEmail: '', password: '', role: 'user' });
      await loadUsers();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create user');
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    setError('');
    setSuccess('');
    try {
      const response = await adminAPI.deleteUser(confirmDelete.id);
      setSuccess(`Deleted ${confirmDelete.email}: ${response.data.deleted.user} user, ${response.data.deleted.cases} cases, ${response.data.deleted.contacts} contacts, ${response.data.deleted.auditLog} audit entries`);
      setConfirmDelete(null);
      await loadUsers();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete user');
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (ts) => {
    if (!ts) return '—';
    return new Date(ts).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-white">User Management</h1>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors"
          >
            {showForm ? 'Cancel' : '+ Add User'}
          </button>
        </div>

        <div className="relative mb-6 max-w-md">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full px-4 py-2 pl-10 bg-gray-800 text-white border border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
          <svg
            className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        {error && (
          <div className="bg-red-900 border border-red-700 text-red-200 px-6 py-4 rounded-lg mb-6">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-900 border border-green-700 text-green-200 px-6 py-4 rounded-lg mb-6">
            {success}
          </div>
        )}

        {showForm && (
          <div className="bg-gray-800 rounded-xl p-6 mb-6">
            <h3 className="text-xl font-semibold text-white mb-4">Add New User</h3>
            <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Full Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-900 text-white border border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="e.g. Priya Sharma"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Personal Email</label>
                <input
                  type="email"
                  value={form.personalEmail}
                  onChange={(e) => setForm({ ...form, personalEmail: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-900 text-white border border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="e.g. priya@gmail.com"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Password</label>
                <input
                  type="text"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-900 text-white border border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Set a password"
                  required
                  minLength={6}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Role</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-900 text-white border border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="user">User</option>
                  <option value="police">Police</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <button
                  type="submit"
                  className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors"
                >
                  Create User
                </button>
                <p className="text-xs text-gray-500 mt-2">
                  The guardian ID is auto-generated from the name (e.g. priyasharma@guardian.com). User is verified immediately and can log in right away.
                </p>
              </div>
            </form>
          </div>
        )}

        <div className="bg-gray-800 rounded-xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-400 border-b border-gray-700">
                <th className="py-4 px-6">Name</th>
                <th className="py-4 px-6">Guardian Email</th>
                <th className="py-4 px-6">Personal Email</th>
                <th className="py-4 px-6">Role</th>
                <th className="py-4 px-6">Cases</th>
                <th className="py-4 px-6">Registered</th>
                <th className="py-4 px-6">Verified</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                  <td className="py-4 px-6 text-white font-medium">{u.name || '—'}</td>
                  <td className="py-4 px-6 text-gray-300">{u.email}</td>
                  <td className="py-4 px-6 text-gray-300">{u.personalEmail || '—'}</td>
                  <td className="py-4 px-6">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      u.role === 'admin' ? 'bg-purple-900 text-purple-200' :
                      u.role === 'police' ? 'bg-blue-900 text-blue-200' :
                      'bg-gray-700 text-gray-200'
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <span className={u.caseCount > 0 ? 'text-red-400 font-semibold' : 'text-gray-500'}>
                      {u.caseCount}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-gray-400">{formatDate(u.createdAt)}</td>
                  <td className="py-4 px-6">
                    {u.isVerified ? (
                      <span className="text-green-400">✓</span>
                    ) : (
                      <span className="text-yellow-500">Pending OTP</span>
                    )}
                  </td>
                  <td className="py-4 px-6 text-right">
                    {u.role === 'admin' ? (
                      <span className="text-gray-600 text-xs">Protected</span>
                    ) : (
                      <button
                        onClick={() => setConfirmDelete(u)}
                        className="text-red-400 hover:text-red-300 font-medium transition-colors"
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {confirmDelete && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-2xl p-8 w-full max-w-md">
            <h3 className="text-2xl font-bold text-white mb-4">Delete User</h3>
            <p className="text-gray-300 mb-2">
              Delete <span className="font-semibold text-white">{confirmDelete.name || confirmDelete.email}</span>?
            </p>
            <p className="text-gray-400 text-sm mb-6">
              Guardian: <span className="text-white">{confirmDelete.email}</span><br />
              This will permanently remove the user, all their SOS cases, contacts, audit logs and media from the database.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                disabled={deleting}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-4 py-3 rounded-lg font-semibold transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-lg font-semibold transition-colors disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;