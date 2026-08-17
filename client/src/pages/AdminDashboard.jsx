import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminAPI } from '../services/api';

const StatCard = ({ label, value, icon, accent }) => (
  <div className={`bg-gray-800 rounded-xl p-6 border-t-4 ${accent}`}>
    <div className="flex items-center justify-between">
      <div>
        <p className="text-gray-400 text-sm font-medium">{label}</p>
        <p className="text-4xl font-bold text-white mt-2">{value}</p>
      </div>
      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${icon.bg}`}>
        <svg className={`w-6 h-6 ${icon.color}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon.path} />
        </svg>
      </div>
    </div>
  </div>
);

const BarChart = ({ title, series, color }) => {
  const max = Math.max(...series.map((s) => s.count), 1);
  return (
    <div className="bg-gray-800 rounded-xl p-6">
      <h3 className="text-xl font-semibold text-white mb-6">{title}</h3>
      <div className="flex items-end gap-1 h-48">
        {series.map((s) => (
          <div key={s.day} className="flex-1 flex flex-col items-center justify-end h-full min-w-0">
            <div
              className={`${color} rounded-t w-full max-w-8 transition-all`}
              style={{ height: `${Math.max((s.count / max) * 100, 2)}%` }}
              title={`${s.day}: ${s.count}`}
            ></div>
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-1">
        {series.map((s) => (
          <div key={s.day} className="flex-1 text-center text-[10px] text-gray-500 truncate">
            {s.day}
          </div>
        ))}
      </div>
    </div>
  );
};

const formatDay = (day) => {
  const d = new Date(day);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const AdminDashboard = () => {
  const [overview, setOverview] = useState(null);
  const [registrations, setRegistrations] = useState([]);
  const [casesByDay, setCasesByDay] = useState([]);
  const [casesByUser, setCasesByUser] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const [ov, reg, cbd, cbu] = await Promise.all([
          adminAPI.getOverview(),
          adminAPI.getRegistrations(30),
          adminAPI.getCasesByDay(30),
          adminAPI.getCasesByUser()
        ]);
        setOverview(ov.data);
        setRegistrations(reg.data.series.map((s) => ({ ...s, day: formatDay(s.day) })));
        setCasesByDay(cbd.data.series.map((s) => ({ ...s, day: formatDay(s.day) })));
        setCasesByUser(cbu.data.users);
        setLoading(false);
      } catch (err) {
        setError('Failed to load dashboard data');
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-purple-500"></div>
      </div>
    );
  }

  const topUsers = casesByUser.slice(0, 10);
  const maxCases = Math.max(...topUsers.map((u) => u.case_count), 1);

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-6">Admin Dashboard</h1>

        {error && (
          <div className="bg-red-900 border border-red-700 text-red-200 px-6 py-4 rounded-lg mb-6">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
          <StatCard
            label="Total Users"
            value={overview.totalUsers}
            accent="border-purple-500"
            icon={{ bg: 'bg-purple-900/50', color: 'text-purple-400', path: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' }}
          />
          <StatCard
            label="Total Cases"
            value={overview.totalCases}
            accent="border-red-500"
            icon={{ bg: 'bg-red-900/50', color: 'text-red-400', path: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' }}
          />
          <StatCard
            label="Pending"
            value={overview.pendingCases}
            accent="border-yellow-500"
            icon={{ bg: 'bg-yellow-900/50', color: 'text-yellow-400', path: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' }}
          />
          <StatCard
            label="Resolved"
            value={overview.resolvedCases}
            accent="border-green-500"
            icon={{ bg: 'bg-green-900/50', color: 'text-green-400', path: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' }}
          />
          <StatCard
            label="Cases Today"
            value={overview.casesToday}
            accent="border-pink-500"
            icon={{ bg: 'bg-pink-900/50', color: 'text-pink-400', path: 'M13 10V3L4 14h7v7l9-11h-7z' }}
          />
          <StatCard
            label="Users Today"
            value={overview.usersToday}
            accent="border-blue-500"
            icon={{ bg: 'bg-blue-900/50', color: 'text-blue-400', path: 'M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z' }}
          />
          <StatCard
            label="Contacts"
            value={overview.totalContacts}
            accent="border-teal-500"
            icon={{ bg: 'bg-teal-900/50', color: 'text-teal-400', path: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' }}
          />
          <StatCard
            label="Audit Entries"
            value={overview.auditCount}
            accent="border-indigo-500"
            icon={{ bg: 'bg-indigo-900/50', color: 'text-indigo-400', path: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' }}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <BarChart title="New User Registrations (30 days)" series={registrations} color="bg-purple-500" />
          <BarChart title="Cases Created Per Day (30 days)" series={casesByDay} color="bg-red-500" />
        </div>

        <div className="bg-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-white">Cases Created Per User</h3>
            <Link to="/admin/users" className="text-purple-400 hover:text-purple-300 text-sm font-medium">
              Manage Users →
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400 border-b border-gray-700">
                  <th className="py-3 pr-4">User</th>
                  <th className="py-3 pr-4">Guardian Email</th>
                  <th className="py-3">Cases</th>
                </tr>
              </thead>
              <tbody>
                {topUsers.map((u) => (
                  <tr key={u.user_id} className="border-b border-gray-700/50">
                    <td className="py-3 pr-4 text-white font-medium">{u.name || '—'}</td>
                    <td className="py-3 pr-4 text-gray-300">{u.email}</td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-gray-700 rounded-full h-2">
                          <div
                            className="bg-purple-500 h-2 rounded-full"
                            style={{ width: `${(u.case_count / maxCases) * 100}%` }}
                          ></div>
                        </div>
                        <span className="text-white font-semibold">{u.case_count}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;