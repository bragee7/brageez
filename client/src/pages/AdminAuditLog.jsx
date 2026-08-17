import { useState, useEffect } from 'react';
import { adminAPI } from '../services/api';

const AdminAuditLog = () => {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const response = await adminAPI.getAuditLog(300);
        setEntries(response.data.entries);
        setLoading(false);
      } catch (err) {
        setError('Failed to load audit log');
        setLoading(false);
      }
    };
    load();
  }, []);

  const formatDate = (ts) => {
    if (!ts) return '—';
    return new Date(ts).toLocaleString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  };

  const actionColor = (action) => {
    if (action.includes('SOS')) return 'bg-red-900 text-red-200';
    if (action.includes('USER')) return 'bg-purple-900 text-purple-200';
    if (action.includes('EMAIL')) return 'bg-blue-900 text-blue-200';
    if (action.includes('CASE')) return 'bg-yellow-900 text-yellow-200';
    if (action.includes('LOGIN')) return 'bg-green-900 text-green-200';
    return 'bg-gray-700 text-gray-200';
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
        <h1 className="text-3xl font-bold text-white mb-6">Audit Log</h1>

        {error && (
          <div className="bg-red-900 border border-red-700 text-red-200 px-6 py-4 rounded-lg mb-6">
            {error}
          </div>
        )}

        <div className="bg-gray-800 rounded-xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-400 border-b border-gray-700">
                <th className="py-4 px-6">Time</th>
                <th className="py-4 px-6">User</th>
                <th className="py-4 px-6">Action</th>
                <th className="py-4 px-6">Details</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} className="border-b border-gray-700/50 hover:bg-gray-700/30 align-top">
                  <td className="py-4 px-6 text-gray-400 whitespace-nowrap">{formatDate(e.createdAt)}</td>
                  <td className="py-4 px-6 text-gray-300">
                    {e.userEmail || (e.userId ? <span className="text-gray-500">{e.userId}</span> : 'System')}
                  </td>
                  <td className="py-4 px-6">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${actionColor(e.action)}`}>
                      {e.action}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-gray-300 break-all">{e.details || '—'}</td>
                </tr>
              ))}
              {entries.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-10 text-center text-gray-500">No audit entries found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminAuditLog;